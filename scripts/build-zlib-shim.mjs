// Regenerates src/vendor/zlibjs-gunzip.js from the installed zlibjs package.
//
// zlibjs/bin/gunzip.min.js (required by kuromoji's browser dict loader) is a UMD
// bundle that ends with `}).call(this)` and attaches its API onto that top-level
// `this`. Bundlers (esbuild/rolldown) turn top-level `this` into `undefined` for
// ESM, which crashes with "Cannot use 'in' operator to search for 'Zlib' in
// undefined". We rebind that single `.call(this)` to a local scope object and
// re-export it as a normal ESM module, which the bundler can process without the
// Vite-only `?raw` trick. The vendored output is committed so the alias in
// vite.config.ts resolves on a fresh clone; run this script after bumping zlibjs.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = resolve(here, '..', 'node_modules', 'zlibjs', 'bin', 'gunzip.min.js')
const targetPath = resolve(here, '..', 'src', 'vendor', 'zlibjs-gunzip.js')

const source = readFileSync(sourcePath, 'utf8')
const tail = '}).call(this);'
const tailIndex = source.lastIndexOf(tail)

if (tailIndex === -1) {
  console.error(`[build-zlib-shim] Expected trailing "${tail}" not found in ${sourcePath}.`)
  process.exit(1)
}

const body = `${source.slice(0, tailIndex)}}).call(__zlibScope);`
const header = [
  '// VENDORED from zlibjs/bin/gunzip.min.js (MIT, 2012 imaya).',
  '// Only change: the trailing UMD `.call(this)` is rebound to a local scope',
  '// object so the bundle works as an ESM module (esbuild/rolldown turn a real',
  '// top-level `this` into undefined). Regenerate via scripts/build-zlib-shim.mjs.',
  '/* eslint-disable */',
  'const __zlibScope = {};',
  '',
].join('\n')
const footer = '\nexport const Zlib = __zlibScope.Zlib;\nexport default __zlibScope;\n'

mkdirSync(dirname(targetPath), { recursive: true })
writeFileSync(targetPath, header + body + footer)
console.log(`[build-zlib-shim] Wrote ${targetPath}.`)
