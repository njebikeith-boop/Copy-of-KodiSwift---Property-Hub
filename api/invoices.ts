
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
    await client.sql`CREATE TABLE IF NOT EXISTS ks_invoices (id TEXT PRIMARY KEY, data JSONB NOT NULL);`;

    if (req.method === 'POST') {
      const i = req.body;
      await client.sql`INSERT INTO ks_invoices (id, data) VALUES (${i.id}, ${JSON.stringify(i)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;`;
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      await client.sql`DELETE FROM ks_invoices WHERE id = ${req.query.id as string};`;
      return res.status(200).json({ success: true });
    }
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}
