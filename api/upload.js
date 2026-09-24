const { sql } = require('./_db');
const { processImage, decodeDataUrl } = require('./_images');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { productId, imageDataUrl } = body || {};
  if (!productId || !imageDataUrl) return res.status(400).json({ error: 'productId and imageDataUrl are required' });

  const decoded = decodeDataUrl(imageDataUrl);
  if (!decoded) return res.status(400).json({ error: 'Invalid image data' });
  if (decoded.buffer.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'Image too large' });

  const db = sql();
  const product = await db`SELECT id FROM products WHERE id = ${productId}`;
  if (!product.length) return res.status(404).json({ error: 'Product not found' });

  let processed;
  try {
    processed = await processImage(decoded.buffer);
  } catch (e) {
    return res.status(400).json({ error: 'Could not process image' });
  }

  const posRows = await db`SELECT COALESCE(MAX(position), -1) AS max_pos FROM product_images WHERE product_id = ${productId}`;
  const nextPos = posRows[0].max_pos + 1;

  const inserted = await db`
    INSERT INTO product_images (product_id, position, content_type, data, width, height, bytes)
    VALUES (${productId}, ${nextPos}, ${processed.contentType}, ${processed.buffer}, ${processed.width}, ${processed.height}, ${processed.buffer.length})
    RETURNING id
  `;

  const id = inserted[0].id;
  return res.status(201).json({ id, url: `/api/images/${id}` });
};
