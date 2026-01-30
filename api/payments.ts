
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const client = await db.connect();
    await client.sql`CREATE TABLE IF NOT EXISTS ks_payments (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;

    if (req.method === 'POST') {
      const pay = req.body;
      await client.sql`INSERT INTO ks_payments (id, data) VALUES (${pay.id}, ${JSON.stringify(pay)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;`;
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      await client.sql`DELETE FROM ks_payments WHERE id = ${req.query.id as string};`;
      return res.status(200).json({ success: true });
    }
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}
