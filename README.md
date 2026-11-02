# Kasetto The Music Tracker

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Last.fm](https://img.shields.io/badge/Last.fm-API-D51007?logo=lastdotfm)
![Discord](https://img.shields.io/badge/Discord-Social%20SDK-5865F2?logo=discord)

A customizable Discord Social SDK widget powered by Last.fm.

## Features

- 🎵 Live Last.fm scrobbling
- 🖼️ Album artwork with fallback
- 👤 Personal profile mode (shown automatically when nothing is playing)
- 🎧 Music mode (shown while a track is playing)
- 📊 Listening statistics: scrobbles, loved tracks, friends, tracks, albums, artists
- 🔄 Auto updates, sending only when something changed

## Installation

```bash
git clone https://github.com/rziy/kasetto.git
cd kasetto
npm install
```

Copy `.env.example` to `.env` and fill it in:

```env
LASTFM_USER=
LASTFM_API_KEY=
DISCORD_APP_ID=
DISCORD_USER_ID=
DISCORD_BOT_TOKEN=
```

Run:

```bash
npm start
```

Development (auto restart, needs dev dependencies):

```bash
npm run dev
```

## Configuration

Optional environment variables:

| Variable          | Default | Description                                              |
| ----------------- | ------- | -------------------------------------------------------- |
| `FORCE_MODE`      | auto    | `music` or `personal` to lock one mode                   |
| `UPDATE_INTERVAL` | `30`    | Seconds between checks (minimum 10)                      |
| `STATS_TTL`       | `300`   | Seconds to cache Last.fm totals (minimum 30)             |

Your personal profile lives in `profile.json`:

```json
{
  "username": "name shown in personal mode",
  "title": "main title",
  "subtitle": "line under the title",
  "labels": { "3": "@handle", "6": "@other" },
  "miniText": "text next to the mini avatar",
  "activity": "Personal Profile"
}
```

`labels` keys `1` to `6` map to the six stat slots. Icons and images are listed in `src/icons.js`.

## Modes

### Music

![Music Mode](assets/music_mode.png)

Displays your currently playing track.

### Personal

![Personal Mode](assets/personal_mode.png)

Displays your custom profile.

## Editing your profile

Copy `profile.example.json` to `profile.json` first (it is optional: without it the defaults are used, and saving from the settings page creates it). `profile.json` is git-ignored, so your own edits never end up in commits.

`profile.json` is re-read automatically, so edits apply within one update cycle (no restart). A typo in the file is ignored and the last good version stays active; the log tells you what is wrong.

`profile.json` also accepts an `icons` object to replace any image from `src/icons.js` (keys: `TURNTABLE`, `SCROBBLE`, `HEART`, `FRIENDS`, `TRACK`, `ALBUM`, `ARTIST`, `MUSIC`, `HEADER`, `GIF_HEADER`). Values must be public `https://` links.

### Web settings page (optional)

Set `DASHBOARD_PASSWORD` (8+ characters) in `.env` to turn on a settings page with a form for all of the above.

- Locally it listens on `http://127.0.0.1:3000` only. On a panel that provides `SERVER_PORT` or `PORT` it uses that port on `0.0.0.0`.
- Any user name works; the password is the only credential. After 10 wrong passwords an IP is blocked for 15 minutes.
- The page is plain HTTP unless you put HTTPS in front of it, so use a long password you don't use anywhere else.
- Behind a reverse proxy every visitor shares the proxy's address, so one person's wrong passwords would lock everyone out. Set `DASHBOARD_TRUST_PROXY=1` there to count attempts per real visitor (only when a proxy really sits in front, otherwise the header can be faked). The first request is logged with the addresses the app sees.
- It never shows or edits `.env`.

## Hosting on a free panel

- Upload everything except `.env`, `.git` and `node_modules`. Your own `profile.json` can be uploaded or created from the settings page.
- Set the start command to `npm start` (or `node index.js`) and run `npm install` once.
- Add the variables from `.env.example` either in the panel's environment settings or in a `.env` file created on the server.
- No web port is needed. The app only makes outgoing requests, and memory use is small.
- Errors back off automatically (up to 5 minutes) and Discord rate limits are respected.

## License

MIT. See `LICENSE`.

Copyright (c) 2026 rziy.
