# ScreenPing

Watch a screen region, get a Telegram ping when it changes. Perfect for ticket queues, deployment dashboards, or anything you don't want to stare at.

<img width="336" height="416" alt="image" src="https://github.com/user-attachments/assets/72f5e78e-ea52-43ac-a388-1c2144ebbbe2" />


## How it works

1. Select a screen region to watch
2. App takes periodic screenshots of that region
3. Compares each screenshot with the previous one (pixel diff)
4. If the difference exceeds the threshold — sends a screenshot to Telegram

## Quick start

```bash
npm install
npm start
```

## Setup Telegram

1. Open [@BotFather](https://t.me/BotFather) in Telegram, send `/newbot`
2. Copy the bot token
3. Send `/start` to your new bot
4. Paste the token into the app and click **Fetch Chat ID**

## Building

Requires Node.js 18+.

### Windows (on Windows)

```bash
npm run build
```

Output: `dist/ScreenPing 1.0.0.exe` (portable, no install needed)

### macOS (on macOS)

```bash
npm run build:mac
```

Output: `dist/ScreenPing-1.0.0.dmg`

### Linux (on Linux)

```bash
npm run build:linux
```

Output: `dist/ScreenPing-1.0.0.AppImage`

> **Note:** Each platform must be built on that platform (e.g. macOS builds require a Mac). Cross-compilation is not supported by Electron.

## Hotkey

**Ctrl+Shift+Space** — toggle monitoring on/off globally
