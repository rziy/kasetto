"use strict";

const fs = require("fs");

const DEFAULTS = { username: "", title: "", subtitle: "", labels: {}, miniText: "", activity: "Personal Profile", icons: {} };
const ICON_KEYS = ["TURNTABLE", "SCROBBLE", "HEART", "FRIENDS", "TRACK", "ALBUM", "ARTIST", "MUSIC", "HEADER", "GIF_HEADER"];

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Cleans untrusted input into a safe profile. Throws a readable Error on bad icon links. */
function sanitize(input) {
  const src = input && typeof input === "object" ? input : {};
  const labels = {};
  for (let n = 1; n <= 6; n += 1) {
    const v = str(src.labels && src.labels[n], 64);
    if (v) labels[n] = v;
  }
  const icons = {};
  for (const key of ICON_KEYS) {
    const v = str(src.icons && src.icons[key], 500);
    if (!v) continue;
    if (!/^https:\/\/\S+$/.test(v)) throw new Error(`${key} must be a public https:// link`);
    icons[key] = v;
  }
  return {
    username: str(src.username, 64),
    title: str(src.title, 64),
    subtitle: str(src.subtitle, 128),
    labels,
    miniText: str(src.miniText, 64),
    activity: str(src.activity, 128) || DEFAULTS.activity,
    icons,
  };
}

/**
 * Keeps profile.json in memory and re-reads it whenever the file changes.
 * A broken edit never takes the app down: the last good profile stays active.
 */
function createProfileStore({ file, fallbackUsername, logger }) {
  let current = { ...DEFAULTS };
  let seenMtime = 0;
  let wasBroken = false;

  function refresh() {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      return; // no file: keep defaults
    }
    if (stat.mtimeMs === seenMtime) return;
    seenMtime = stat.mtimeMs;
    try {
      current = sanitize(JSON.parse(fs.readFileSync(file, "utf8")));
      if (wasBroken) logger.info("profile.json is valid again, loaded");
      wasBroken = false;
    } catch (err) {
      wasBroken = true;
      logger.warn(`profile.json ignored, keeping the last good version: ${err.message}`);
    }
  }

  function get() {
    refresh();
    return { ...current, username: current.username || fallbackUsername };
  }

  function save(input) {
    const clean = sanitize(input);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(clean, null, 2)}\n`);
    fs.renameSync(tmp, file);
    refresh();
    return clean;
  }

  return { get, save };
}

module.exports = { createProfileStore, sanitize, ICON_KEYS };
