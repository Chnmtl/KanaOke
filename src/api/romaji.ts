// Romaji readings come from the local analysis proxy (kuroshiro + kuromoji
// running in Node). The browser ships no Japanese-processing code: it just
// batches text to POST /api/romaji and caches the results. Falls back to '' so
// callers render the original text unchanged when the proxy is unavailable.

const ROMAJI_API_URL = import.meta.env.VITE_ROMAJI_API_URL?.trim()
const CACHE_PREFIX = 'japoncaegitim:romaji:v2'

// Hiragana / katakana / kanji. Skip the network for Latin-only text.
const JAPANESE_TEXT_PATTERN = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/

const memoryCache = new Map<string, string>()

const readCache = (text: string): string | null => {
  const cached = memoryCache.get(text)

  if (cached !== undefined) {
    return cached
  }

  try {
    return window.localStorage.getItem(`${CACHE_PREFIX}:${text}`)
  } catch {
    return null
  }
}

const writeCache = (text: string, romaji: string) => {
  memoryCache.set(text, romaji)

  try {
    window.localStorage.setItem(`${CACHE_PREFIX}:${text}`, romaji)
  } catch {
    // Ignore storage quota / private-mode errors.
  }
}

/**
 * Resolves romaji for a batch of texts, returning a Map keyed by the original
 * (trimmed) text. Cached and non-Japanese entries never hit the network;
 * everything else is requested in a single proxy call.
 */
export const fetchRomaji = async (texts: string[]): Promise<Map<string, string>> => {
  const result = new Map<string, string>()
  const uniqueTexts = [...new Set(texts.map((text) => text?.trim() ?? '').filter(Boolean))]
  const missing: string[] = []

  for (const text of uniqueTexts) {
    if (!JAPANESE_TEXT_PATTERN.test(text)) {
      result.set(text, '')
      continue
    }

    const cached = readCache(text)

    if (cached !== null) {
      memoryCache.set(text, cached)
      result.set(text, cached)
    } else {
      missing.push(text)
    }
  }

  if (missing.length === 0) {
    return result
  }

  if (!ROMAJI_API_URL) {
    for (const text of missing) {
      result.set(text, '')
    }

    return result
  }

  try {
    const response = await fetch(ROMAJI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: missing }),
    })

    const payload = response.ok ? ((await response.json()) as { romaji?: unknown }) : null
    const romajiList = Array.isArray(payload?.romaji) ? payload.romaji : []

    missing.forEach((text, index) => {
      const romaji = typeof romajiList[index] === 'string' ? (romajiList[index] as string) : ''
      writeCache(text, romaji)
      result.set(text, romaji)
    })
  } catch {
    for (const text of missing) {
      result.set(text, '')
    }
  }

  return result
}

/**
 * Convenience wrapper for a single piece of text (track / artist / album name).
 * Returns '' for empty, non-Japanese, or when the proxy is unreachable.
 */
export const convertToRomaji = async (text: string | null | undefined): Promise<string> => {
  const trimmed = text?.trim() ?? ''

  if (!trimmed) {
    return ''
  }

  const romajiByText = await fetchRomaji([trimmed])
  return romajiByText.get(trimmed) ?? ''
}
