const { sql } = require('./_db');

module.exports = async (req, res) => {
  const db = sql();

  if (req.method === 'GET') {
    const rows = await db`
      SELECT id, doctor_name AS "doctorName", phone, created_at AS "createdAt"
      FROM visitors ORDER BY created_at DESC
    `;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const doctorName = (body && body.doctorName || '').trim();
    const phone = (body && body.phone || '').trim();
    if (!doctorName || !phone) return res.status(400).json({ error: 'Doctor name and phone are required' });
    if (doctorName.length > 200 || phone.length > 60) return res.status(400).json({ error: 'Input too long' });

    const inserted = await db`
      INSERT INTO visitors (doctor_name, phone) VALUES (${doctorName}, ${phone}) RETURNING id
    `;
    return res.status(201).json({ id: inserted[0].id });
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
