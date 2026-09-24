const sharp = require('sharp');

// Resize/compress an incoming image (buffer) down to a small, fast-loading WebP.
// Keeps Neon storage usage low while staying sharp enough for a product photo.
async function processImage(buffer) {
  const out = await sharp(buffer)
    .rotate() // respect EXIF orientation (phone photos)
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer({ resolveWithObject: true });
  return {
    buffer: out.data,
    width: out.info.width,
    height: out.info.height,
    contentType: 'image/webp',
  };
}

function decodeDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

module.exports = { processImage, decodeDataUrl };
