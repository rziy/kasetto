"use strict";

const { buildMusicPayload, buildPersonalPayload } = require("./payload");
const { describeError } = require("./errors");
const defaultIcons = require("./icons");

const HEARTBEAT_MS = 10 * 60 * 1000; // re-send an unchanged profile at least this often
const MAX_BACKOFF_MS = 5 * 60 * 1000;

function createRunner({ config, lastfm, discord, logger, now = Date.now }) {
  let timer = null;
  let stopped = true;
  let failures = 0;
  let lastBody = null;
  let lastSentAt = 0;

  /** One update cycle. Returns how many ms to wait before the next one. */
  async function tick() {
    try {
      const forced = config.forceMode;
      const track = forced === "personal" ? null : await lastfm.getNowPlaying();
      const mode = forced || (track.isNowPlaying ? "music" : "personal");

      const profile = config.getProfile ? config.getProfile() : config.profile;
      const payload =
        mode === "music"
          ? buildMusicPayload({
              username: config.lastfmUser,
              track,
              stats: await lastfm.getStats(),
              icons: { ...defaultIcons, ...(profile.icons || {}) },
            })
          : buildPersonalPayload(profile);

      const body = JSON.stringify(payload);
      if (body !== lastBody || now() - lastSentAt >= HEARTBEAT_MS) {
        await discord.updateProfile(payload);
        lastBody = body;
        lastSentAt = now();
        logger.info(mode === "music" ? `Updated (music): ${track.artist} - ${track.name}` : "Updated (personal)");
      }

      failures = 0;
      return config.intervalMs;
    } catch (err) {
      failures += 1;
      const backoff = Math.min(config.intervalMs * 2 ** failures, MAX_BACKOFF_MS);
      const delay = Math.max(backoff, err.retryAfterMs || 0);
      logger.error(`${describeError(err)} - retrying in ${Math.round(delay / 1000)}s`);
      return delay;
    }
  }

  async function loop() {
    const delay = await tick();
    if (!stopped) timer = setTimeout(loop, delay);
  }

  function start() {
    stopped = false;
    return loop();
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  return { start, stop, tick };
}

module.exports = { createRunner, HEARTBEAT_MS };
