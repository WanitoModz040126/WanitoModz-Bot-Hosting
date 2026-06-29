const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { userStorageDir } = require('../db');
const { safeJoin, sanitizeFileName } = require('../utils/pathSafety');
const { dirSize, formatBytes } = require('../utils/diskUsage');
const { wrapUpload } = require('../middleware/multerErrorWrap');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.MAX_UPLOAD_BYTES } });

function resolveUserPath(req, relPath) {
  const root = userStorageDir(req.user.id);
  return { root, target: safeJoin(root, relPath) };
}

router.get('/', (req, res) => {
  const { root, target } = resolveUserPath(req, req.query.path || '');
  if (!target) return res.status(400).json({ error: 'Invalid path.' });

  if (!fs.existsSync(target)) {
    return res.json({ path: req.query.path || '', entries: [] });
  }

  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return res.status(400).json({ error: 'Not a folder.' });

  const entries = fs.readdirSync(target, { withFileTypes: true }).map((entry) => {
    const full = path.join(target, entry.name);
    const entryStat = fs.statSync(full);
    return {
      name: entry.name,
      type: entry.isDirectory() ? 'folder' : 'file',
      size: entry.isDirectory() ? null : entryStat.size,
      sizeLabel: entry.isDirectory() ? null : formatBytes(entryStat.size),
      modified: entryStat.mtimeMs,
    };
  });

  entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
  res.json({ path: req.query.path || '', entries });
});

router.get('/usage', (req, res) => {
  const root = userStorageDir(req.user.id);
  const botsRoot = path.join(config.PATHS.BOTS_DIR, req.user.id);
  const used = dirSize(root) + dirSize(botsRoot);
  res.json({ usedBytes: used, totalBytes: config.MAX_STORAGE_BYTES, usedLabel: formatBytes(used), totalLabel: formatBytes(config.MAX_STORAGE_BYTES) });
});

router.post('/folder', (req, res) => {
  const { path: relPath, name } = req.body || {};
  const safeName = sanitizeFileName(name);
  const { target } = resolveUserPath(req, path.join(relPath || '', safeName));
  if (!target) return res.status(400).json({ error: 'Invalid path.' });
  if (fs.existsSync(target)) return res.status(409).json({ error: 'A file or folder with that name already exists.' });

  fs.mkdirSync(target, { recursive: true });
  res.json({ ok: true });
});

router.post('/file', (req, res) => {
  const { path: relPath, name, content } = req.body || {};
  const safeName = sanitizeFileName(name);
  const { target } = resolveUserPath(req, path.join(relPath || '', safeName));
  if (!target) return res.status(400).json({ error: 'Invalid path.' });
  if (fs.existsSync(target)) return res.status(409).json({ error: 'A file or folder with that name already exists.' });

  fs.writeFileSync(target, content || '');
  res.json({ ok: true });
});

router.post('/upload', wrapUpload(upload.array('files', 20)), (req, res) => {
  const relPath = (req.body && req.body.path) || '';
  const root = userStorageDir(req.user.id);

  const used = dirSize(root) + dirSize(path.join(config.PATHS.BOTS_DIR, req.user.id));
  const incoming = (req.files || []).reduce((sum, f) => sum + f.size, 0);
  if (used + incoming > config.MAX_STORAGE_BYTES) {
    return res.status(403).json({ error: 'Not enough storage left on your plan.' });
  }

  for (const file of req.files || []) {
    const safeName = sanitizeFileName(file.originalname);
    const { target } = resolveUserPath(req, path.join(relPath, safeName));
    if (!target) continue;
    fs.writeFileSync(target, file.buffer);
  }
  res.json({ ok: true, count: (req.files || []).length });
});

router.delete('/', (req, res) => {
  const { root, target } = resolveUserPath(req, req.query.path || '');
  if (!target) return res.status(400).json({ error: 'Invalid path.' });
  if (target === root) return res.status(400).json({ error: 'Cannot delete the root folder.' });
  if (!fs.existsSync(target)) return res.status(404).json({ error: 'Not found.' });

  fs.rmSync(target, { recursive: true, force: true });
  res.json({ ok: true });
});

router.get('/download', (req, res) => {
  const { target } = resolveUserPath(req, req.query.path || '');
  if (!target || !fs.existsSync(target)) return res.status(404).json({ error: 'Not found.' });
  const stat = fs.statSync(target);
  if (stat.isDirectory()) return res.status(400).json({ error: 'Cannot download a folder directly.' });
  res.download(target);
});

module.exports = router;
