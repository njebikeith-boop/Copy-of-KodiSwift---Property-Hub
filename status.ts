
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isConfigured = !!process.env.RESEND_API_KEY;
  return res.status(200).json({ 
    mailRelayConfigured: isConfigured,
    protocol: 'RESEND_SMTP_RELAY',
    timestamp: new Date().toISOString()
  });
}
