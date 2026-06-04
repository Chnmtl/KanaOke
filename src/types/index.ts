export interface SpotifyTrack {
  albumName?: string
  albumImageUrl?: string
  artist: string
  durationMs: number
  id: string
  isPlaying: boolean
  name: string
  progressMs: number
}

export interface LyricsLine {
  id: string
  text: string
  timestampMs: number | null
}

export interface KanjiDetail {
  character: string
  explanation: string
  kunyomi: string
  onyomi: string
  radical: string
}

export interface AnalysisWord {
  japanese: string
  kanji?: KanjiDetail | null
  meaning: string
  romaji: string
}

export interface AnalysisResult {
  romaji: string
  translation: string
  words: AnalysisWord[]
}

export interface AnalysisContext {
  artistName?: string | null
  lineIndex: number
  surroundingLines: string[]
  trackName?: string | null
}
