const { sql } = require('../_db');
const { requireAuth, isAuthenticated } = require('../_auth');

module.exports = async (req, res) => {
  const db = sql();
  const { id } = req.query;

  if (req.method !== 'GET' && !requireAuth(req, res)) return;

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
      WHERE p.id = ${id}
      GROUP BY p.id
    `;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const product = rows[0];
    if (!authed) delete product.price;
    else res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(product);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const { name, category, categoryLabel, description, variants, price } = body || {};

    const existing = await db`SELECT * FROM products WHERE id = ${id}`;
    if (!existing.length) return res.status(404).json({ error: 'Not found' });
    const current = existing[0];

    const nextName = name !== undefined ? name : current.name;
    const nextCategory = category !== undefined ? category : current.category;
    const nextCategoryLabel = categoryLabel !== undefined ? categoryLabel : current.category_label;
    const nextDescription = description !== undefined ? description : current.description;
    let nextVariants = variants !== undefined ? variants : current.variants;
    if (nextVariants && typeof nextVariants !== 'string') nextVariants = JSON.stringify(nextVariants);
    const nextPrice = price !== undefined
      ? (price === null || price === '' ? null : Number(price))
      : current.price;

    await db`
      UPDATE products SET
        name = ${nextName},
        category = ${nextCategory},
        category_label = ${nextCategoryLabel},
        description = ${nextDescription},
        variants = ${nextVariants},
        price = ${nextPrice},
        updated_at = now()
      WHERE id = ${id}
    `;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await db`DELETE FROM products WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
};
