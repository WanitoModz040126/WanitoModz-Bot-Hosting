const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { db, botDir } = require('../db');
const botManager = require('../services/botManager');
const tokenCrypto = require('../utils/crypto');
const { dirSize } = require('../utils/diskUsage');
const { validateBotName, validateLibrary } = require('../utils/validators');
const { wrapUpload } = require('../middleware/multerErrorWrap');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.py')) {
      return cb(new Error('Only .py files are accepted.'));
    }
    cb(null, true);
  },
});

function publicBot(bot) {
  return {
    id: bot.id,
    name: bot.name,
    library: bot.library,
    status: botManager.isRunning(bot.id) ? 'running' : bot.status,
    entryFile: bot.entryFile,
    hasToken: Boolean(bot.tokenEncrypted),
    createdAt: bot.createdAt,
    lastStartedAt: bot.lastStartedAt || null,
  };
}

router.get('/', (req, res) => {
  const bots = db.get('bots').filter({ userId: req.user.id }).value();
  res.json({ bots: bots.map(publicBot) });
});

router.get('/:id', (req, res) => {
  const bot = db.get('bots').find({ id: req.params.id, userId: req.user.id }).value();
  if (!bot) return res.status(404).json({ error: 'Bot not found.' });
  res.json({ bot: publicBot(bot) });
});

router.post('/', wrapUpload(upload.single('file')), (req, res) => {
  try {
    const { name, library, token } = req.body || {};

    const nameErr = validateBotName(name);
    if (nameErr) return res.status(400).json({ error: nameErr });

    const libErr = validateLibrary(library);
    if (libErr) return res.status(400).json({ error: libErr });

    if (!req.file) {
      return res.status(400).json({ error: 'Upload your bot\'s .py file.' });
    }

    const userBots = db.get('bots').filter({ userId: req.user.id }).value();
    if (userBots.length >= config.MAX_BOTS_PER_USER) {
      return res.status(403).json({ error: `Free plan allows up to ${config.MAX_BOTS_PER_USER} bots. Delete one to add another.` });
    }

    const userBotsRoot = path.join(config.PATHS.BOTS_DIR, req.user.id);
    const userStorageRoot = path.join(config.PATHS.STORAGE_DIR, req.user.id);
    const usedBytes = dirSize(userBotsRoot) + dirSize(userStorageRoot);
    if (usedBytes + req.file.size > config.MAX_STORAGE_BYTES) {
      return res.status(403).json({ error: 'Not enough storage left on your plan.' });
    }

    const botId = crypto.randomUUID();
    const dir = botDir(req.user.id, botId);
    const entryFile = 'main.py';
    fs.writeFileSync(path.join(dir, entryFile), req.file.buffer);

    const bot = {
      id: botId,
      userId: req.user.id,
      name: name.trim(),
      library,
      entryFile,
      tokenEncrypted: token ? tokenCrypto.encrypt(token) : null,
      status: 'stopped',
      createdAt: Date.now(),
      lastStartedAt: null,
      lastStoppedAt: null,
    };
    db.get('bots').push(bot).write();

    return res.json({ ok: true, bot: publicBot(bot) });
  } catch (err) {
    const message = err && err.message && err.message.includes('.py') ? err.message : 'Could not create the bot.';
    return res.status(400).json({ error: message });
  }
});

router.post('/:id/start', (req, res) => {
  const bot = db.get('bots').find({ id: req.params.id, userId: req.user.id }).value();
  if (!bot) return res.status(404).json({ error: 'Bot not found.' });

  const decryptedToken = bot.tokenEncrypted ? tokenCrypto.decrypt(bot.tokenEncrypted) : null;
  const result = botManager.startBot(bot, decryptedToken);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

router.post('/:id/stop', (req, res) => {
  const bot = db.get('bots').find({ id: req.params.id, userId: req.user.id }).value();
  if (!bot) return res.status(404).json({ error: 'Bot not found.' });

  const result = botManager.stopBot(bot.id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const bot = db.get('bots').find({ id: req.params.id, userId: req.user.id }).value();
  if (!bot) return res.status(404).json({ error: 'Bot not found.' });

  if (botManager.isRunning(bot.id)) {
    botManager.stopBot(bot.id);
  }
  const dir = botDir(req.user.id, bot.id);
  fs.rmSync(dir, { recursive: true, force: true });
  db.get('bots').remove({ id: bot.id }).write();
  res.json({ ok: true });
});

router.get('/:id/logs', (req, res) => {
  const bot = db.get('bots').find({ id: req.params.id, userId: req.user.id }).value();
  if (!bot) return res.status(404).json({ error: 'Bot not found.' });
  res.json({ lines: botManager.readRecentLogs(req.user.id, bot.id) });
});

// Server-Sent Events stream for live logs.
router.get('/:id/logs/stream', (req, res) => {
  const bot = db.get('bots').find({ id: req.params.id, userId: req.user.id }).value();
  if (!bot) return res.status(404).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('status', { status: botManager.isRunning(bot.id) ? 'running' : bot.status });

  const onLog = (line) => send('log', { line });
  const onStatus = (status) => send('status', { status });

  botManager.logEmitter.on(`log:${bot.id}`, onLog);
  botManager.logEmitter.on(`status:${bot.id}`, onStatus);

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    botManager.logEmitter.removeListener(`log:${bot.id}`, onLog);
    botManager.logEmitter.removeListener(`status:${bot.id}`, onStatus);
  });
});

module.exports = router;
