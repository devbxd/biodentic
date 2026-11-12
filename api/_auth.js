const crypto = require('crypto');

const PASSWORD = process.env.DASHBOARD_PASSWORD;
const SECRET = process.env.DASHBOARD_AUTH_SECRET || 'biodentic-dashboard-auth-secret-v1';
const COOKIE_NAME = 'biodentic_dash_auth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(value) {
  const sig = crypto.createHmac('sha256', SECRET).update(value).digest('hex');
  return value + '.' + sig;
}

function verify(token) {
  if (!token) return false;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return false;
  const value = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(value).digest('hex');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const expiresAt = parseInt(value.split(':')[1], 10);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

function checkPassword(password) {
  if (!PASSWORD) return false;
  return typeof password === 'string' && password === PASSWORD;
}

function makeCookie() {
  const expiresAt = Date.now() + MAX_AGE * 1000;
  const token = sign('session:' + expiresAt);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return verify(cookies[COOKIE_NAME]);
}

function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: 'Not authenticated' });
  return false;
}

module.exports = { checkPassword, makeCookie, clearCookie, isAuthenticated, requireAuth, COOKIE_NAME };
