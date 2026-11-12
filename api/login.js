const { checkPassword, makeCookie } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const password = body && body.password;

  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  res.setHeader('Set-Cookie', makeCookie());
  return res.status(200).json({ ok: true });
};
