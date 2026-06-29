const https = require('https');
const config = require('../config');

const TURNSTILE_ENABLED = Boolean(config.TURNSTILE_SECRET_KEY);

function verifyTurnstile(token, remoteIp) {
  return new Promise((resolve) => {
    if (!TURNSTILE_ENABLED) return resolve(true); // disabled = always pass
    if (!token) return resolve(false);

    const body = new URLSearchParams({
      secret: config.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: remoteIp || '',
    }).toString();

    const req = https.request(
      {
        hostname: 'challenges.cloudflare.com',
        path: '/turnstile/v0/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(Boolean(parsed.success));
          } catch (err) {
            resolve(false);
          }
        });
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

module.exports = { verifyTurnstile, TURNSTILE_ENABLED };
