# WalkieTalk 📻

A mobile **push-to-talk walkie-talkie app** with a retro Motorola-radio aesthetic. Real-time voice over WebRTC, a Socket.io signaling server, Supabase auth + logging, and a neon-green LCD UI built with React Native + Expo.

> Full-stack project — Expo app, Node.js signaling server, and Supabase schema all live in this repo under [`walkietalk/`](./walkietalk).

---

## ✨ Features

- **Push-to-talk voice** over `react-native-webrtc` (peer mesh per channel, STUN via Google).
- **Retro radio UI** — 7-segment channel readout, animated signal bars, battery pips, speaker grille, rotary dial, LED fonts.
- **25 channels** (named + private with passcode gate), live occupancy counts.
- **Quick actions** — `10-4`, `ROGER`, `STANDBY` transmit a beep + log entry.
- **Transmission log** — per-session rolling log on the radio, full history from Supabase on the Log tab.
- **Auth** — email/password + unique callsign (3–10 chars, `A–Z 0–9 -`), Supabase session persistence.
- **Sound effects** — click, end tone, static burst, tuning sweep (preloaded, fully crash-safe).
- **Resilient** — mic-denied handling, "NO SIGNAL" overlay + 5s auto-reconnect, WebRTC failure fallbacks, connection status always visible.
- Haptics, pulse animations, 300ms double-press lock on the PTT button.

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| App | React Native + **Expo SDK 51**, **Expo Router** |
| Realtime audio | **react-native-webrtc** |
| Signaling | **Node.js + Socket.io** (`walkietalk/server`) |
| Auth + DB | **Supabase** |
| State | **Zustand** + React Context (no Redux) |
| Styling | `StyleSheet` API + React Native Skia effects |
| Audio | `expo-av` (session + SFX) |

All components are **function components** (no class components anywhere). Only the **microphone** permission is requested. No video, ever.

---

## 📁 Project structure

```
walkietalk/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root: auth guard + sound preload
│   ├── index.tsx               # Redirect entry
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/
│       ├── _layout.tsx         # ChannelProvider (shared socket/session)
│       ├── index.tsx           # Channel list (1–25)
│       ├── radio.tsx           # Main PTT screen
│       └── log.tsx             # Transmission log
├── components/
│   ├── PTTButton.tsx
│   ├── ChannelDisplay.tsx
│   ├── SignalBars.tsx
│   ├── SpeakerGrille.tsx
│   ├── TransmissionLog.tsx
│   └── RadioDial.tsx
├── hooks/
│   ├── useWebRTC.ts            # peer mesh, mic control, offer/answer/ICE
│   ├── usePTT.ts               # PTT lifecycle, haptics, logging, lock
│   ├── useChannel.ts           # socket lifecycle, status, occupancy
│   ├── useAuth.ts              # Zustand auth store
│   ├── useLocalLog.ts          # in-memory session log
│   └── ChannelContext.tsx      # shares one channel session across screens
├── lib/
│   ├── supabase.ts
│   ├── socket.ts
│   └── sounds.ts               # SoundManager singleton (crash-safe)
├── constants/
│   ├── theme.ts                # retro palette + fonts
│   └── channels.ts             # channel definitions 1–25
├── assets/
│   ├── icon.png / splash.png / …
│   └── sounds/                 # click / tone / static / tuning (.wav)
├── supabase/
│   └── schema.sql              # tables, seed data, RLS policies
└── server/                     # Socket.io signaling server (Railway-ready)
    ├── index.js
    ├── channels.js
    ├── package.json
    └── railway.json
```

---

## 🚀 Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- Expo Go on your phone, or an Android/iOS simulator
- Because `react-native-webrtc` is a native module, run the app with a
  **development build** (`npx expo run:ios` / `run:android` or EAS) — it does
  **not** run in the standard Expo Go client.

### 1. Supabase

1. Create a project at supabase.com.
2. Open **SQL Editor → New query**, paste the contents of
   [`walkietalk/supabase/schema.sql`](./walkietalk/supabase/schema.sql), and run it.
   This creates `profiles`, `channels`, `transmission_logs`, seeds channels 1–3,
   and enables Row Level Security policies.
3. Grab your **Project URL** and **anon public key** from
   **Project Settings → API**.

### 2. Signaling server

```bash
cd walkietalk/server
npm install
cp .env.example .env      # optional; defaults are fine for local dev
npm start                 # listens on 0.0.0.0:3000, GET /health for a check
```

### 3. The app

```bash
cd walkietalk
npm install
cp .env.example .env      # then fill in the values below
```

