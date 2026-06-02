import { useMemo, useState } from 'react'
import { analyzeJapaneseLine } from './api/githubModels'
import { AnalysisPanel } from './components/AnalysisPanel'
import { LyricsDisplay } from './components/LyricsDisplay'
import { NowPlaying } from './components/NowPlaying'
import { useLyrics } from './hooks/useLyrics'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer'
import type { AnalysisResult, LyricsLine } from './types'
import { clearGitHubToken, getGitHubToken, setGitHubToken } from './utils/githubToken'

const ANALYSIS_CACHE_PREFIX = 'japoncaegitim:analysis-cache:v2'
const ANALYSIS_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1_000

const normalizeAnalysisLineText = (lineText: string) =>
  lineText.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR')

const getAnalysisCacheKey = (trackId: string, lineText: string) =>
  `${ANALYSIS_CACHE_PREFIX}:${trackId}:${normalizeAnalysisLineText(lineText)}`

const readAnalysisCache = (trackId: string, lineText: string) => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(getAnalysisCacheKey(trackId, lineText))

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue) as { analysis?: AnalysisResult; updatedAt?: number }

    if (!parsed.updatedAt || Date.now() - parsed.updatedAt > ANALYSIS_CACHE_TTL_MS) {
      return null
    }

    return parsed.analysis ?? null
  } catch {
    return null
  }
}

const writeAnalysisCache = (trackId: string, lineText: string, analysis: AnalysisResult) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      getAnalysisCacheKey(trackId, lineText),
      JSON.stringify({ analysis, updatedAt: Date.now() }),
    )
  } catch {
    // Ignore storage failures.
  }
}

