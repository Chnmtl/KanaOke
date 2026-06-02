import { LogoutIcon, MusicNoteIcon } from './icons'
import type { SpotifyTrack } from '../types'

interface NowPlayingProps {
  className?: string
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

export const NowPlaying = ({ className = '', isLoading, onLogout, track }: NowPlayingProps) => {
  const progressRatio =
    track && track.durationMs > 0
      ? Math.min(100, (track.progressMs / track.durationMs) * 100)
      : 0
  const trackName = track?.name ?? (isLoading ? 'Spotify verisi yükleniyor...' : 'Çalan şarkı yok')
  const artistName =
    track?.artist ??
    (isLoading ? 'Bağlantı kuruluyor...' : 'Spotify oynatıcısında aktif parça bulunamadı.')

  return (
    <section
      className={`${className} flex min-h-0 flex-col rounded-3xl border border-gray-800 bg-[#020B1F] p-4 shadow-xl shadow-black/20`}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#0E1D3B] bg-[#000A1A]">
        <button
          type="button"
          onClick={onLogout}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#27365A] bg-[#09142A]/90 text-gray-200 transition hover:border-emerald-400 hover:text-white"
          title="Çıkış yap"
          aria-label="Çıkış yap"
        >
          <LogoutIcon className="h-4 w-4" aria-hidden="true" />
        </button>

        {track?.albumImageUrl ? (
          <img
            src={track.albumImageUrl}
            alt={`${track.name} kapak görseli`}
            className="aspect-square w-full shrink-0 rounded-b-[2rem] object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full shrink-0 items-center justify-center rounded-b-[2rem] bg-[#12264A] text-5xl text-cyan-200">
            <MusicNoteIcon className="h-14 w-14" aria-hidden="true" />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-5 sm:px-5 sm:pb-5">
          <div className="min-w-0">
            <h2 className="truncate text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {trackName}
            </h2>
            <p className="mt-2 truncate text-2xl font-medium text-gray-300 sm:text-3xl">{artistName}</p>
            {track?.albumName ? (
              <p className="mt-2 truncate text-sm uppercase tracking-[0.32em] text-gray-500">
                {track.albumName}
              </p>
            ) : null}
          </div>

          <div className="mt-auto pt-6">
            <div className="h-2 overflow-hidden rounded-full bg-[#1A2742]">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
                style={{ width: `${progressRatio}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xl text-gray-400 sm:text-2xl">
              <span>{formatDuration(track?.progressMs ?? 0)}</span>
              <span>{formatDuration(track?.durationMs ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