Edit `walkietalk/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
EXPO_PUBLIC_SIGNALING_SERVER_URL=http://YOUR-LAN-IP:3000
```

> On a physical device, use your computer's **LAN IP** (e.g. `http://192.168.1.20:3000`),
> not `localhost` — the phone can't reach your machine's localhost.

Then run a dev build:

```bash
npx expo run:android      # or: npx expo run:ios
# after the native build installs once, you can iterate with:
npx expo start --dev-client
```

---

## 🔑 Environment variables

### App (`walkietalk/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `EXPO_PUBLIC_SIGNALING_SERVER_URL` | URL of the Socket.io server (LAN IP for devices, or your Railway URL) |

The signaling URL is **only** read from this env var — it is never hardcoded in app code.

### Server (`walkietalk/server/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port to listen on (Railway injects this) |
| `CLIENT_ORIGIN` | `*` | Allowed CORS origin for Socket.io clients |

---

## ☁️ Deploying the signaling server to Railway

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**, and set the
   **root directory** to `walkietalk/server`.
3. Railway auto-detects Node and runs `npm start` (see `railway.json`; health
   check at `/health`). `PORT` is provided automatically.
4. Optionally set `CLIENT_ORIGIN` to lock down CORS.
5. Copy the generated public URL into `EXPO_PUBLIC_SIGNALING_SERVER_URL` in the app.

---

## 📡 Signaling protocol

The server (`server/index.js`) is a thin relay using Socket.io rooms keyed
`channel:${number}`, backed by a `Map` of `socketId → { channelNumber, callsign }`.

| Event (client → server) | Effect |
|---|---|
| `join-channel` `{ channelNumber, callsign }` | Joins the room; emits `peer-joined` to existing peers + `channel-users` to all |
| `leave-channel` `{ channelNumber }` | Leaves the room; emits `peer-left` + `channel-users` |
| `webrtc-offer` / `webrtc-answer` / `ice-candidate` | Relayed to the target peer (or channel) |
| `ptt-start` / `ptt-end` `{ channelNumber, callsign }` | Broadcast to the channel |

| Event (server → client) | Meaning |
|---|---|
| `channel-users` `{ channelNumber, users[] }` | Current occupancy (on any join/leave) |
| `peer-joined` / `peer-left` | Peer lifecycle → drives WebRTC mesh |
| `ptt-start` / `ptt-end` | Who is transmitting |
| `webrtc-offer` / `webrtc-answer` / `ice-candidate` | Forwarded signaling data |

New peers receive an **offer from each existing peer**; each PTT press just
toggles the local audio track's `enabled` flag (mic stays connected but muted).

---

## 🗄️ Database schema

See [`walkietalk/supabase/schema.sql`](./walkietalk/supabase/schema.sql):

- `profiles` — `id` (→ `auth.users`), unique `callsign`, `created_at`
- `channels` — `number`, `name`, `passcode`, `is_private`, `created_at`
- `transmission_logs` — `channel_number`, `callsign`, `duration_seconds`, `transmitted_at`

RLS policies allow reading profiles/channels/logs and inserting your own
profile + transmissions.

---

## 🛡️ Error handling

- **Mic denied** → clear message on the radio screen; PTT button disabled + shows `MIC OFF`.
- **Socket down** → full-screen `NO SIGNAL` overlay; socket.io auto-reconnects every 5s.
- **WebRTC failure** → dead peers are dropped, the app keeps running (fallback + logged).
- **Audio errors** → every sound call is wrapped in try/catch; missing files never crash.
- **Connection status** (`CONNECTED` / `RECONNECTING` / `OFFLINE`) is always shown in the display panel.

---

## 🔊 A note on the sound files

The bundled `assets/sounds/*.wav` are lightweight tones generated
programmatically as placeholders so the app runs out of the box. Swap in your
own `click.mp3`, `tone.mp3`, `static.mp3`, `tuning.mp3` (same names) and update
the `require`s in `lib/sounds.ts` — the SoundManager handles missing/broken
files gracefully either way.

---

## 📜 Scripts

**App** (`walkietalk/`): `npm start`, `npm run android`, `npm run ios`, `npm run web`

**Server** (`walkietalk/server/`): `npm start`

---

## ✅ Verified

- `tsc --noEmit` passes.
- `expo export` bundles successfully for **both iOS and Android** (1299 modules).
- Signaling server integration-tested: join → occupancy broadcast → peer-joined → PTT relay across two clients.

Built for both **Android and iOS**.
