# Deployment Guide for TEZ BOT

This bot is container-ready and can be deployed to any platform supporting Docker (Railway, Heroku, Render, DigitalOcean).

## Prerequisites
- A Telegram Bot Token (from @BotFather).
- A cloud provider account (e.g., Railway.app, Heroku, or a VPS).

## 1. Deploy on Railway (Recommended)
Railway is the easiest way to deploy this bot because it handles Docker automatically.

1. **Fork/Clone** this repository to your GitHub.
2. Login to [Railway.app](https://railway.app/).
3. Click **"New Project"** -> **"Deploy from GitHub repo"**.
4. Select your `tez_bot` repository.
5. Go to **Settings** -> **Variables** and add:
    - `TELEGRAM_BOT_TOKEN`: Your bot token.
    - `ADMIN_ID`: Your Telegram numeric ID.
6. Railway will automatically build using the `Dockerfile` and start the bot.

## 2. Deploy with Docker (VPS/Local)

1. **Build the image**:
   ```bash
   docker build -t tezbot .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     --name my-tez-bot \
     -e TELEGRAM_BOT_TOKEN="your_token_here" \
     -e ADMIN_ID="your_admin_id" \
     tezbot
   ```

## 3. Environment Variables
| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Required. The API token from BotFather. |
| `ADMIN_ID` | Optional. Your Telegram ID for `/unblock` command. |
| `NODE_ENV` | Defaults to `production`. |

## Notes
- **Binaries**: The Dockerfile automatically installs `python3`, `pip`, `yt-dlp`, and `ffmpeg`.
- **Storage**: Downloads are temporary and cleaned up automatically. No persistent volume is required unless you want to keep logs.
