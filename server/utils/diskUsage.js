const fs = require('fs');
const path = require('path');

function dirSize(dirPath) {
  let total = 0;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(full);
    } else {
      try {
        total += fs.statSync(full).size;
      } catch (err) {
        // file may have been removed mid-scan, ignore
      }
    }
  }
  return total;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0.0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(1)} ${units[exp]}`;
}

module.exports = { dirSize, formatBytes };
