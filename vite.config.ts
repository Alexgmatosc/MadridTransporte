import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
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
})
