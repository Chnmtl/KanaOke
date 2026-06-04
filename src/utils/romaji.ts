import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'

// Shared with LyricsDisplay: detects whether a string contains Japanese
// (hiragana / katakana / kanji) so we skip romaji work for Latin titles.
export const JAPANESE_TEXT_PATTERN =
  /[぀-ヿ㐀-䶿一-鿿豈-﫿]/

const CACHE_PREFIX = 'japoncaegitim:romaji:v1'

const memoryCache = new Map<string, string>()

let kuroshiroPromise: Promise<Kuroshiro> | null = null

const initKuroshiro = async (): Promise<Kuroshiro> => {
  const kuroshiro = new Kuroshiro()
  // The kuromoji dictionary is served from /dict (see vite.config.ts).
  await kuroshiro.init(new KuromojiAnalyzer({ dictPath: '/dict' }))
  return kuroshiro
}

const getKuroshiro = () => {
  if (!kuroshiroPromise) {
    kuroshiroPromise = initKuroshiro().catch((error) => {
      // Reset so a later call can retry, then surface the failure to the caller.
      kuroshiroPromise = null
      throw error
    })
  }

  return kuroshiroPromise
}

const readPersistentCache = (text: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(`${CACHE_PREFIX}:${text}`)
  } catch {
    return null
  }
}

const writePersistentCache = (text: string, romaji: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(`${CACHE_PREFIX}:${text}`, romaji)
  } catch {
    // Ignore storage failures (quota / private mode).
  }
}

/**
 * Converts Japanese text to spaced Hepburn romaji using the offline kuromoji
 * dictionary. Returns '' for empty/non-Japanese text or when conversion fails,
 * so callers can render nothing extra without special-casing errors.
 */
export const convertToRomaji = async (text: string): Promise<string> => {
  const trimmed = text.trim()

  if (!trimmed || !JAPANESE_TEXT_PATTERN.test(trimmed)) {
    return ''
  }

  const cachedInMemory = memoryCache.get(trimmed)
  if (cachedInMemory !== undefined) {
    return cachedInMemory
  }

  const cachedInStorage = readPersistentCache(trimmed)
  if (cachedInStorage !== null) {
    memoryCache.set(trimmed, cachedInStorage)
    return cachedInStorage
  }

  try {
    const kuroshiro = await getKuroshiro()
    const romaji = await kuroshiro.convert(trimmed, {
      to: 'romaji',
      mode: 'spaced',
      romajiSystem: 'hepburn',
    })
    const normalized = romaji.trim()
    memoryCache.set(trimmed, normalized)
    writePersistentCache(trimmed, normalized)
    return normalized
  } catch {
    return ''
  }
}
