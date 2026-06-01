import type { SpotifyTrack } from '../types'

interface NowPlayingProps {
  isLoading: boolean
  onLogout: () => void
  track: SpotifyTrack | null
}

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const NowPlaying = ({ isLoading, onLogout, track }: NowPlayingProps) => {
  const progressRatio =
    track && track.durationMs > 0
      ? Math.min(100, (track.progressMs / track.durationMs) * 100)
      : 0

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-950/80 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {track?.albumImageUrl ? (
            <img
              src={track.albumImageUrl}
              alt={`${track.name} kapak görseli`}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800 text-2xl">
              🎵
            </div>
          )}
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">
              Now Playing
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {track?.name ?? (isLoading ? 'Spotify verisi yükleniyor...' : 'Çalan şarkı yok')}
            </h2>
            <p className="mt-1 text-gray-400">
              {track?.artist ??
                (isLoading ? 'Bağlantı kuruluyor...' : 'Spotify oynatıcısında aktif parça bulunamadı.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-full border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-emerald-400 hover:text-white"
        >
          Çıkış yap
        </button>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
            style={{ width: `${progressRatio}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm text-gray-400">
          <span>{formatDuration(track?.progressMs ?? 0)}</span>
          <span>{formatDuration(track?.durationMs ?? 0)}</span>
        </div>
      </div>
    </section>
  )
}
