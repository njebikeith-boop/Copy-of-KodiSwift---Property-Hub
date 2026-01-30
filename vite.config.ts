import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load variables from .env files
  // Third param '' loads all variables regardless of VITE_ prefix
  const env = loadEnv(mode, process.cwd(), '');

  /**
   * Resolve keys prioritizing system environment variables.
   * On many hosting providers, vars are provided in process.env but might not have VITE_ prefix.
   */
  const API_KEY = env.VITE_API_KEY || env.API_KEY || process.env.API_KEY || process.env.VITE_API_KEY || '';
  const VITE_API_URL = env.VITE_API_URL || env.API_URL || process.env.VITE_API_URL || process.env.API_URL || '';
  
  // Vercel Postgres Variables
  const POSTGRES_URL = env.POSTGRES_URL || process.env.POSTGRES_URL || '';
  const POSTGRES_USER = env.POSTGRES_USER || process.env.POSTGRES_USER || '';
  const POSTGRES_HOST = env.POSTGRES_HOST || process.env.POSTGRES_HOST || '';
  const POSTGRES_PASSWORD = env.POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD || '';
  const POSTGRES_DATABASE = env.POSTGRES_DATABASE || process.env.POSTGRES_DATABASE || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(API_KEY),
      'process.env.VITE_API_URL': JSON.stringify(VITE_API_URL),
      'process.env.POSTGRES_URL': JSON.stringify(POSTGRES_URL),
      'process.env.POSTGRES_USER': JSON.stringify(POSTGRES_USER),
      'process.env.POSTGRES_HOST': JSON.stringify(POSTGRES_HOST),
      'process.env.POSTGRES_PASSWORD': JSON.stringify(POSTGRES_PASSWORD),
      'process.env.POSTGRES_DATABASE': JSON.stringify(POSTGRES_DATABASE),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: './index.html'
        }
      }
    }
  };
});