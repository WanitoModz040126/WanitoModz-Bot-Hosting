const express = require('express');
const path = require('path');
const config = require('../config');
const { db, userStorageDir } = require('../db');
const botManager = require('../services/botManager');
const { dirSize, formatBytes } = require('../utils/diskUsage');

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect(req.user ? '/dashboard' : '/login');
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('auth', { turnstileSiteKey: config.TURNSTILE_SITE_KEY });
});

router.get('/dashboard', (req, res) => {
  const bots = db.get('bots').filter({ userId: req.user.id }).value();
  const running = bots.filter((b) => botManager.isRunning(b.id)).length;
  const stopped = bots.length - running;

  const used = dirSize(path.join(config.PATHS.BOTS_DIR, req.user.id)) + dirSize(userStorageDir(req.user.id));

  res.render('dashboard', {
    user: req.user,
    bots: bots.map((b) => ({ ...b, status: botManager.isRunning(b.id) ? 'running' : b.status })),
    stats: {
      used: bots.length,
      limit: config.MAX_BOTS_PER_USER,
      running,
      stopped,
      storageUsedLabel: formatBytes(used),
      storageTotalLabel: formatBytes(config.MAX_STORAGE_BYTES),
      storagePercent: Math.min(100, Math.round((used / config.MAX_STORAGE_BYTES) * 100)),
    },
  });
});

router.get('/bots/create', (req, res) => {
  res.render('bot-create', { user: req.user, maxBots: config.MAX_BOTS_PER_USER });
});

router.get('/bots/:id', (req, res) => {
  const bot = db.get('bots').find({ id: req.params.id, userId: req.user.id }).value();
  if (!bot) return res.status(404).render('not-found', { user: req.user });
  res.render('bot-detail', {
    user: req.user,
    bot: { ...bot, status: botManager.isRunning(bot.id) ? 'running' : bot.status },
    recentLogs: botManager.readRecentLogs(req.user.id, bot.id),
  });
});

router.get('/files', (req, res) => {
  res.render('files', { user: req.user });
});

module.exports = router;
