const { sql } = require('../_db');

module.exports = async (req, res) => {
  const db = sql();
  const { id } = req.query;

  if (req.method === 'GET') {
    const rows = await db`SELECT data, content_type FROM product_images WHERE id = ${id}`;
    if (!rows.length) return res.status(404).end();
    const row = rows[0];
    res.setHeader('Content-Type', row.content_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    const buf = row.data instanceof Buffer ? row.data : Buffer.from(row.data);
    res.statusCode = 200;
    return res.end(buf);
  }

  if (req.method === 'DELETE') {
    await db`DELETE FROM product_images WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
};
