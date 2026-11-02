"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildMusicPayload, buildPersonalPayload, BLANK } = require("../src/payload");
const icons = require("../src/icons");

const stats = { playcount: 12345, loved: 10, friends: 3, tracks: 900, albums: 400, artists: 250 };
const track = { name: "Song", artist: "Artist", album: "Album", cover: "", isNowPlaying: true };

const byName = (payload) => Object.fromEntries(payload.data.dynamic.map((d) => [d.name, d.value]));

test("music payload has unique field names and fills all six stat slots", () => {
  const payload = buildMusicPayload({ username: "me", track, stats });
  const names = payload.data.dynamic.map((d) => d.name);
  assert.equal(new Set(names).size, names.length);
  for (let n = 1; n <= 6; n += 1) {
    assert.ok(names.includes(`stat${n}`) && names.includes(`label${n}`) && names.includes(`icon${n}`));
  }
  const f = byName(payload);
  assert.equal(f.stat1, "12.3K");
  assert.equal(f.label3, "Friends");
  assert.equal(f.stat3, "3");
  assert.equal(f.subtitle_3, "[@me](https://www.last.fm/user/me)");
});

test("music payload falls back to the turntable icon when there is no cover", () => {
  const f = byName(buildMusicPayload({ username: "me", track, stats }));
  assert.equal(f.header.url, icons.TURNTABLE);
  assert.equal(f.image_preview.url, icons.TURNTABLE);
});

test("activity text reflects playing vs paused", () => {
  const playing = byName(buildMusicPayload({ username: "me", track, stats }));
  const paused = byName(buildMusicPayload({ username: "me", track: { ...track, isNowPlaying: false }, stats }));
  assert.match(playing.text_activty, /^🎧 Artist — Song$/);
  assert.match(paused.text_activty, /^⏸ Artist — Song$/);
});

test("personal payload uses profile values and blanks the rest", () => {
  const profile = { username: "u", title: "T", subtitle: "S", labels: { 3: "@a", 6: "@b" }, miniText: "M", activity: "Act" };
  const payload = buildPersonalPayload(profile);
  const f = byName(payload);
  assert.equal(payload.username, "u");
  assert.equal(f.text_title, "T");
  assert.equal(f.label3, "@a");
  assert.equal(f.label6, "@b");
  assert.equal(f.label1, BLANK);
  assert.equal(f.stat_mini, "M");
  assert.equal(f.text_activty, "Act");
});

test("no text field is ever an empty string", () => {
  const payload = buildPersonalPayload({ username: "u", labels: {} });
  for (const d of payload.data.dynamic) {
    if (d.type === 1) assert.notEqual(d.value, "");
  }
});
