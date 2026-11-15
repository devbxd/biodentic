const { sql } = require('./_db');
const { requireAuth } = require('./_auth');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  try {
    await generateCatalogPdf(req, res);
  } catch (err) {
    console.error('catalog-pdf failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF generation failed', detail: err.message });
    } else {
      try { res.end(); } catch (e) {}
    }
  }
};

async function generateCatalogPdf(req, res) {
  const db = sql();

  const rows = await db`
    SELECT p.id, p.name, p.category_label AS "categoryLabel", p.description, p.price,
      (SELECT pi.id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image_id
    FROM products p
    LEFT JOIN categories c ON c.slug = p.category
    ORDER BY COALESCE(c.position, 999), p.category, p.sort_order, p.family_rank, p.name
  `;

  async function withRetry(fn, tries) {
    for (let i = 0; i < tries; i++) {
      try { return await fn(); }
      catch (e) { if (i === tries - 1) throw e; await new Promise((r) => setTimeout(r, 400)); }
    }
  }

  async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function run() {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
  }

  const tFetchStart = Date.now();
  const imageIds = rows.map((r) => r.image_id).filter(Boolean);
  const CHUNK = 15;
  const chunks = [];
  for (let i = 0; i < imageIds.length; i += CHUNK) chunks.push(imageIds.slice(i, i + CHUNK));

  const imageMap = {};
  await mapWithConcurrency(chunks, 20, async (chunk) => {
    const imgRows = await withRetry(() => db`SELECT id, data FROM product_images WHERE id = ANY(${chunk})`, 3);
    for (const ir of imgRows) {
      imageMap[ir.id] = ir.data instanceof Buffer ? ir.data : Buffer.from(ir.data);
    }
  });
  console.log('image fetch ms:', Date.now() - tFetchStart);

  const tConvertStart = Date.now();
  const jpegMap = {};
  const imgSizePreview = 165;
  await mapWithConcurrency(rows.filter((r) => r.image_id && imageMap[r.image_id]), 8, async (r) => {
    try {
      jpegMap[r.image_id] = await sharp(imageMap[r.image_id])
        .resize(imgSizePreview, imgSizePreview, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 72 })
        .toBuffer();
    } catch (e) { /* leave missing, row renders without image */ }
  });
  console.log('image convert ms:', Date.now() - tConvertStart);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Biodentic-Catalog.pdf"');

  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').fillColor('#0a1f2e').text('Biodentic — Full Catalog', { align: 'center' });
  doc.fontSize(10).font('Helvetica').fillColor('#8a99a4')
    .text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), { align: 'center' });
  doc.moveDown(1);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const imgSize = 55;
  const priceBoxWidth = 70;
  const textX = doc.page.margins.left + imgSize + 12;
  const textWidth = pageWidth - imgSize - 12 - priceBoxWidth - 8;
  const priceX = doc.page.width - doc.page.margins.right - priceBoxWidth;
  const minRowHeight = 70;

  let currentCategory = null;

  for (const p of rows) {
    if (p.categoryLabel !== currentCategory) {
      currentCategory = p.categoryLabel;
      if (doc.y > doc.page.height - doc.page.margins.bottom - 100) doc.addPage();
      doc.moveDown(0.6);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0a1f2e').text(currentCategory, doc.page.margins.left);
      doc.moveDown(0.25);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#0d9488').lineWidth(1.2).stroke();
      doc.moveDown(0.4);
    }

    const nameHeight = doc.heightOfString(p.name, { width: textWidth, font: 'Helvetica-Bold', fontSize: 11 });
    const descHeight = p.description
      ? doc.heightOfString(p.description, { width: textWidth, font: 'Helvetica', fontSize: 9 })
      : 0;
    const rowHeight = Math.max(minRowHeight, imgSize + 10, nameHeight + descHeight + 16);

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    const rowTop = doc.y;

    const jpeg = p.image_id ? jpegMap[p.image_id] : null;
    if (jpeg) {
      try {
        doc.image(jpeg, doc.page.margins.left, rowTop, { width: imgSize, height: imgSize });
      } catch (e) {
        // skip broken image, keep row layout intact
      }
    }

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#122029').text(p.name, textX, rowTop, { width: textWidth });
    if (p.description) {
      doc.fontSize(9).font('Helvetica').fillColor('#516170')
        .text(p.description, textX, rowTop + nameHeight + 3, { width: textWidth });
    }

    const priceText = p.price !== null && p.price !== undefined ? '$' + Number(p.price).toFixed(2) : '—';
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0d9488').text(priceText, priceX, rowTop, { width: priceBoxWidth, align: 'right' });

    doc.y = rowTop + rowHeight;
    doc.moveTo(doc.page.margins.left, doc.y - 10).lineTo(doc.page.width - doc.page.margins.right, doc.y - 10)
      .strokeColor('#eef1f0').lineWidth(0.5).stroke();
  }

  doc.end();
}
