# AuraPlay Desktop

**The ad-free, high-fidelity YouTube Music experience, now on your desktop.**

Finally, bring the power of Music to your workstation. Enjoy the seamless music experience you love — now native to Windows.

Download latest Version on the right (.exe) -> install and enjoy!

---

<img width="960" height="487" alt="image" src="https://github.com/user-attachments/assets/f977536a-66e0-42fd-83a1-ed62c59c7550" /> <img width="960" height="487" alt="image" src="https://github.com/user-attachments/assets/c5b920d2-67d3-40b9-bbb2-bd188a998111" />




## ✨ Features

### Music
- **Unified search** across YouTube Music — songs, videos, and albums
- **High-fidelity audio** — streams the best available format (Opus ~160 kbps), ad-free
- **Smart home feed** — Trending, New Releases, and history-based "For You" recommendations
- **Albums** — open any album and play the full tracklist
- **Auto-queue / Up Next** — seamlessly continues with related tracks (YouTube Music automix)

### Library
- **Favorites** — like any track, kept in a dedicated list
- **Downloads** — save songs for true offline playback, browsable under *Downloaded*
- **Listening history** — feeds your recommendations

### Radio
- **Hundreds of ad-free live stations** from [Radio Browser](https://www.radio-browser.info), across 22 genres, with name search

### Playback & UI
- **Now Playing screen** with spinning artwork, **synced lyrics** (via [LRCLIB](https://lrclib.net)), and an audio visualizer
- **Seekable progress bar**, volume, shuffle, repeat
- **Queue sidebar** — drag-to-reorder and remove tracks
- **Resizable** sidebar and player bar, with a content zoom control
- **Translucent acrylic UI** — clean, modern, gold-on-obsidian
- **System tray** — closes to the tray and keeps playing in the background
- **Adjustable audio quality** (High / Medium / Low) in Settings

### Under the hood
- **Tauri v2** — tiny memory footprint, fast startup, native performance
- **Self-updating** — installed copies auto-update from signed GitHub releases

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Tauri v2 [system dependencies](https://v2.tauri.app/start/prerequisites/) (on Windows: WebView2 + MSVC build tools)

### Run in development
```bash
git clone https://github.com/OrbitMS/AuraPlay.git
cd AuraPlay
npm install
npm run tauri dev
```

### Build an installer
```bash
npm run tauri build
```
The Windows installer is written to:
```
src-tauri/target/release/bundle/nsis/AuraPlay_<version>_x64-setup.exe
```

---

## 📦 Releases

Grab the latest installer from the [Releases page](https://github.com/OrbitMS/AuraPlay/releases). Once installed, AuraPlay keeps itself up to date automatically.

Maintainers cut a release by pushing a version tag — CI builds, signs, and publishes the installer plus the update manifest:
```bash
git tag v0.1.1
git push origin v0.1.1
```

---

## 🛠 Tech Stack
- **Frontend**: React 19 · TypeScript · Tailwind CSS
- **Desktop layer**: Tauri v2 (Rust)
- **Music API**: [youtubei.js](https://github.com/LuanRT/YouTube.js)
- **Lyrics**: [LRCLIB](https://lrclib.net) · **Radio**: [Radio Browser](https://www.radio-browser.info)

---

## ❤️ Support

If you enjoy AuraPlay, consider supporting development on [Ko-fi](https://ko-fi.com/orbitms).

## License
[MIT](LICENSE)
