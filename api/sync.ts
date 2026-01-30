
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for Mirror Support
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
    
    // Ensure all tables exist
    await client.sql`CREATE TABLE IF NOT EXISTS ks_properties (id TEXT PRIMARY KEY, name TEXT, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_tenants (id TEXT PRIMARY KEY, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_users (id TEXT PRIMARY KEY, email TEXT UNIQUE, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_invoices (id TEXT PRIMARY KEY, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_payments (id TEXT PRIMARY KEY, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_requests (id TEXT PRIMARY KEY, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_roles (id TEXT PRIMARY KEY, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_units (id TEXT PRIMARY KEY, property_id TEXT, data JSONB NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS ks_leases (id TEXT PRIMARY KEY, unit_id TEXT, data JSONB NOT NULL);`;

    const [props, tenants, users, invoices, payments, requests, roles, units, leases] = await Promise.all([
      client.sql`SELECT data FROM ks_properties;`,
      client.sql`SELECT data FROM ks_tenants;`,
      client.sql`SELECT data FROM ks_users;`,
      client.sql`SELECT data FROM ks_invoices;`,
      client.sql`SELECT data FROM ks_payments;`,
      client.sql`SELECT data FROM ks_requests;`,
      client.sql`SELECT data FROM ks_roles;`,
      client.sql`SELECT data FROM ks_units;`,
      client.sql`SELECT data FROM ks_leases;`
    ]);

    return res.status(200).json({
      properties: props.rows.map(r => r.data),
      tenants: tenants.rows.map(r => r.data),
      users: users.rows.map(r => r.data),
      invoices: invoices.rows.map(r => r.data),
      payments: payments.rows.map(r => r.data),
      systemRequests: requests.rows.map(r => r.data),
      roles: roles.rows.map(r => r.data),
      units: units.rows.map(r => r.data),
      leases: leases.rows.map(r => r.data)
    });
  } catch (error: any) { 
    return res.status(500).json({ error: error.message }); 
  }
}
