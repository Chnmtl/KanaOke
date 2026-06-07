import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchRomaji } from '../api/romaji'
import type { LyricsLine } from '../types'

interface UseLyricsArgs {
  albumName?: string | null
  artistName: string | null
  durationMs?: number
  progressMs: number
  trackName: string | null
}

interface LrcLibResponse {
  albumName?: string | null
  artistName?: string | null
  duration?: number | null
  id?: number
  name?: string | null
  plainLyrics?: string | null
  syncedLyrics?: string | null
  trackName?: string | null
}

interface LyricsCacheEntry {
  fetchedHasSyncedLyrics: boolean
  fetchedLines: LyricsLine[]
  fetchedRomajiByLineId: Record<string, string>
  fetchedSourceDescription: string | null
  manualLyricsText: string
  updatedAt: number
}

const JAPANESE_TEXT_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const CACHE_PREFIX = 'japoncaegitim:lyrics-cache:v2'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1_000

const normalizeValue = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}]+/gu, '')

const hasJapaneseContent = (lyrics: string) => JAPANESE_TEXT_PATTERN.test(lyrics)

const buildTrackCacheKey = ({
  albumName,
  artistName,
  durationMs,
  trackName,
}: Pick<UseLyricsArgs, 'albumName' | 'artistName' | 'durationMs' | 'trackName'>) =>
  [
    normalizeValue(artistName),
    normalizeValue(trackName),
    normalizeValue(albumName),
    durationMs ? String(Math.round(durationMs / 1_000)) : '0',
  ].join('|')

const getCacheKey = (trackKey: string) => `${CACHE_PREFIX}:${trackKey || 'unknown'}`

const readLyricsCache = (trackKey: string) => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(getCacheKey(trackKey))

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue) as Partial<LyricsCacheEntry>

    if (typeof parsed.updatedAt !== 'number') {
      return null
    }

    if (Date.now() - parsed.updatedAt > CACHE_TTL_MS) {
      return null
    }

    return {
      fetchedHasSyncedLyrics: Boolean(parsed.fetchedHasSyncedLyrics),
      fetchedLines: Array.isArray(parsed.fetchedLines) ? parsed.fetchedLines : [],
      fetchedRomajiByLineId:
        parsed.fetchedRomajiByLineId && typeof parsed.fetchedRomajiByLineId === 'object'
          ? (parsed.fetchedRomajiByLineId as Record<string, string>)
          : {},
      fetchedSourceDescription:
        typeof parsed.fetchedSourceDescription === 'string'
          ? parsed.fetchedSourceDescription
          : null,
      manualLyricsText: typeof parsed.manualLyricsText === 'string' ? parsed.manualLyricsText : '',
      updatedAt: parsed.updatedAt,
    } satisfies LyricsCacheEntry
  } catch {
    return null
  }
}

const writeLyricsCache = (trackKey: string, entry: LyricsCacheEntry) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(getCacheKey(trackKey), JSON.stringify(entry))
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
}

const getJapaneseCharacterRatio = (lyrics: string) => {
  const nonWhitespaceLength = lyrics.replace(/\s+/g, '').length

  if (nonWhitespaceLength === 0) {
    return 0
  }

  const japaneseCharacterCount = lyrics.match(new RegExp(JAPANESE_TEXT_PATTERN.source, 'g'))?.length ?? 0
  return japaneseCharacterCount / nonWhitespaceLength
}

