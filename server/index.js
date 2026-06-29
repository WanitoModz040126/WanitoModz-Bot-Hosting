require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { attachUser, requireAuthPage, requireAuthApi } = require('./middleware/auth');
const { helmetMiddleware, globalLimiter, authLimiter, heavyActionLimiter } = require('./middleware/security');
const botManager = require('./services/botManager');

const authRoutes = require('./routes/auth');
const botsRoutes = require('./routes/bots');
const filesRoutes = require('./routes/files');
const pagesRoutes = require('./routes/pages');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // Railway/Cloudflare sit in front of us; needed for correct req.ip in rate limiting

app.use(helmetMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(globalLimiter);
app.use(attachUser);
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));

// ---- Auth (tightly rate-limited against brute force / signup spam) ----
app.use('/api/auth', authLimiter, authRoutes);

// ---- Authenticated JSON APIs ----
app.use('/api/bots', requireAuthApi, heavyActionLimiter, botsRoutes);
app.use('/api/files', requireAuthApi, heavyActionLimiter, filesRoutes);

// ---- Server-rendered pages ----
app.use('/dashboard', requireAuthPage);
app.use('/bots', requireAuthPage);
app.use('/files', requireAuthPage);
app.use('/', pagesRoutes);

// ---- 404 + error handling ----
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.status(404).render('not-found', { user: req.user });
});

app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Something went wrong on our end.' });
  }
  res.status(500).send('Something went wrong on our end.');
});

const server = app.listen(config.PORT, () => {
  console.log(`WanitoModz Hosting running on port ${config.PORT}`);
});

function shutdown() {
  console.log('Shutting down, stopping all running bots...');
  botManager.stopAllForShutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
