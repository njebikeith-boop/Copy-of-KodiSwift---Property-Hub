
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '@vercel/postgres';
import { crypto } from 'node:crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  try {
    const client = await db.connect();

    if (req.method === 'POST') {
      const { email, name, propertyName, propertyId } = req.body;
      if (!email || !propertyId) return res.status(400).json({ error: 'Incomplete payload.' });

      const token = crypto.randomUUID();
      await client.sql`INSERT INTO ks_invites (token, email, property_id, is_used) VALUES (${token}, ${email}, ${propertyId}, FALSE);`;
      const inviteLink = `https://www.kodiswift.space/auth?token=${token}`;

      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'KodiSwift Concierge <onboarding@kodiswift.space>',
            to: [email],
            subject: `Asset Partnership Activation: ${propertyName}`,
            html: `<h1>Jambo, ${name}</h1><p>Activate your dashboard here: <a href="${inviteLink}">${inviteLink}</a></p>`
          })
        });
      }
      return res.status(200).json({ success: true, token });
    }

    if (req.method === 'GET') {
      const { token } = req.query;
      const { rows } = await client.sql`SELECT email, property_id, is_used FROM ks_invites WHERE token = ${token as string} AND is_used = FALSE;`;
      if (rows.length === 0) return res.status(404).json({ error: 'Token invalid.' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PATCH') {
      const { token } = req.body;
      await client.sql`UPDATE ks_invites SET is_used = TRUE WHERE token = ${token};`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Invitation Engine Failed.' });
  }
}
