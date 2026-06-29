const path = require('path');

/**
 * Resolves a user-supplied relative path against a root directory and
 * guarantees the result cannot escape that root (blocks "../" traversal,
 * absolute path injection, symlinked escapes, etc). This is the main
 * guardrail that keeps one user from ever reading another user's files.
 *
 * @param {string} rootDir - absolute path the user is sandboxed to
 * @param {string} relPath - untrusted path coming from the request
 * @returns {string|null} the safe absolute path, or null if it tried to escape
 */
function safeJoin(rootDir, relPath = '') {
  const cleaned = String(relPath || '').replace(/\\/g, '/');
  const resolvedRoot = path.resolve(rootDir);
  const target = path.resolve(resolvedRoot, '.' + path.sep + cleaned);

  if (target !== resolvedRoot && !target.startsWith(resolvedRoot + path.sep)) {
    return null;
  }
  return target;
}

function sanitizeFileName(name) {
  return String(name || '')
    .replace(/[\\/]/g, '')
    .replace(/\.\.+/g, '.')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim()
    .slice(0, 180) || 'untitled';
}

module.exports = { safeJoin, sanitizeFileName };
