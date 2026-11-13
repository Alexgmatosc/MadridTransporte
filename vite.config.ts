import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import cercaniasHandler from './api/cercanias.ts'

function cercaniasDevApiPlugin(): Plugin {
  return {
    name: 'cercanias-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/cercanias', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'OPTIONS') {
          next();
          return;
        }
        void cercaniasHandler(req, res).catch((err: unknown) => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader(
              'Cache-Control',
              'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
            );
            res.end(
              JSON.stringify({
                error: 'Internal error in local Cercanías middleware.',
                details: err instanceof Error ? err.message : String(err),
              })
            );
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    cercaniasDevApiPlugin(),
  ],
  server: {
    proxy: {
      '/api/pmv': {
        target: 'https://www.emtmadrid.es',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pmv/, '/PMVVisor/pmv.aspx'),
      },
      '/api/metro': {
        target: 'https://serviciosapp.metromadrid.es',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/metro/, '/servicios/rest/teleindicadores'),
        headers: {
          Accept: 'application/json',
        },
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/@vis.gl')) {
            return 'vendor-maps';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
})
