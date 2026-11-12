const { sql } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const db = sql();
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { category, ids } = body || {};
  if (!category || !Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'category and ids are required' });
  }

  for (let i = 0; i < ids.length; i++) {
    await db`UPDATE products SET sort_order = ${i} WHERE id = ${ids[i]} AND category = ${category}`;
  }

  return res.status(200).json({ ok: true });
};
