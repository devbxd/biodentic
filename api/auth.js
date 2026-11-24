const { checkPassword, makeCookie, clearCookie, isAuthenticated } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ authenticated: isAuthenticated(req) });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const password = body && body.password;

    if (!checkPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.setHeader('Set-Cookie', makeCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
};
