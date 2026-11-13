import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Immediate client-side invalidation of legacy caches containing stale transit API responses
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.delete('madrid-transporte-v1').catch(() => {});
  caches.delete('madrid-transporte-v2').catch(() => {});
  caches.delete('madrid-transporte-v3').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
