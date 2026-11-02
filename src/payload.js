"use strict";

const defaultIcons = require("./icons");
const { formatNumber } = require("./format");

const TEXT = 1;
const IMAGE = 3;

// Discord rejects empty strings; an invisible character keeps a slot blank.
const BLANK = "\u200E ";

const text = (name, value) => ({ type: TEXT, name, value });
const image = (name, url) => ({ type: IMAGE, name, value: { url } });

function buildMusicPayload({ username, track, stats, icons = defaultIcons }) {
  const cover = track.cover || icons.TURNTABLE;

  const slots = [
  ["Scrobbles", stats.playcount, icons.SCROBBLE],
  ["Loved Tracks", stats.loved, icons.HEART],
  ["Friends", stats.friends, icons.FRIENDS],
  ["Tracks", stats.tracks, icons.TRACK],
  ["Albums", stats.albums, icons.ALBUM],
  ["Artists", stats.artists, icons.ARTIST],
];

 const dynamic = [
  image("header", cover),
  text("text_title", track.name),
  text("subtitle_1", track.artist),
  text("subtitle_2", track.album),
  text("subtitle_3", `[@${username}](https://www.last.fm/user/${username})`),
];

  slots.forEach(([label, value, icon], i) => {
    const n = i + 1;
    dynamic.push(text(`stat${n}`, formatNumber(value)), text(`label${n}`, label), image(`icon${n}`, icon));
  });

  dynamic.push(
    image("image_preview", cover),
    text("stat_mini", formatNumber(stats.playcount)),
    image("icon_mini", icons.SCROBBLE),
    image("image_mini", icons.HEADER),
    // "text_activty" (sic) is the field name used by the widget template.
    text("text_activty", `${track.isNowPlaying ? "🎧" : "⏸"} ${track.artist} — ${track.name}`),
    image("icon_activity", icons.MUSIC),
  );

  return { username, data: { dynamic } };
}

function buildPersonalPayload(profile) {
  const icons = { ...defaultIcons, ...(profile.icons || {}) };
  const labels = profile.labels || {};

  const dynamic = [
    image("header", icons.GIF_HEADER),
    text("text_title", profile.title || BLANK),
    text("subtitle_1", profile.subtitle || BLANK),
    text("subtitle_2", BLANK),
    text("subtitle_3", BLANK),
  ];

  for (let n = 1; n <= 6; n += 1) {
    dynamic.push(text(`stat${n}`, BLANK), text(`label${n}`, labels[n] || BLANK));
  }

  dynamic.push(
    image("image_preview", icons.HEADER),
    text("stat_mini", profile.miniText || BLANK),
    image("image_mini", icons.HEADER),
    text("text_activty", profile.activity || BLANK),
    image("icon_activity", icons.MUSIC),
  );

  return { username: profile.username, data: { dynamic } };
}

module.exports = { buildMusicPayload, buildPersonalPayload, BLANK };