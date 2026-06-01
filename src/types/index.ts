export interface SpotifyTrack {
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
  aciklama: string
  karakter: string
  kunyomi: string
  onyomi: string
  radikal: string
}

export interface AnalysisWord {
  anlam: string
  japonca: string
  kanji?: KanjiDetail | null
  romaji: string
}

export interface AnalysisResult {
  his: string
  kelimeler: AnalysisWord[]
  romaji: string
  turkce: string
}
