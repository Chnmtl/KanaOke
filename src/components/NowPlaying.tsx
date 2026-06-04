import type { KeyboardEvent, MouseEvent } from 'react'
import {
  LogoutIcon,
  MusicNoteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
} from './icons'
import type { SpotifyTrack } from '../types'
import { useRomaji } from '../hooks/useRomaji'
import { formatDuration } from '../utils/formatDuration'

interface NowPlayingProps {
  className?: string
  isLoading: boolean
  onLogout: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (positionMs: number) => void
  onTogglePlayback: () => void
  track: SpotifyTrack | null
}

const controlButtonClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#27365A] bg-[#09142A]/90 text-gray-200 transition hover:border-emerald-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'

export const NowPlaying = ({
  className = '',
  isLoading,
  onLogout,
  onNext,
  onPrevious,
  onSeek,
  onTogglePlayback,
  track,
}: NowPlayingProps) => {
  const durationMs = track?.durationMs ?? 0
  const progressRatio =
    track && durationMs > 0 ? Math.min(100, (track.progressMs / durationMs) * 100) : 0
  const trackName = track?.name ?? (isLoading ? 'Spotify verisi yükleniyor...' : 'Çalan şarkı yok')
  const artistName =
    track?.artist ??
    (isLoading ? 'Bağlantı kuruluyor...' : 'Spotify oynatıcısında aktif parça bulunamadı.')
  const nameRomaji = useRomaji(track?.name)
  const artistRomaji = useRomaji(track?.artist)
  const albumRomaji = useRomaji(track?.albumName)
  const isPlaying = track?.isPlaying ?? false
  const hasTrack = Boolean(track)

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    if (!track || durationMs <= 0) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    onSeek(Math.round(ratio * durationMs))
  }

  const handleSeekKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!track || durationMs <= 0) {
      return
    }

    const stepMs = 5_000

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onSeek(Math.min(durationMs, track.progressMs + stepMs))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onSeek(Math.max(0, track.progressMs - stepMs))
    }
  }

  return (
    <section
      className={`${className} flex items-center gap-4 rounded-3xl border border-gray-800 bg-[#020B1F] p-4 shadow-xl shadow-black/20 sm:gap-5 sm:p-5`}
    >
      {track?.albumImageUrl ? (
        <img
          src={track.albumImageUrl}
          alt={`${track.name} kapak görseli`}
          className="h-40 w-40 shrink-0 rounded-2xl object-cover sm:h-44 sm:w-44"
        />
      ) : (
        <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-2xl bg-[#12264A] text-cyan-200 sm:h-44 sm:w-44">
          <MusicNoteIcon className="h-12 w-12" aria-hidden="true" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold leading-tight text-white sm:text-2xl">
              {trackName}
            </h2>
            {nameRomaji ? (
              <p className="truncate text-sm italic text-gray-400">{nameRomaji}</p>
            ) : null}
            <p className="mt-1 truncate text-base font-medium text-gray-300 sm:text-lg">
              {artistName}
            </p>
            {artistRomaji ? (
              <p className="truncate text-xs italic text-gray-500">{artistRomaji}</p>
            ) : null}
            {track?.albumName ? (
              <p className="mt-1 truncate text-xs uppercase tracking-[0.28em] text-gray-500">
                {track.albumName}
                {albumRomaji ? (
                  <span className="ml-1 normal-case tracking-normal text-gray-600">
                    ({albumRomaji})
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#27365A] bg-[#09142A]/90 text-gray-200 transition hover:border-emerald-400 hover:text-white"
            title="Çıkış yap"
            aria-label="Çıkış yap"
          >
            <LogoutIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-auto">
          <div
            role="slider"
            tabIndex={hasTrack ? 0 : -1}
            aria-label="Şarkı konumu"
            aria-valuemin={0}
            aria-valuemax={durationMs}
            aria-valuenow={track?.progressMs ?? 0}
            onClick={handleSeek}
            onKeyDown={handleSeekKeyDown}
            className="group h-2 cursor-pointer overflow-hidden rounded-full bg-[#1A2742] focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-500 group-hover:bg-emerald-300"
              style={{ width: `${progressRatio}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-400">{formatDuration(track?.progressMs ?? 0)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!hasTrack}
                className={controlButtonClass}
                title="Önceki parça"
                aria-label="Önceki parça"
              >
                <PreviousIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onTogglePlayback}
                disabled={!hasTrack}
                className={controlButtonClass}
                title={isPlaying ? 'Duraklat' : 'Oynat'}
                aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
              >
                {isPlaying ? (
                  <PauseIcon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PlayIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasTrack}
                className={controlButtonClass}
                title="Sonraki parça"
                aria-label="Sonraki parça"
              >
                <NextIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <span className="text-sm text-gray-400">{formatDuration(durationMs)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
