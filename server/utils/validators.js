const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function validateUsername(username) {
  if (!username || !USERNAME_RE.test(username)) {
    return 'Username must be 3-20 characters: letters, numbers, underscore only.';
  }
  return null;
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (password.length > 200) {
    return 'Password is too long.';
  }
  return null;
}

function validateBotName(name) {
  if (!name || !name.trim()) return 'Bot name is required.';
  if (name.trim().length > 60) return 'Bot name must be under 60 characters.';
  return null;
}

const ALLOWED_LIBRARIES = new Set([
  'pytelegrambotapi-sync',
  'pytelegrambotapi-async',
  'python-telegram-bot',
  'aiogram',
  'pyrogram',
  'custom',
]);

function validateLibrary(library) {
  if (!ALLOWED_LIBRARIES.has(library)) return 'Choose a valid library.';
  return null;
}

module.exports = {
  validateUsername,
  validatePassword,
  validateBotName,
  validateLibrary,
  ALLOWED_LIBRARIES,
};
