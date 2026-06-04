import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const zlibGunzipShim = fileURLToPath(new URL('./src/vendor/zlibjs-gunzip.js', import.meta.url))

// https://vite.dev/config/
// The kuromoji dictionary (used by kuroshiro for offline romaji) is copied into
// public/dict by scripts/copy-kuromoji-dict.mjs (predev/prebuild) and served at /dict.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // kuromoji's BrowserDictionaryLoader still calls path.join() at runtime to
      // build dict URLs, so provide a browser-safe path implementation.
      { find: 'path', replacement: 'path-browserify' },
      // zlibjs (pulled in by kuromoji's browser dict loader) is a UMD bundle that
      // attaches its API onto top-level `this`, which esbuild/rolldown turn into
      // undefined when bundling to ESM (-> "Cannot use 'in' operator to search for
      // 'Zlib' in undefined"). Route the bare specifier to a vendored copy whose
      // trailing `.call(this)` is rebound to a local scope object.
      { find: /^zlibjs\/bin\/gunzip\.min\.js$/, replacement: zlibGunzipShim },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
