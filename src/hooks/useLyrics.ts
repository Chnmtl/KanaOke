import { useEffect, useMemo, useState } from 'react'
import type { LyricsLine } from '../types'

interface UseLyricsArgs {
  artistName: string | null
  progressMs: number
  trackName: string | null
}

interface LrcLibResponse {
  plainLyrics?: string | null
  syncedLyrics?: string | null
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

export const useLyrics = ({ artistName, progressMs, trackName }: UseLyricsArgs) => {
  const [lines, setLines] = useState<LyricsLine[]>([])
  const [hasSyncedLyrics, setHasSyncedLyrics] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasTrack = Boolean(artistName && trackName)

  useEffect(() => {
    if (!hasTrack || !artistName || !trackName) {
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

        const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
          signal: controller.signal,
        })

        if (response.status === 404) {
          setLines([])
          setHasSyncedLyrics(false)
          setError('Bu parça için LRCLIB üzerinde söz bulunamadı.')
          return
        }

        if (!response.ok) {
          throw new Error(`LRCLIB hatası: ${response.status}`)
        }

        const payload = (await response.json()) as LrcLibResponse
        const syncedLyrics = payload.syncedLyrics?.trim()
        const plainLyrics = payload.plainLyrics?.trim()

        if (syncedLyrics) {
          setLines(parseSyncedLyrics(syncedLyrics))
          setHasSyncedLyrics(true)
          return
        }

        if (plainLyrics) {
          setLines(parsePlainLyrics(plainLyrics))
          setHasSyncedLyrics(false)
          return
        }

        setLines([])
        setHasSyncedLyrics(false)
        setError('Şarkı sözü verisi boş döndü.')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setError(error instanceof Error ? error.message : 'Şarkı sözleri alınamadı.')
        setLines([])
        setHasSyncedLyrics(false)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchLyrics()

    return () => {
      controller.abort()
    }
  }, [artistName, hasTrack, trackName])

  const activeLineIndex = useMemo(() => {
    if (!hasTrack || !hasSyncedLyrics || lines.length === 0) {
      return -1
    }

    let activeIndex = -1

    lines.forEach((line, index) => {
      if (line.timestampMs !== null && progressMs >= line.timestampMs) {
        activeIndex = index
      }
    })

    return activeIndex
  }, [hasSyncedLyrics, hasTrack, lines, progressMs])

  return {
    activeLineIndex,
    error: hasTrack ? error : null,
    hasSyncedLyrics: hasTrack ? hasSyncedLyrics : false,
    isLoading: hasTrack ? isLoading : false,
    lines: hasTrack ? lines : [],
  }
}
