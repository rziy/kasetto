"use strict";

require("dotenv").config({ quiet: true });

const { loadConfig } = require("./src/config");
const logger = require("./src/logger");

let config;
try {
  config = loadConfig();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const { createLastfmClient } = require("./src/lastfm");
const { createDiscordClient } = require("./src/discord");
const { createRunner } = require("./src/runner");

const lastfm = createLastfmClient({
  user: config.lastfmUser,
  apiKey: config.lastfmApiKey,
  statsTtlMs: config.statsTtlMs,
});
const discord = createDiscordClient({
  appId: config.discordAppId,
  userId: config.discordUserId,
  botToken: config.discordBotToken,
});
const { createProfileStore } = require("./src/profile");
const profiles = createProfileStore({ file: config.profileFile, fallbackUsername: config.lastfmUser, logger });
config.getProfile = profiles.get;

let dashboard = null;
if (config.dashboardPassword) {
  const { createDashboard } = require("./src/dashboard");
  dashboard = createDashboard({
    password: config.dashboardPassword,
    host: config.dashboardHost,
    port: config.dashboardPort,
    store: profiles,
    trustProxy: config.dashboardTrustProxy,
    logger,
  });
  dashboard.start();
}

const runner = createRunner({ config, lastfm, discord, logger });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    runner.stop();
    if (dashboard) dashboard.stop();
    process.exit(0);
  });
}

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason instanceof Error ? reason.message : reason);
});

logger.info(`Turntable started (every ${config.intervalMs / 1000}s${config.forceMode ? `, forced ${config.forceMode} mode` : ""})`);
runner.start();
