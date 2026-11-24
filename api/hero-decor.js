const { sql } = require('./_db');
const { requireAuth } = require('./_auth');

const KEY = 'hero_decor';
const DEFAULT_VALUE = { desktop: [], mobile: [] };

module.exports = async (req, res) => {
  const db = sql();

  if (req.method === 'GET') {
    const rows = await db`SELECT value FROM app_settings WHERE key = ${KEY}`;
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.status(200).json(rows.length ? rows[0].value : DEFAULT_VALUE);
  }

  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const desktop = Array.isArray(body && body.desktop) ? body.desktop : [];
    const mobile = Array.isArray(body && body.mobile) ? body.mobile : [];
    const value = { desktop, mobile };

    await db`
      INSERT INTO app_settings (key, value) VALUES (${KEY}, ${JSON.stringify(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
