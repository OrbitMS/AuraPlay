# AuraPlay Desktop

**The ad-free, high-fidelity YouTube Music experience, now on your desktop.**

Finally, bring the power of Music to your workstation. Enjoy the seamless music experience you love — now native to Windows.

Download latest Version on the right (.exe) -> install and enjoy!

---
<img width="960" height="487" alt="image" src="https://github.com/user-attachments/assets/e62abd6a-d082-4d5d-aacb-0ab043ff088f" />
<img width="960" height="487" alt="image" src="https://github.com/user-attachments/assets/a6a5d9c7-1fa1-49df-8577-958ede173643" />








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

## Legal Disclaimer

AuraPlay is an open-source, local client application designed for educational and personal entertainment purposes. 

* **No Affiliation:** AuraPlay is not affiliated with, authorized, maintained, or endorsed by any commercial music streaming services (such as Spotify, Apple Music, YouTube Music, etc.). All product and company names are trademarks™ or registered® trademarks of their respective holders.
* **As-Is Provision:** This software is provided "as is," without warranty of any kind, express or implied. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.
* **User Responsibility:** Users are solely responsible for compliance with local laws and the Terms of Service (ToS) of any third-party streaming platforms or APIs they interact with through AuraPlay. The developers do not condone, encourage, or facilitate copyright infringement.

## Intellectual Property & DMCA Compliance

AuraPlay does not host, store, or redistribute any copyrighted audio files or media streams on its servers or within this repository. 

If you are a copyright owner or an agent thereof and believe that any content made available through this client infringes upon your copyrights, please submit a formal takedown request via GitHub Issues or contact [Your Contact Email/Method] containing the necessary information outlined by the Digital Millennium Copyright Act (DMCA).

## License and Third-Party Dependencies

AuraPlay is distributed under the [Insert your License, e.g., MIT License / Apache 2.0]. See the `LICENSE` file for full details.

This application utilizes several open-source libraries, including but not limited to:
* **cpal** (Apache 2.0 / MIT) - Cross-platform audio I/O library.
* **symphonia** (MPL 2.0) - Pure Rust audio decoding framework.
* **windows-rs** (MIT / Apache 2.0) - Microsoft Windows API bindings.

Please refer to the respective upstream repositories for their specific licensing terms and copyright notices.

## Privacy Policy
AuraPlay is built with privacy in mind. It does not collect, store, or transmit any personal data, usage telemetry, or listening history to the developers or any third-party analytics servers. All application configuration and streaming tokens are stored locally on your machine.
