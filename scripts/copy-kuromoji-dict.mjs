// Copies the kuromoji dictionary into public/dict so Vite serves it at /dict in
// both dev and build (the browser build of kuroshiro fetches the dict over HTTP).
// Runs from predev/prebuild; skips work when the dict is already in place.
import { cp, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const sourceDir = resolve(here, '..', 'node_modules', 'kuromoji', 'dict')
const targetDir = resolve(here, '..', 'public', 'dict')

if (!existsSync(sourceDir)) {
  console.error(`[copy-kuromoji-dict] Source dictionary not found at ${sourceDir}.`)
  process.exit(1)
}

const sourceFiles = await readdir(sourceDir)
const alreadyCopied =
  existsSync(targetDir) && (await readdir(targetDir)).length >= sourceFiles.length

if (alreadyCopied) {
  console.log('[copy-kuromoji-dict] Dictionary already present in public/dict; skipping.')
  process.exit(0)
}

await mkdir(targetDir, { recursive: true })
await cp(sourceDir, targetDir, { recursive: true })
console.log(`[copy-kuromoji-dict] Copied ${sourceFiles.length} dictionary files to public/dict.`)
