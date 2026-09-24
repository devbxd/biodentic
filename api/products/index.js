const { sql } = require('../_db');

function slugify(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

module.exports = async (req, res) => {
  const db = sql();

  if (req.method === 'GET') {
    const rows = await db`
      SELECT p.id, p.name, p.category, p.category_label AS "categoryLabel",
             p.description, p.variants,
             COALESCE(
               json_agg(json_build_object('id', pi.id, 'url', '/api/images/' || pi.id) ORDER BY pi.position)
               FILTER (WHERE pi.id IS NOT NULL), '[]'
             ) AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      GROUP BY p.id
      ORDER BY p.category, p.name
    `;
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const { name, category, categoryLabel, description, variants } = body || {};
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });

    let id = slugify(name);
    const existing = await db`SELECT id FROM products WHERE id LIKE ${id + '%'}`;
    if (existing.some((r) => r.id === id)) {
      let n = 2;
      while (existing.some((r) => r.id === id + '-' + n)) n++;
      id = id + '-' + n;
    }

    await db`
      INSERT INTO products (id, name, category, category_label, description, variants)
      VALUES (${id}, ${name}, ${category}, ${categoryLabel || category}, ${description || ''}, ${variants ? JSON.stringify(variants) : null})
    `;
    return res.status(201).json({ id });
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
