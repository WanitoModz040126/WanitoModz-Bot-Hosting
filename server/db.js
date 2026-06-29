const fs = require('fs');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const config = require('./config');

// Make sure runtime folders exist (they're gitignored, created fresh on first boot)
for (const dir of [config.PATHS.DATA_DIR, config.PATHS.BOTS_DIR, config.PATHS.STORAGE_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const adapter = new FileSync(config.PATHS.DB_FILE);
const db = low(adapter);

db.defaults({ users: [], bots: [] }).write();

function userStorageDir(userId) {
  const dir = path.join(config.PATHS.STORAGE_DIR, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function botDir(userId, botId) {
  const dir = path.join(config.PATHS.BOTS_DIR, userId, botId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { db, userStorageDir, botDir };
