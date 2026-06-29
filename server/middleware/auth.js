const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db');

function readUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = db.get('users').find({ id: payload.sub }).value();
    if (!user) return null;
    return user;
  } catch (err) {
    return null;
  }
}

// Attaches req.user if a valid session cookie is present, but never blocks.
function attachUser(req, res, next) {
  const token = req.cookies && req.cookies.session;
  const user = readUserFromToken(token);
  req.user = user || null;
  next();
}

// Use on page routes: bounce anonymous visitors back to /login.
function requireAuthPage(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// Use on JSON API routes: respond 401 instead of redirecting.
function requireAuthApi(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  next();
}

module.exports = { attachUser, requireAuthPage, requireAuthApi };
