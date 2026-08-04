# Vibe

TikTok-style social app for **Windows desktop** and the browser — For You / Following / Friends feeds, Create, Explore, LIVE rooms, DMs, Shop (demo coins), profiles, and an Owner panel.

Multi-user data lives in a local **Express API** (JSON DB + media files). The Windows EXE starts that server for you.

## Download (Windows)

Grab the latest **Vibe Setup** installer from [Releases](https://github.com/forevershy/vibe-social/releases).

Demo logins after install:

| Username | Password |
|----------|----------|
| `shy` | `owner123` (owner) |
| `maya.moves` | `demo123` |
| `jordan.eats` | `demo123` |

## Run from source

**Requirements:** Node.js 20+

```bash
git clone https://github.com/forevershy/vibe-social.git
cd vibe-social
npm install
npm run dev:full
```

- Web UI: http://localhost:5173  
- API + LIVE WebSocket: http://localhost:8787  

Or API only (serves built UI after `npm run build`):

```bash
npm run build
npm run server
```

Open http://localhost:8787

### Desktop (dev)

```bash
npm run electron:dev
```

### Build Windows EXE

```bash
npm run dist:win
```

Outputs under `dist-electron/`:

- `Vibe-Setup-1.0.0.exe` — NSIS installer  
- `Vibe-Portable-1.0.0.exe` — portable  

## Features

- Vertical video feeds (For You, Following, Friends)
- Upload photos/videos with privacy (Everyone / Friends / Only you)
- Likes, comments, saves, shares, reposts
- Search / Explore
- Profiles, follow lists, badges (including toggleable owner crown)
- LIVE: Go Live (webcam) + watch rooms with chat & tips
- Messages & activity
- Shop demo coins (no real payments)
- Owner panel for badges & display counts

## Architecture

```
React (Vite)  →  Express API (:8787)  →  server/data/vibe.json + media/
Electron EXE  →  starts API, opens window to localhost
```

## Notes

- Shop coins are **demo only** — no real money.
- LIVE uses your webcam locally; it is not TikTok-scale RTMP streaming.
- Self-host: run `npm run server` on a machine and point clients at that host (set `VITE_API_URL` when building the web client).

## License

MIT
