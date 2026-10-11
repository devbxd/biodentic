const { sql } = require('../_db');

module.exports = async (req, res) => {
  const db = sql();
  const { slug } = req.query;

  if (req.method === 'PUT' || req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const label = (body && body.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Category name is required' });

    const existing = await db`SELECT slug FROM categories WHERE slug = ${slug}`;
    if (!existing.length) return res.status(404).json({ error: 'Category not found' });

    await db`UPDATE categories SET label = ${label} WHERE slug = ${slug}`;
    await db`UPDATE products SET category_label = ${label} WHERE category = ${slug}`;
    return res.status(200).json({ slug, label });
  }

  if (req.method === 'DELETE') {
    const countRows = await db`SELECT COUNT(*)::int AS n FROM products WHERE category = ${slug}`;
    const count = countRows[0].n;
    if (count > 0) {
      return res.status(409).json({ error: count + ' product(s) still use this category. Move them to another category first.' });
    }
    await db`DELETE FROM categories WHERE slug = ${slug}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'PUT, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
};
