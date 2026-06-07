import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Romaji is generated server-side by the analysis proxy (kuroshiro + kuromoji in
// Node), so the browser build needs no kuromoji dictionary, path shim, or zlib
// shim. See proxy/server.mjs (/api/romaji) and src/api/romaji.ts.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
