# WanitoModz Hosting

A Telegram bot hosting panel. Users sign up, upload a Python script for their
Telegram bot, and the panel runs and supervises it — with live logs, a
per-user file manager, and isolated storage per account.

This is an original build: different color palette, different page layout
(split-screen auth instead of a centered card, a slim icon sidebar instead of
stacked panels, a table-based file manager), and original copy throughout —
built specifically so it doesn't read as a copy of any existing hosting panel
template.

## What it does

- **Sign up / sign in** — JWT session in an httpOnly cookie, passwords hashed with bcrypt.
- **Deploy a bot** — pick a library (pyTelegramBotAPI, python-telegram-bot, aiogram, Pyrogram, or "custom"), name it, optionally store a bot token (encrypted at rest), upload a `.py` file.
- **Bot control** — start/stop the script as a real child process (`python3 main.py`) and watch its stdout/stderr live via Server-Sent Events.
- **File manager** — per-user sandboxed storage: new folder, new file, upload, download, delete. Quota enforced (2.5 GB / 3 bots by default — configurable).
- **Security baked in** — see Security model below.

## Tech stack

Node.js + Express, server-rendered EJS views, vanilla JS/CSS on the frontend
(no build step — this matters for reliable Railway deploys). Data is stored
in a JSON file via `lowdb` (no native database binaries to compile). Bot
processes run with Node's `child_process.spawn`.

## Project structure

```
server/
  index.js              entry point - wires middleware + routes
  config.js              env-driven config & plan limits
  db.js                   lowdb setup + per-user folder helpers
  middleware/
    auth.js               JWT cookie auth (page + API guards)
    security.js            helmet + rate limiting + slow-down
  routes/
    auth.js               register / login / logout
    bots.js                bot CRUD, start/stop, log streaming
    files.js               file manager API (path-traversal safe)
    pages.js               server-rendered page routes
  services/
    botManager.js          spawns/kills python processes, log buffer
    turnstile.js            optional Cloudflare Turnstile check
  utils/
    crypto.js               AES-256-GCM encryption for bot tokens
    pathSafety.js            blocks path traversal across user storage
    diskUsage.js             folder size + quota helpers
    validators.js            input validation
  views/                   EJS templates
public/
  css/style.css            full design system
  js/                      page-specific frontend logic
data/                      runtime storage (gitignored) - created on first boot
Dockerfile                 Node + Python3 runtime image
railway.json               Railway build config
```

## Running locally

```bash
npm install
cp .env.example .env
# edit .env - at minimum set JWT_SECRET and TOKEN_ENCRYPTION_KEY
npm start
```

The app needs `python3` on PATH to actually run uploaded bots - install it
locally if you want to test bot execution, not just the panel UI.

## Deploying

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "WanitoModz Hosting"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```
`.gitignore` already excludes `node_modules/`, `.env`, and the runtime `data/`
folders, so secrets and uploaded bot files never get committed.

### 2. Deploy on Railway
1. New Project -> Deploy from GitHub repo -> select this repo.
2. Railway detects `Dockerfile` and `railway.json` automatically (Node + Python3 image, so uploaded bots can run).
3. In Variables, set at minimum:
   - `JWT_SECRET` - long random string
   - `TOKEN_ENCRYPTION_KEY` - long random string
   - (optional) `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` if you want a bot-check on signup/login
4. Generate a domain under Settings -> Networking.

Generate strong secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. (Strongly recommended) Put Cloudflare in front
Point your domain's DNS through Cloudflare with the proxy ("orange cloud")
turned on before pointing it at your Railway URL. App-level rate limiting
(below) stops abuse at the application layer, but real volumetric DDoS
protection has to happen at the network edge - that's what Cloudflare (or
Railway's own edge) is for. No application code can fully replace that.

## Security model

**Anti-abuse / "anti-DDoS" layer (application level):**
- `helmet` sets locked-down security headers and a strict CSP.
- Global rate limit (240 req/min/IP) on every route.
- Tighter rate limit + progressive slow-down specifically on `/api/auth/*`, to blunt brute-force and signup spam.
- A separate limiter on disk-touching routes (uploads, file ops, bot start/stop).
- Request body size limits, and an 8 MB cap on uploaded files.
- Honest caveat: this raises the cost of abuse significantly, but it cannot stop a large, distributed volumetric flood by itself - that needs an edge network like Cloudflare in front (see above).

**"Anti-dump" / source isolation (the part that matters most here):**
- Every user's bot files and general storage live under their own user-ID folder on disk, never under a shared or web-servable path.
- Every file-manager and bot route checks `req.user.id` against the resource owner before touching disk - there's no route that serves a user's files without that check.
- All paths from the client are resolved through `safeJoin()`, which refuses to resolve outside that user's root folder - this is what stops `../../` traversal tricks.
- Bot tokens are encrypted at rest (AES-256-GCM) using `TOKEN_ENCRYPTION_KEY`, not stored in plain text.
- Sessions are httpOnly + `sameSite=lax` cookies, so they're not readable from page JavaScript.

**On "101% accurate, zero bugs":** this was built carefully and every file
was checked for syntax errors, but no realistic claim of software is ever
100% bug-free - for a panel that executes arbitrary uploaded code, treat this
as a strong, secure starting point and keep an eye on logs after deploying,
the same way you would with any hosting panel.

## Plan limits

Defaults (override via env vars): 3 bots and 2.5 GB combined storage per
account. Edit `MAX_BOTS_PER_USER` and `MAX_STORAGE_BYTES` in `.env`.

## Notes on uploaded bots

- The token entered is passed to the script as the `BOT_TOKEN` environment variable - the script should read it with `os.environ.get('BOT_TOKEN')`.
- Each bot's script runs from its own private folder.
- A bot must keep running (e.g. a polling loop) to stay "online" - if the script exits, its status flips to "stopped" and the exit reason is the last line in its log.
