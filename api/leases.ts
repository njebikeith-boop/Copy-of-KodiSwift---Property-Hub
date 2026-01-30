
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
    if (req.method === 'POST') {
      const l = req.body;
      await client.sql`INSERT INTO ks_leases (id, unit_id, data) VALUES (${l.id}, ${l.unitId}, ${JSON.stringify(l)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, unit_id = EXCLUDED.unit_id;`;
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      await client.sql`DELETE FROM ks_leases WHERE id = ${req.query.id as string} OR unit_id = ${req.query.unitId as string};`;
      return res.status(200).json({ success: true });
    }
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
}
