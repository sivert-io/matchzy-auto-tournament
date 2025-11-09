<div align="center">
  <img src="client/public/icon.svg" alt="MatchZy Auto Tournament" width="140" height="140">
  
  # MatchZy Auto Tournament
  
  ⚡ **Automated CS2 tournament management — one click from bracket creation to final scores**
  
  <p>Complete tournament automation for Counter-Strike 2 using the MatchZy plugin. Zero manual server configuration.</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**📚 [Full Documentation](https://mat.sivert.io/)** • [Quick Start](https://mat.sivert.io/getting-started/quick-start/) • [Features](https://mat.sivert.io/features/overview/) • [Troubleshooting](https://mat.sivert.io/guides/troubleshooting/)

</div>

---

## ✨ Features

🏆 **Tournament Brackets** — Single/Double Elimination, Round Robin, Swiss with auto-progression  
🗺️ **Interactive Map Veto** — FaceIT-style ban/pick system for BO1/BO3/BO5  
⚡ **Real-Time Updates** — WebSocket-powered live scores and player tracking  
🎮 **Auto Server Allocation** — Matches load automatically when servers are available  
👥 **Public Team Pages** — No-auth pages for teams to monitor matches and veto  
🎛️ **Admin Match Controls** — Pause, restore, broadcast, add players via RCON  
📊 **Player Tracking** — Live connection and ready status for all 10 players  
🎬 **Demo Management** — Automatic upload and download with streaming

---

## 🚀 Quick Start

> **⚠️ Prerequisites:** Requires a [custom MatchZy plugin](#️-cs2-server-plugin) — [Installation guide](https://mat.sivert.io/getting-started/quick-start/#cs2-server-setup)

```bash
git clone https://github.com/sivert-io/matchzy-auto-tournament.git
cd matchzy-auto-tournament

# 1. Create environment file
cp .env.example .env

# 2. Generate secure tokens
openssl rand -hex 32  # Copy for API_TOKEN
openssl rand -hex 32  # Copy for SERVER_TOKEN

# 3. Edit .env and add:
#    - API_TOKEN (admin login)
#    - SERVER_TOKEN (CS2 server auth)
#    - WEBHOOK_URL (your server IP where CS2 sends events)
nano .env

# 4. Start everything
docker compose -f docker/docker-compose.yml up -d
```

**Access at:** `http://localhost:3069`

**👉 [Full setup guide with detailed configuration](https://mat.sivert.io/getting-started/quick-start/)**

---

## ⚙️ CS2 Server Plugin

> [!CAUTION]
> This project requires a **modified version of MatchZy** with enhanced event tracking.
>
> The official MatchZy release does not expose all the granular match and player events required for full automation.

**Download:** [sivert-io/matchzy/releases](https://github.com/sivert-io/matchzy/releases)

Extract to your CS2 server's `csgo/` directory and restart.

**👉 [Complete installation guide](https://mat.sivert.io/getting-started/quick-start/#cs2-server-setup)**

Requires [CounterStrikeSharp](https://docs.cssharp.dev/guides/getting-started/) to be installed first.

---

## 🤝 Contributing

Contributions are welcome! Whether you're fixing bugs, adding features, improving docs, or sharing ideas.

**👉 [Read the Contributing Guide](.github/CONTRIBUTING.md)**

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

**Credits:** [ghostcap-gaming/cs2-map-images](https://github.com/ghostcap-gaming/cs2-map-images) • [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js)

---

<div align="center">
  <strong>Made with ❤️ for the CS2 community</strong>
</div>
