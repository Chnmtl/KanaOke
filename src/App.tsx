import { useMemo, useState } from 'react'
import { analyzeJapaneseLine } from './api/githubModels'
import { AnalysisPanel } from './components/AnalysisPanel'
import { LyricsDisplay } from './components/LyricsDisplay'
import { NowPlaying } from './components/NowPlaying'
import { useLyrics } from './hooks/useLyrics'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer'
import type { AnalysisResult, LyricsLine } from './types'
import { clearGitHubToken, getGitHubToken, setGitHubToken } from './utils/githubToken'

const JAPANESE_TEXT_PATTERN =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

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
    error: lyricsError,
    hasSyncedLyrics,
    isLoading: isLyricsLoading,
    lines,
  } = useLyrics({
    artistName: player?.artist ?? null,
    progressMs: player?.progressMs ?? 0,
    trackName: player?.name ?? null,
  })
  const [selectedLine, setSelectedLine] = useState<LyricsLine | null>(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [githubTokenInput, setGithubTokenInput] = useState(getGitHubToken())
  const [hasGitHubToken, setHasGitHubToken] = useState(Boolean(getGitHubToken()))
  const isCurrentTrackSelection = selectedTrackId === (player?.id ?? null)
  const resolvedSelectedLine = isCurrentTrackSelection ? selectedLine : null
  const resolvedAnalysis = isCurrentTrackSelection ? analysis : null
  const resolvedAnalysisError = isCurrentTrackSelection ? analysisError : null
  const resolvedIsAnalyzing = isCurrentTrackSelection ? isAnalyzing : false

  const selectedLineIsJapanese = useMemo(
    () =>
      Boolean(
        resolvedSelectedLine?.text && JAPANESE_TEXT_PATTERN.test(resolvedSelectedLine.text),
      ),
    [resolvedSelectedLine],
  )

  const handleSelectLine = async (line: LyricsLine) => {
    setSelectedLine(line)
    setSelectedTrackId(player?.id ?? null)
    setAnalysis(null)

    if (!JAPANESE_TEXT_PATTERN.test(line.text)) {
      setAnalysisError('Sadece Japonca satırlar analiz edilebilir.')
      return
    }

    if (!hasGitHubToken) {
      setAnalysisError('GitHub Models token gerekli. Lütfen üstteki gizli alana token ekleyin.')
      return
    }

    setAnalysisError(null)
    setIsAnalyzing(true)

    try {
      const result = await analyzeJapaneseLine(line.text)
      setAnalysis(result)
    } catch (error) {
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
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <NowPlaying
          isLoading={isSpotifyLoading}
          onLogout={logout}
          track={player}
        />

        <section className="rounded-3xl border border-gray-800 bg-gray-950/80 p-5 shadow-xl shadow-black/20">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Güvenlik</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">GitHub Models token</h2>
          <p className="mt-3 text-sm text-gray-400">
            Token yalnızca bu tarayıcı oturumu boyunca saklanır ve repoya yazılmaz.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={githubTokenInput}
              onChange={(event) => setGithubTokenInput(event.target.value)}
              placeholder="github_pat_..."
              autoComplete="off"
              className="w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
            />
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
          <p className="mt-3 text-xs text-gray-500">
            Durum: {hasGitHubToken ? 'Token hazır' : 'Token girilmedi'}
          </p>
        </section>

        {(spotifyError || lyricsError) && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {spotifyError ?? lyricsError}
          </div>
        )}

        <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <LyricsDisplay
            activeLineIndex={activeLineIndex}
            hasSyncedLyrics={hasSyncedLyrics}
            isLoading={isLyricsLoading}
            lines={lines}
            onSelectLine={handleSelectLine}
            selectedLineId={resolvedSelectedLine?.id ?? null}
          />
          <AnalysisPanel
            analysis={resolvedAnalysis}
            error={resolvedAnalysisError}
            isAnalyzing={resolvedIsAnalyzing}
            isJapaneseLine={selectedLineIsJapanese}
            selectedLine={resolvedSelectedLine}
          />
        </section>
      </div>
    </main>
  )
}

export default App