const scoreCandidate = (
  candidate: LrcLibResponse,
  {
    albumName,
    artistName,
    durationMs,
    trackName,
  }: Pick<UseLyricsArgs, 'albumName' | 'artistName' | 'durationMs' | 'trackName'>,
) => {
  const normalizedArtist = normalizeValue(artistName)
  const normalizedTrack = normalizeValue(trackName)
  const normalizedAlbum = normalizeValue(albumName)
  const candidateTrack = normalizeValue(candidate.trackName ?? candidate.name)
  const candidateArtist = normalizeValue(candidate.artistName)
  const candidateAlbum = normalizeValue(candidate.albumName)
  const lyrics = candidate.syncedLyrics?.trim() || candidate.plainLyrics?.trim() || ''
  const japaneseRatio = getJapaneseCharacterRatio(lyrics)
  const containsJapanese = hasJapaneseContent(lyrics)

  let score = 0

  if (normalizedTrack && candidateTrack) {
    if (candidateTrack === normalizedTrack) {
      score += 40
    } else if (
      candidateTrack.includes(normalizedTrack) ||
      normalizedTrack.includes(candidateTrack)
    ) {
      score += 20
    }
  }

  if (normalizedArtist && candidateArtist) {
    if (candidateArtist === normalizedArtist) {
      score += 30
    } else if (
      candidateArtist.includes(normalizedArtist) ||
      normalizedArtist.includes(candidateArtist)
    ) {
      score += 15
    }
  }

  if (normalizedAlbum && candidateAlbum) {
    if (candidateAlbum === normalizedAlbum) {
      score += 20
    } else if (
      candidateAlbum.includes(normalizedAlbum) ||
      normalizedAlbum.includes(candidateAlbum)
    ) {
      score += 10
    }
  }

  if (durationMs && candidate.duration) {
    const durationDeltaMs = Math.abs(durationMs - candidate.duration * 1_000)

    if (durationDeltaMs <= 1_500) {
      score += 35
    } else if (durationDeltaMs <= 5_000) {
      score += 20
    } else if (durationDeltaMs <= 10_000) {
      score += 10
    } else {
      score -= Math.min(20, Math.round(durationDeltaMs / 1_000))
    }
  }

  if (candidate.syncedLyrics?.trim()) {
    score += 10
  }

  if (!lyrics) {
    score -= 40
  }

  score += Math.round(japaneseRatio * 60)

  if (containsJapanese) {
    score += 80
  } else if (lyrics) {
    score -= 30
  }

  return score
}

const getBestCandidate = (
  candidates: LrcLibResponse[],
  criteria: Pick<UseLyricsArgs, 'albumName' | 'artistName' | 'durationMs' | 'trackName'>,
) => {
  const japaneseCandidates = candidates.filter((candidate) => {
    const lyrics = candidate.syncedLyrics?.trim() || candidate.plainLyrics?.trim() || ''
    return hasJapaneseContent(lyrics)
  })

  const prioritizedCandidates = japaneseCandidates.length > 0 ? japaneseCandidates : candidates

  return [...prioritizedCandidates].sort(
    (left, right) => scoreCandidate(right, criteria) - scoreCandidate(left, criteria),
  )[0]
}

const parseTimestampMs = (minutesText: string, secondsText: string, fractionText?: string) => {
  const minutes = Number(minutesText)
  const seconds = Number(secondsText)
  const milliseconds = fractionText
    ? Number(fractionText.padEnd(3, '0').slice(0, 3))
    : 0

  return minutes * 60_000 + seconds * 1_000 + milliseconds
}

const parseSyncedLyrics = (lyrics: string): LyricsLine[] => {
  const timestampPattern = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g

  return lyrics
    .split(/\r?\n/)
    .flatMap((rawLine, lineIndex) => {
      const text = rawLine.replace(timestampPattern, '').trim()
      const timestamps = [...rawLine.matchAll(timestampPattern)]

      return timestamps.map((match, timestampIndex) => ({
        id: `synced-${lineIndex}-${timestampIndex}`,
        text,
        timestampMs: parseTimestampMs(match[1], match[2], match[3]),
      }))
    })
    .filter((line) => line.text.length > 0)
    .sort((left, right) => (left.timestampMs ?? 0) - (right.timestampMs ?? 0))
}

const parsePlainLyrics = (lyrics: string): LyricsLine[] =>
  lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `plain-${index}`,
      text: line,
      timestampMs: null,
    }))

const buildRomajiByLineId = async (lines: LyricsLine[]): Promise<Record<string, string>> => {
  const romajiByText = await fetchRomaji(lines.map((line) => line.text))
  const result: Record<string, string> = {}

  for (const line of lines) {
    const romaji = romajiByText.get(line.text.trim())

    if (romaji) {
      result[line.id] = romaji
    }
  }

  return result
}

