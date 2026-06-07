import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { analyzeJapaneseLine } from './api/githubModels'
import { AnalysisPanel } from './components/AnalysisPanel'
import { CompactPlayer } from './components/CompactPlayer'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { LyricsDisplay } from './components/LyricsDisplay'
import { NowPlaying } from './components/NowPlaying'
import { useLyrics } from './hooks/useLyrics'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer'
import type { AnalysisResult, LyricsLine } from './types'
const ANALYSIS_CACHE_PREFIX = 'japoncaegitim:analysis-cache:v4'
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
  const { t } = useTranslation()
  const {
    player,
    error: spotifyError,
    isAuthenticated,
    isLoading: isSpotifyLoading,
    login,
    logout,
    playNext,
    playPrevious,
    seekTo,
    togglePlayback,
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
    romajiByLineId,
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
  // Below md the horizontal NowPlaying top row is hidden in favor of the fixed
  // bottom CompactPlayer, which can be toggled between compact and detailed.
  const [isBottomPlayerExpanded, setIsBottomPlayerExpanded] = useState(false)
  // On md+ the NowPlaying top row can be minimized to a slim bar to give the
  // lyrics/analysis panels more vertical room.
  const [isNowPlayingMinimized, setIsNowPlayingMinimized] = useState(false)
  const isCurrentTrackSelection = selectedTrackId === (player?.id ?? null)
  const resolvedSelectedLine = isCurrentTrackSelection ? selectedLine : null
  const resolvedAnalysis = isCurrentTrackSelection ? analysis : null
  const resolvedAnalysisError = isCurrentTrackSelection ? analysisError : null
  const resolvedAnalysisLoadSource = isCurrentTrackSelection ? analysisLoadSource : null
  const resolvedIsAnalyzing = isCurrentTrackSelection ? isAnalyzing : false
  const currentTrackId = player?.id ?? null
  const miniPlayerProgressRatio =
    player && player.durationMs > 0
      ? Math.min(100, (player.progressMs / player.durationMs) * 100)
      : 0

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
      lineIndex: lineIndex >= 0 ? lineIndex : 0,
      surroundingLines:
        lineIndex >= 0
          ? lines
              .slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 4))
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
        error instanceof Error ? error.message : t('analysis.unexpectedError'),
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-10 text-gray-100">
        <section className="w-full max-w-2xl rounded-3xl border border-gray-800 bg-gray-950/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">
              {t('auth.eyebrow')}
            </p>
            <LanguageSwitcher />
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            {t('auth.heading')}
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            {t('auth.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={login}
              disabled={isSpotifyLoading}
              className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
            >
              {isSpotifyLoading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </div>
          <ul className="mt-8 grid gap-3 text-sm text-gray-400 sm:grid-cols-3">
            <li className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              {t('auth.featureSecureLogin')}
            </li>
            <li className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              {t('auth.featureKaraoke')}
            </li>
            <li className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              {t('auth.featureAnalysis')}
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
    <main className="min-h-screen overflow-x-hidden bg-gray-900 text-gray-100">
      <div className="mx-auto min-h-screen px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
        <section className="flex flex-col gap-6 md:h-[calc(100dvh-3rem)] md:overflow-hidden">
          <div className="hidden shrink-0 md:block">
            <NowPlaying
              isLoading={isSpotifyLoading}
              isMinimized={isNowPlayingMinimized}
              onLogout={logout}
              onNext={playNext}
              onPrevious={playPrevious}
              onSeek={seekTo}
              onToggleMinimize={() => setIsNowPlayingMinimized((value) => !value)}
              onTogglePlayback={togglePlayback}
              track={player}
            />
          </div>

          {(spotifyError || lyricsError) && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {spotifyError ?? lyricsError}
            </div>
          )}

          <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-2 md:overflow-hidden">
            <div className="h-[65dvh] min-h-0 md:h-auto">
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
                romajiByLineId={romajiByLineId}
                onManualLyricsChange={setManualLyricsText}
                onRefreshLyrics={refreshLyrics}
                selectedLineId={resolvedSelectedLine?.id ?? null}
                isUsingManualLyrics={isUsingManualLyrics}
                sourceDescription={sourceDescription}
              />
            </div>
            <div className="h-[55dvh] min-h-0 md:h-auto">
              <AnalysisPanel
                analysis={resolvedAnalysis}
                error={resolvedAnalysisError}
                isAnalyzing={resolvedIsAnalyzing}
                analysisSource={resolvedAnalysisLoadSource}
                selectedLine={resolvedSelectedLine}
              />
            </div>
          </div>
        </section>
      </div>

      <CompactPlayer
        className="fixed bottom-0 left-0 z-50 w-screen md:hidden"
        isExpanded={isBottomPlayerExpanded}
        isLoading={isSpotifyLoading}
        onLogout={logout}
        onNext={playNext}
        onPrevious={playPrevious}
        onSeek={seekTo}
        onToggleExpand={() => setIsBottomPlayerExpanded((value) => !value)}
        onTogglePlayback={togglePlayback}
        progressRatio={miniPlayerProgressRatio}
        track={player}
      />
    </main>
  )
}

export default App
