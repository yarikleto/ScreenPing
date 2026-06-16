<div align="center">

<img src="assets/icon.svg" width="100" height="100" alt="ScreenPing icon"/>

# ScreenPing

**Watch any part of your screen — get a Telegram ping the moment it changes.**

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-5b6bff)
![License](https://img.shields.io/badge/license-MIT-2ecc71)
![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F?logo=electron&logoColor=white)

<img width="536" alt="ScreenPing — watching a region, monitoring active, with a Telegram alert in the log" src="assets/screenshot.png" />

</div>

---

ScreenPing watches a region of your screen and sends a screenshot to Telegram
whenever it changes. Point it at a deploy dashboard, a ticket queue, a
long-running job, a stock ticker, or a "back in stock" page — then walk away.
No more babysitting a tab to catch the one moment something happens.

## Features

- 🎯 **Pick any region** — drag a selection over any part of your screen
- 🔔 **Telegram alerts** — get the changed region as a screenshot, right in your chat
- 🔍 **Pixel-level diffing** — compares frames pixel-by-pixel, not crude file sizes
- 🎚️ **Tunable sensitivity** — set how often it checks and how much must change to fire
- ⌨️ **Global hotkey** — start/stop from anywhere, even when the window is hidden
- 🔒 **Local & private** — your token and settings stay on your machine; screenshots go only to your chat
- 💻 **Cross-platform** — macOS, Windows, and Linux

## How it works

1. **Select** a screen region to watch
2. **Monitor** — the app takes a screenshot of that region on a fixed interval
3. **Compare** — each capture is diffed against the previous one, pixel by pixel
4. **Alert** — if the change exceeds your threshold, the screenshot is sent to Telegram

## Quick start

```bash
npm install
npm start
```

> Requires **Node.js 18+**

## macOS: "Apple could not verify ScreenPing"

ScreenPing's downloads aren't signed with an Apple Developer ID, so on first
launch macOS shows a warning like *"Apple could not verify ScreenPing is free
of malware."* The app is fine — macOS just quarantines anything downloaded from
an unidentified developer. To open it:

1. Click **Done** on the warning (don't move it to Trash).
2. Open **System Settings → Privacy & Security** and scroll down.
3. Click **Open Anyway** next to the ScreenPing message, authenticate, then
   launch ScreenPing again and confirm.

Or remove the quarantine flag from Terminal in one command:

```bash
xattr -dr com.apple.quarantine /Applications/ScreenPing.app
```

Prefer to skip this entirely? Build the app yourself — a locally built app
isn't downloaded, so macOS never quarantines it and the warning never appears:

```bash
git clone https://github.com/yarikleto/ScreenPing.git
cd ScreenPing
npm install
npm run build:mac   # produces dist/ScreenPing-<version>.dmg
```

See [Building](#building) for the other platforms.

## Telegram setup

1. Open [@BotFather](https://t.me/BotFather) in Telegram and send `/newbot`
2. Copy the bot token it gives you
3. Send `/start` to your new bot (so it's allowed to message you)
4. Paste the token into ScreenPing and click **Fetch Chat ID**

That's it — you'll now receive a screenshot in Telegram whenever the watched
region changes. To alert a group instead, add the bot to the group, send any
message there, then **Fetch Chat ID**.

## Configuration

| Setting | What it does |
|---|---|
| **Interval (sec)** | How often the region is checked (default `10`) |
| **Threshold (%)** | How much of the region must change to trigger an alert (default `1`) |

A lower threshold is more sensitive — good for small text or status dots. Raise
it to ignore minor noise like blinking cursors or anti-aliasing.

## Global hotkey

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Space` | Toggle monitoring on/off |

Works even when ScreenPing is in the background, and shows a desktop
notification each time it starts or stops.

## Privacy

Everything runs locally. Your bot token and settings are stored on your own
machine, and the only network requests ScreenPing makes are to Telegram's
official Bot API to deliver your alerts. No accounts, no servers, no telemetry.

## Building

Each platform must be built on that platform — Electron does not support
cross-compilation.

| Platform | Command | Output |
|---|---|---|
| Windows | `npm run build` | `dist/ScreenPing 1.0.0.exe` (portable) |
| macOS | `npm run build:mac` | `dist/ScreenPing-1.0.0.dmg` |
| Linux | `npm run build:linux` | `dist/ScreenPing-1.0.0.AppImage` |

## License

MIT
