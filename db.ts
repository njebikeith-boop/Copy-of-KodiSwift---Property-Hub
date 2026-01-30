
const LOCAL_STORAGE_KEY = 'ks_production_mirror_v1';

// Base URL for the API. In development/Vercel, it's relative. 
// For external mirrors (Netlify/Cloudflare), set this in your .env as VITE_API_URL
// Fix: Use process.env instead of import.meta.env to resolve TypeScript property missing error
const API_BASE = (process.env.VITE_API_URL || '').replace(/\/$/, '');

export const saveToLocalMirror = (data: any) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...data, lastSaved: new Date().toISOString() }));
  } catch (e) {}
};

export const loadFromLocalMirror = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
};

export const clearLocalMirror = () => localStorage.removeItem(LOCAL_STORAGE_KEY);

export const dbRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return response.ok ? await response.json() : null;
  } catch (error) { 
    console.error("Database Connection Failure:", error);
    return null; 
  }
};

export const api = {
  fetchEverything: () => dbRequest('/api/sync'),
  saveProperty: (data: any) => dbRequest('/api/properties', { method: 'POST', body: JSON.stringify(data) }),
  saveUser: (data: any) => dbRequest('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  saveTenant: (data: any) => dbRequest('/api/tenants', { method: 'POST', body: JSON.stringify(data) }),
  saveInvoice: (data: any) => dbRequest('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
  savePayment: (data: any) => dbRequest('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
  saveRequest: (data: any) => dbRequest('/api/requests', { method: 'POST', body: JSON.stringify(data) }),
  saveRole: (data: any) => dbRequest('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
  saveUnit: (data: any) => dbRequest('/api/units', { method: 'POST', body: JSON.stringify(data) }),
  saveLease: (data: any) => dbRequest('/api/leases', { method: 'POST', body: JSON.stringify(data) }),
  
  deleteProperty: (id: string) => dbRequest(`/api/properties?id=${id}`, { method: 'DELETE' }),
  deleteRequest: (id: string) => dbRequest(`/api/requests?id=${id}`, { method: 'DELETE' }),
  deleteInvoice: (id: string) => dbRequest(`/api/invoices?id=${id}`, { method: 'DELETE' }),
  deleteUser: (id: string) => dbRequest(`/api/users?id=${id}`, { method: 'DELETE' }),
  deleteUnit: (id: string) => dbRequest(`/api/units?id=${id}`, { method: 'DELETE' }),
  deleteLease: (id: string) => dbRequest(`/api/leases?id=${id}`, { method: 'DELETE' }),
  deletePayment: (id: string) => dbRequest(`/api/payments?id=${id}`, { method: 'DELETE' })
};
