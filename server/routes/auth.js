const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { db } = require('../db');
const { validateUsername, validatePassword } = require('../utils/validators');
const { verifyTurnstile } = require('../services/turnstile');

const router = express.Router();

// Precomputed valid bcrypt hash of a random value, used so that login
// against a non-existent username still takes a real bcrypt.compare() call -
// this avoids the response timing leaking whether a username exists.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 11);

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('session', token, COOKIE_OPTS);
}

router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, turnstileToken } = req.body || {};

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.status(400).json({ error: usernameErr });

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.status(400).json({ error: passwordErr });

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const humanCheck = await verifyTurnstile(turnstileToken, req.ip);
    if (!humanCheck) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    const existing = db.get('users').find({ usernameLower: username.toLowerCase() }).value();
    if (existing) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 11);
    const user = {
      id: crypto.randomUUID(),
      username,
      usernameLower: username.toLowerCase(),
      passwordHash,
      plan: 'free',
      createdAt: Date.now(),
    };
    db.get('users').push(user).write();

    issueSession(res, user);
    return res.json({ ok: true, redirect: '/dashboard' });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, turnstileToken } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Enter your username and password.' });
    }

    const humanCheck = await verifyTurnstile(turnstileToken, req.ip);
    if (!humanCheck) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    const user = db.get('users').find({ usernameLower: String(username).toLowerCase() }).value();
    // Constant-shape response whether or not the user exists, to avoid
    // leaking which usernames are registered.
    const validPassword = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    issueSession(res, user);
    return res.json({ ok: true, redirect: '/dashboard' });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('session', COOKIE_OPTS);
  res.json({ ok: true, redirect: '/login' });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ id: req.user.id, username: req.user.username, plan: req.user.plan });
});

module.exports = router;
