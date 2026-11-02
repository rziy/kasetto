"use strict";

const axios = require("axios");
const { version } = require("../package.json");

function createDiscordClient({ appId, userId, botToken }) {
  const http = axios.create({
    baseURL: "https://discord.com/api/v9",
    timeout: 10000,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      "User-Agent": `DiscordBot (https://github.com/rziy/kasetto, ${version})`,
    },
  });

  const endpoint = `/applications/${appId}/users/${userId}/identities/0/profile`;

  async function updateProfile(payload) {
    try {
      const res = await http.patch(endpoint, payload);
      return res.status;
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        const retry = Number(err.response.data?.retry_after ?? err.response.headers?.["retry-after"]);
        err.retryAfterMs = Math.ceil((Number.isFinite(retry) ? retry : 5) * 1000) + 500;
        err.hint = "rate limited by Discord";
      } else if (status === 401) {
        err.hint = "bot token rejected, check DISCORD_BOT_TOKEN";
      } else if (status === 404) {
        err.hint = "check DISCORD_APP_ID and DISCORD_USER_ID";
      }
      throw err;
    }
  }

  return { updateProfile };
}

module.exports = { createDiscordClient };
