const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_only_insecure_secret_change_me',
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || 'dev_only_insecure_key_change_me_please',
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || '',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
  MAX_BOTS_PER_USER: parseInt(process.env.MAX_BOTS_PER_USER || '3', 10),
  MAX_STORAGE_BYTES: parseInt(process.env.MAX_STORAGE_BYTES || String(2.5 * 1024 * 1024 * 1024), 10),
  MAX_UPLOAD_BYTES: 8 * 1024 * 1024, // 8MB per file
  PATHS: {
    ROOT,
    DATA_DIR,
    DB_FILE: path.join(DATA_DIR, 'db.json'),
    BOTS_DIR: path.join(DATA_DIR, 'bots'),
    STORAGE_DIR: path.join(DATA_DIR, 'storage'),
  },
};
