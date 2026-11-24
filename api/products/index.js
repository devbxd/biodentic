const { sql } = require('../_db');
const { requireAuth, isAuthenticated } = require('../_auth');

function slugify(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

module.exports = async (req, res) => {
  const db = sql();

  if (req.method === 'GET') {
    const authed = isAuthenticated(req);
    const rows = await db`
      SELECT p.id, p.name, p.category, p.category_label AS "categoryLabel",
             p.description, p.variants, p.price,
             COALESCE(
               json_agg(json_build_object('id', pi.id, 'url', '/api/images/' || pi.id || '?v=2') ORDER BY pi.position)
               FILTER (WHERE pi.id IS NOT NULL), '[]'
             ) AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      GROUP BY p.id
      ORDER BY p.category, p.sort_order, p.family_rank, p.name
    `;
    if (!authed) {
      rows.forEach((r) => { delete r.price; });
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
    }
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const { name, category, categoryLabel, description, variants, price } = body || {};
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });

    let id = slugify(name);
    const existing = await db`SELECT id FROM products WHERE id LIKE ${id + '%'}`;
    if (existing.some((r) => r.id === id)) {
      let n = 2;
      while (existing.some((r) => r.id === id + '-' + n)) n++;
      id = id + '-' + n;
    }

    const priceValue = price === undefined || price === null || price === '' ? null : Number(price);

    await db`
      INSERT INTO products (id, name, category, category_label, description, variants, price)
      VALUES (${id}, ${name}, ${category}, ${categoryLabel || category}, ${description || ''}, ${variants ? JSON.stringify(variants) : null}, ${priceValue})
    `;
    return res.status(201).json({ id });
  }

  if (req.method === 'PATCH') {
    // Bulk reorder within a category: { category, ids: [...] }
    if (!requireAuth(req, res)) return;
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
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  res.status(405).json({ error: 'Method not allowed' });
};
