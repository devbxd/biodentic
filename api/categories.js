const { sql } = require('./_db');

function slugify(label) {
  return String(label || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'category';
}

module.exports = async (req, res) => {
  const db = sql();

  if (req.method === 'GET') {
    const rows = await db`SELECT slug, label FROM categories ORDER BY position, label`;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const label = (body && body.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Category name is required' });

    let slug = slugify(label);
    const existing = await db`SELECT slug FROM categories WHERE slug = ${slug}`;
    if (existing.length) {
      let n = 2;
      while ((await db`SELECT slug FROM categories WHERE slug = ${slug + '-' + n}`).length) n++;
      slug = slug + '-' + n;
    }
    const posRows = await db`SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM categories`;
    await db`INSERT INTO categories (slug, label, position) VALUES (${slug}, ${label}, ${posRows[0].next_pos})`;
    return res.status(201).json({ slug, label });
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