export const useLyrics = ({ albumName, artistName, durationMs, progressMs, trackName }: UseLyricsArgs) => {
  const [cachedLines, setCachedLines] = useState<LyricsLine[]>([])
  const [cachedHasSyncedLyrics, setCachedHasSyncedLyrics] = useState(false)
  const [cachedRomajiByLineId, setCachedRomajiByLineId] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceDescription, setSourceDescription] = useState<string | null>(null)
  const [manualLyricsText, setManualLyricsTextState] = useState('')
  const [loadedTrackKey, setLoadedTrackKey] = useState('')
  const [refreshCounter, setRefreshCounter] = useState(0)
  const hasTrack = Boolean(artistName && trackName)

  const trackCacheKey = useMemo(
    () => buildTrackCacheKey({ albumName, artistName, durationMs, trackName }),
    [albumName, artistName, durationMs, trackName],
  )

  const manualLyricsLines = useMemo(() => {
    const trimmedManualLyrics = manualLyricsText.trim()

    return trimmedManualLyrics ? parsePlainLyrics(trimmedManualLyrics) : null
  }, [manualLyricsText])

  const trackDataIsActive = loadedTrackKey === trackCacheKey && hasTrack
  const lines = useMemo(
    () => (trackDataIsActive ? manualLyricsLines ?? cachedLines : []),
    [cachedLines, manualLyricsLines, trackDataIsActive],
  )
  const hasSyncedLyrics = trackDataIsActive ? (manualLyricsLines ? false : cachedHasSyncedLyrics) : false
  const effectiveSourceDescription = trackDataIsActive
    ? manualLyricsLines
      ? 'Kullanıcı tarafından girilen sözler kullanılıyor.'
      : sourceDescription
    : null

  const applyCachedLyricsState = useCallback(
    (entry: LyricsCacheEntry) => {
      setCachedLines(entry.fetchedLines)
      setCachedHasSyncedLyrics(entry.fetchedHasSyncedLyrics)
      setCachedRomajiByLineId(new Map(Object.entries(entry.fetchedRomajiByLineId ?? {})))
      setManualLyricsTextState(entry.manualLyricsText)
      setSourceDescription(entry.fetchedSourceDescription)
      setLoadedTrackKey(trackCacheKey)
      setIsLoading(false)
      setError(null)
    },
    [trackCacheKey],
  )

  const applyEmptyLyricsState = useCallback(
    (message: string) => {
      const nextEmptyEntry: LyricsCacheEntry = {
        fetchedHasSyncedLyrics: false,
        fetchedLines: [],
        fetchedRomajiByLineId: {},
        fetchedSourceDescription: null,
        manualLyricsText: '',
        updatedAt: Date.now(),
      }

      setCachedLines([])
      setCachedHasSyncedLyrics(false)
      setCachedRomajiByLineId(new Map())
      setSourceDescription(null)
      writeLyricsCache(trackCacheKey, nextEmptyEntry)
      setLoadedTrackKey(trackCacheKey)
      setError(message)
      setIsLoading(false)
    },
    [trackCacheKey],
  )

  const setManualLyricsText = (value: string) => {
    setManualLyricsTextState(value)

    if (!hasTrack) {
      return
    }

    writeLyricsCache(trackCacheKey, {
      fetchedHasSyncedLyrics: cachedHasSyncedLyrics,
      fetchedLines: cachedLines,
      fetchedRomajiByLineId: Object.fromEntries(cachedRomajiByLineId),
      fetchedSourceDescription: sourceDescription,
      manualLyricsText: value,
      updatedAt: Date.now(),
    })
  }

  const clearManualLyricsText = () => {
    setManualLyricsText('')
  }

  const refreshLyrics = () => {
    setRefreshCounter((currentValue) => currentValue + 1)
  }

  useEffect(() => {
    if (!hasTrack || !artistName || !trackName) {
      return
    }

    const cachedEntry = readLyricsCache(trackCacheKey)

    if (cachedEntry) {
      queueMicrotask(() => {
        applyCachedLyricsState(cachedEntry)
      })
      return
    }

    const controller = new AbortController()

    const fetchLyrics = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          artist_name: artistName,
          track_name: trackName,
        })

        const response = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
          signal: controller.signal,
        })

        if (response.status === 404) {
          applyEmptyLyricsState('Bu parça için LRCLIB üzerinde söz bulunamadı.')
          return
        }

        if (!response.ok) {
          throw new Error(`LRCLIB hatası: ${response.status}`)
        }

        let payload = (await response.json()) as LrcLibResponse[]

        if (payload.length === 0) {
          const fallbackResponse = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
            signal: controller.signal,
          })

          if (fallbackResponse.status === 404) {
            applyEmptyLyricsState('Bu parça için LRCLIB üzerinde söz bulunamadı.')
            return
          }

          if (!fallbackResponse.ok) {
            throw new Error(`LRCLIB hatası: ${fallbackResponse.status}`)
          }

          payload = [(await fallbackResponse.json()) as LrcLibResponse]
        }

        const bestCandidate = getBestCandidate(payload, {
          albumName,
          artistName,
          durationMs,
          trackName,
        })

        if (!bestCandidate) {
          applyEmptyLyricsState('Bu parça için LRCLIB üzerinde uygun söz bulunamadı.')
          return
        }

        const syncedLyrics = bestCandidate.syncedLyrics?.trim()
        const plainLyrics = bestCandidate.plainLyrics?.trim()
        const lyricType = syncedLyrics ? 'senkronize' : 'plain'
        const nextLines = syncedLyrics ? parseSyncedLyrics(syncedLyrics) : parsePlainLyrics(plainLyrics ?? '')

        const fetchedRomajiByLineId = await buildRomajiByLineId(nextLines)
        const hasRomaji = Object.keys(fetchedRomajiByLineId).length > 0

        const sourceMessage =
          payload.length > 1
            ? `LRCLIB ${payload.length} aday arasından isim, sanatçı, albüm, süre ve Japonca içerik skoruna göre ${lyricType} kayıt seçildi.${hasRomaji ? ' Romaji okumaları otomatik eklendi.' : ''}`
            : `LRCLIB ${lyricType} kayıt kullanıldı.${hasRomaji ? ' Romaji okumaları otomatik eklendi.' : ''}`
        const nextEntry: LyricsCacheEntry = {
          fetchedHasSyncedLyrics: Boolean(syncedLyrics),
          fetchedLines: nextLines,
          fetchedRomajiByLineId,
          fetchedSourceDescription: sourceMessage,
          manualLyricsText,
          updatedAt: Date.now(),
        }

        applyCachedLyricsState(nextEntry)
        writeLyricsCache(trackCacheKey, nextEntry)

        if (!syncedLyrics && !plainLyrics) {
          setError('Şarkı sözü verisi boş döndü.')
        }
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Şarkı sözleri alınamadı.')
        setCachedLines([])
        setCachedHasSyncedLyrics(false)
        setSourceDescription(null)
        setLoadedTrackKey(trackCacheKey)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchLyrics()

    return () => {
      controller.abort()
    }
  }, [
    albumName,
    applyCachedLyricsState,
    applyEmptyLyricsState,
    artistName,
    durationMs,
    hasTrack,
    manualLyricsText,
    refreshCounter,
    trackCacheKey,
    trackName,
  ])

  const activeLineIndex = useMemo(() => {
    if (!trackDataIsActive || !hasSyncedLyrics || lines.length === 0) {
      return -1
    }

    let activeIndex = -1

    lines.forEach((line, index) => {
      if (line.timestampMs !== null && progressMs >= line.timestampMs) {
        activeIndex = index
      }
    })

    return activeIndex
  }, [hasSyncedLyrics, lines, progressMs, trackDataIsActive])

  return {
    activeLineIndex,
    clearManualLyricsText,
    error: hasTrack ? error : null,
    hasSyncedLyrics: hasTrack ? hasSyncedLyrics : false,
    isLoading: hasTrack ? isLoading : false,
    isUsingManualLyrics: hasTrack ? Boolean(manualLyricsText.trim()) : false,
    lines: hasTrack ? lines : [],
    manualLyricsText: trackDataIsActive ? manualLyricsText : '',
    refreshLyrics,
    romajiByLineId: hasTrack ? cachedRomajiByLineId : new Map<string, string>(),
    setManualLyricsText,
    sourceDescription: hasTrack ? effectiveSourceDescription : null,
  }
}
