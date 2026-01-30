const LOCAL_STORAGE_KEY = 'ks_production_mirror_v1';

/**
 * MIRROR LOGIC: 
 * Resolves the backend API URL. 
 * CRITICAL: We use 'process.env.VITE_API_URL' directly (without casting to any) 
 * so Vite's 'define' plugin can perform static string replacement during build.
 */
const getApiBase = () => {
  try {
    // Vite replaces this literal string with the actual value from the define block
    const envUrl = process.env.VITE_API_URL;
    if (typeof envUrl === 'string' && envUrl.length > 5 && envUrl !== 'undefined') {
      return envUrl.replace(/\/$/, '');
    }
  } catch (e) {}
  return '';
};

const API_BASE = getApiBase();

/**
 * Robust detection: If it's not a known local dev address, it's a remote deployment.
 */
const IS_REMOTE = typeof window !== 'undefined' && 
  !['localhost', '127.0.0.1', '0.0.0.0', ''].includes(window.location.hostname);

// Diagnostic logging for the browser console
if (IS_REMOTE) {
  if (!API_BASE) {
    console.warn("%c MIRROR PROTOCOL: Configuration Missing ", "background: #f59e0b; color: black; font-weight: bold; padding: 2px 5px; border-radius: 4px;");
    console.log("Remote environment detected (Host: " + window.location.hostname + ").");
    console.log("VITE_API_URL is missing or undefined. Mirror protocol will NOT make relative calls to the frontend host to avoid 404 errors.");
    console.log("Action Required: Set VITE_API_URL in your deployment environment variables.");
  } else {
    console.log("%c MIRROR PROTOCOL: Linked to " + API_BASE, "background: #3b82f6; color: white; font-weight: bold; padding: 2px 5px; border-radius: 4px;");
  }
}

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

/**
 * Unified database request handler with Mirror Protocol support.
 */
export const dbRequest = async (endpoint: string, options: RequestInit = {}) => {
  let url = '';
  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : "/" + endpoint;
    
    // Determine the target URL
    if (API_BASE) {
      url = API_BASE + cleanEndpoint;
    } else if (!IS_REMOTE) {
      // Local development allows relative paths to the Vite dev server / proxy
      url = cleanEndpoint;
    } else {
      // Remote production requires a base URL.
      // We return null immediately to prevent a 404 fetch call to the static host.
      return null;
    }

    const response = await fetch(url, {
      ...options,
      headers: { 
        'Content-Type': 'application/json',
        ...options.headers 
      },
    });
    
    if (response.ok) {
      if (endpoint === '/api/sync' || endpoint === 'api/sync') {
        console.log("%c MIRROR PROTOCOL: Handshake Successful. ", "background: #059669; color: white; font-weight: bold; border-radius: 4px; padding: 2px 5px;");
      }
      return await response.json();
    } else {
      console.error("MIRROR PROTOCOL: Endpoint returned " + response.status + " for " + url);
    }
    return null;
  } catch (error) { 
    if (url) {
      console.error("MIRROR PROTOCOL: Connection failure to " + url);
    }
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
  
  deleteProperty: (id: string) => dbRequest("/api/properties?id=" + id, { method: 'DELETE' }),
  deleteRequest: (id: string) => dbRequest("/api/requests?id=" + id, { method: 'DELETE' }),
  deleteInvoice: (id: string) => dbRequest("/api/invoices?id=" + id, { method: 'DELETE' }),
  deleteUser: (id: string) => dbRequest("/api/users?id=" + id, { method: 'DELETE' }),
  deleteUnit: (id: string) => dbRequest("/api/units?id=" + id, { method: 'DELETE' }),
  deleteLease: (id: string) => dbRequest("/api/leases?id=" + id, { method: 'DELETE' }),
  deletePayment: (id: string) => dbRequest("/api/payments?id=" + id, { method: 'DELETE' })
};