function App() {
  const {
    player,
    error: spotifyError,
    isAuthenticated,
    isLoading: isSpotifyLoading,
    login,
    logout,
  } = useSpotifyPlayer()
  const {
    activeLineIndex,
    clearManualLyricsText,
    error: lyricsError,
    hasSyncedLyrics,
    isLoading: isLyricsLoading,
    isUsingManualLyrics,
    lines,
    manualLyricsText,
    refreshLyrics,
    setManualLyricsText,
    sourceDescription,
  } = useLyrics({
    albumName: player?.albumName ?? null,
    artistName: player?.artist ?? null,
    durationMs: player?.durationMs ?? 0,
    progressMs: player?.progressMs ?? 0,
    trackName: player?.name ?? null,
  })
  const [selectedLine, setSelectedLine] = useState<LyricsLine | null>(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisLoadSource, setAnalysisLoadSource] = useState<'cache' | 'api' | null>(null)
  const [analysisCacheRevision, setAnalysisCacheRevision] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [githubTokenInput, setGithubTokenInput] = useState(getGitHubToken())
  const [hasGitHubToken, setHasGitHubToken] = useState(Boolean(getGitHubToken()))
  const hasAnalysisProxy = Boolean(import.meta.env.VITE_ANALYSIS_API_URL?.trim())
  const isCurrentTrackSelection = selectedTrackId === (player?.id ?? null)
  const resolvedSelectedLine = isCurrentTrackSelection ? selectedLine : null
  const resolvedAnalysis = isCurrentTrackSelection ? analysis : null
  const resolvedAnalysisError = isCurrentTrackSelection ? analysisError : null
  const resolvedAnalysisLoadSource = isCurrentTrackSelection ? analysisLoadSource : null
  const resolvedIsAnalyzing = isCurrentTrackSelection ? isAnalyzing : false
  const currentTrackId = player?.id ?? null

  const cachedAnalysisByLineId = useMemo(() => {
    const cachedAnalyses = new Map<string, AnalysisResult>()
    const cachedAnalysesByNormalizedText = new Map<string, AnalysisResult>()

    if (!currentTrackId) {
      return cachedAnalyses
    }

    for (const line of lines) {
      const normalizedLineText = normalizeAnalysisLineText(line.text)
      const cachedAnalysis =
        cachedAnalysesByNormalizedText.get(normalizedLineText) ??
        readAnalysisCache(currentTrackId, line.text)

      if (cachedAnalysis) {
        cachedAnalysesByNormalizedText.set(normalizedLineText, cachedAnalysis)
        cachedAnalyses.set(line.id, cachedAnalysis)
      }
    }

    return cachedAnalyses
  }, [analysisCacheRevision, currentTrackId, lines])

  const cachedAnalysisLineIds = useMemo(
    () => new Set(cachedAnalysisByLineId.keys()),
    [cachedAnalysisByLineId],
  )

  const handleSelectLine = async (line: LyricsLine) => {
    setSelectedLine(line)
    setSelectedTrackId(player?.id ?? null)
    setAnalysis(null)
    setAnalysisError(null)
    setAnalysisLoadSource(null)
    setIsAnalyzing(false)

    const lineIndex = lines.findIndex((candidate) => candidate.id === line.id)
    const trackId = player?.id ?? ''
    const lineContext = {
      artistName: player?.artist ?? null,
      fullLyrics: lines.map((candidate) => candidate.text).join('\n'),
      lineIndex: lineIndex >= 0 ? lineIndex : 0,
      surroundingLines:
        lineIndex >= 0
          ? lines
              .slice(Math.max(0, lineIndex - 2), Math.min(lines.length, lineIndex + 3))
              .map((candidate) => candidate.text)
          : [line.text],
      trackName: player?.name ?? null,
    }

    const cachedAnalysis = currentTrackId ? readAnalysisCache(trackId, line.text) : null

    if (cachedAnalysis) {
      setAnalysis(cachedAnalysis)
      setAnalysisLoadSource('cache')
      setAnalysisError(null)
      setIsAnalyzing(false)
      return
    }

    setIsAnalyzing(true)

    try {
      const result = await analyzeJapaneseLine(line.text, lineContext)
      setAnalysis(result)
      setAnalysisLoadSource('api')
      if (currentTrackId) {
        writeAnalysisCache(trackId, line.text, result)
        setAnalysisCacheRevision((currentValue) => currentValue + 1)
      }
    } catch (error) {
      setAnalysisLoadSource(null)
      setAnalysisError(
        error instanceof Error ? error.message : 'Analiz sırasında beklenmeyen bir hata oluştu.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSaveToken = () => {
    const sanitizedToken = githubTokenInput.trim()

    if (!sanitizedToken) {
      setAnalysisError('Boş token kaydedilemez.')
      return
    }

    setGitHubToken(sanitizedToken)
    setHasGitHubToken(true)
    setAnalysisError(null)
  }

  const handleClearToken = () => {
    clearGitHubToken()
    setGithubTokenInput('')
    setHasGitHubToken(false)
    setAnalysisError(null)
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-10 text-gray-100">
        <section className="w-full max-w-2xl rounded-3xl border border-gray-800 bg-gray-950/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">
            Japonca Şarkı Öğrenme
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            Spotify ile giriş yap ve şarkı sözlerini anlık incele
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Spotify&apos;da çalan parçayı algıla, LRCLIB senkronize sözlerini takip et ve
            Japonca satırları sağ panelde analiz et.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={login}
              disabled={isSpotifyLoading}
              className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
            >
              {isSpotifyLoading ? 'Spotify bağlanıyor...' : 'Spotify ile giriş yap'}
            </button>
          </div>
          <ul className="mt-8 grid gap-3 text-sm text-gray-400 sm:grid-cols-3">
            <li className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              OAuth 2.0 PKCE ile güvenli istemci girişi
            </li>
            <li className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              LRCLIB ile senkronize karaoke takibi
            </li>
            <li className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              GitHub Models API ile romaji ve Türkçe analiz
            </li>
          </ul>
          {spotifyError ? (
            <p className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {spotifyError}
            </p>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100">
      <div className="mx-auto min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-6 xl:h-[calc(100dvh-3rem)] xl:grid-cols-12 xl:overflow-hidden">
          <div className="flex min-h-0 flex-col gap-6 xl:col-span-10 xl:overflow-hidden">
            {(spotifyError || lyricsError) && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {spotifyError ?? lyricsError}
              </div>
            )}

            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-5 xl:overflow-hidden">
              <div className="min-h-0 lg:col-span-3">
                <LyricsDisplay
                  activeLineIndex={activeLineIndex}
                  clearManualLyricsText={clearManualLyricsText}
                  hasSyncedLyrics={hasSyncedLyrics}
                  isLoading={isLyricsLoading}
                  cachedAnalysisByLineId={cachedAnalysisByLineId}
                  cachedAnalysisLineIds={cachedAnalysisLineIds}
                  lines={lines}
                  manualLyricsText={manualLyricsText}
                  onSelectLine={handleSelectLine}
                  onManualLyricsChange={setManualLyricsText}
                  onRefreshLyrics={refreshLyrics}
                  selectedLineId={resolvedSelectedLine?.id ?? null}
                  isUsingManualLyrics={isUsingManualLyrics}
                  sourceDescription={sourceDescription}
                />
              </div>
              <div className="min-h-0 lg:col-span-2">
                <AnalysisPanel
                  analysis={resolvedAnalysis}
                  error={resolvedAnalysisError}
                  isAnalyzing={resolvedIsAnalyzing}
                  analysisSource={resolvedAnalysisLoadSource}
                  selectedLine={resolvedSelectedLine}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 xl:col-span-2 xl:overflow-hidden">
            <div className="flex h-full min-h-0 flex-col gap-6">
              <section className="rounded-3xl border border-gray-800 bg-gray-950/80 p-5 shadow-xl shadow-black/20">
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Güvenlik</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">GitHub Models token</h2>
                <p className="mt-3 text-sm text-gray-400">
                  {hasAnalysisProxy
                    ? 'Backend proxy etkin. İstersen geçici istemci testi için yine de token girebilirsin.'
                    : 'Proxy yoksa token yalnızca bu tarayıcı oturumu boyunca saklanır ve repoya yazılmaz.'}
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <input
                    type="password"
                    value={githubTokenInput}
                    onChange={(event) => setGithubTokenInput(event.target.value)}
                    placeholder="github_pat_..."
                    autoComplete="off"
                    className="w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleSaveToken}
                      className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={handleClearToken}
                      className="rounded-2xl border border-gray-700 px-4 py-3 text-sm font-medium text-gray-200 transition hover:border-red-400 hover:text-white"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Durum: {hasAnalysisProxy ? 'Proxy hazır' : hasGitHubToken ? 'Token hazır' : 'Token girilmedi'}
                </p>
              </section>

              <NowPlaying
                isLoading={isSpotifyLoading}
                onLogout={logout}
                track={player}
                className="flex-1"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
