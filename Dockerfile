FROM node:20-bookworm-slim

# Telegram bot scripts uploaded by users need a Python runtime + pip to
# install whichever library they imported (pyTelegramBotAPI, aiogram, etc).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Common Telegram bot libraries pre-installed so most uploaded scripts work
# immediately without the user needing a requirements.txt step.
RUN pip3 install --no-cache-dir --break-system-packages \
    pyTelegramBotAPI \
    python-telegram-bot \
    aiogram \
    pyrogram \
    tgcrypto

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
