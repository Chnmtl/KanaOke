import type { KeyboardEvent, MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LogoutIcon,
  MusicNoteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
} from './icons'
import { LanguageSwitcher } from './LanguageSwitcher'
import type { SpotifyTrack } from '../types'
import { useRomaji } from '../hooks/useRomaji'
import { formatDuration } from '../utils/formatDuration'

interface NowPlayingProps {
  className?: string
  isLoading: boolean
  isMinimized?: boolean
  onLogout: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (positionMs: number) => void
  onToggleMinimize?: () => void
  onTogglePlayback: () => void
  track: SpotifyTrack | null
}

const controlButtonClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#27365A] bg-[#09142A]/90 text-gray-200 transition hover:border-emerald-300 hover:bg-emerald-400 hover:text-gray-950 hover:shadow-md hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#27365A] disabled:hover:bg-[#09142A]/90 disabled:hover:text-gray-200 disabled:hover:shadow-none'

const toggleButtonClass =
  'inline-flex shrink-0 items-center justify-center rounded-full border border-[#27365A] bg-[#09142A]/90 text-gray-200 transition hover:border-emerald-300 hover:bg-emerald-400 hover:text-gray-950 hover:shadow-md hover:shadow-emerald-500/30'

export const NowPlaying = ({
  className = '',
  isLoading,
  isMinimized = false,
  onLogout,
  onNext,
  onPrevious,
  onSeek,
  onToggleMinimize,
  onTogglePlayback,
  track,
}: NowPlayingProps) => {
  const { t } = useTranslation()
  const durationMs = track?.durationMs ?? 0
  const progressRatio =
    track && durationMs > 0 ? Math.min(100, (track.progressMs / durationMs) * 100) : 0
  const trackName =
    track?.name ?? (isLoading ? t('player.loadingSpotify') : t('player.noTrack'))
  const artistName =
    track?.artist ?? (isLoading ? t('player.connecting') : t('player.noActiveTrack'))
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

  const progressBar = (
    <div
      role="slider"
      tabIndex={hasTrack ? 0 : -1}
      aria-label={t('player.seek')}
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
  )

  const playbackControls = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasTrack}
        className={controlButtonClass}
        title={t('player.previous')}
        aria-label={t('player.previous')}
      >
        <PreviousIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onTogglePlayback}
        disabled={!hasTrack}
        className={controlButtonClass}
        title={isPlaying ? t('player.pause') : t('player.play')}
        aria-label={isPlaying ? t('player.pause') : t('player.play')}
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
        title={t('player.next')}
        aria-label={t('player.next')}
      >
        <NextIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )

  if (isMinimized) {
    return (
      <section
        className={`${className} flex items-center gap-4 rounded-3xl border border-gray-800 bg-[#020B1F] px-4 py-3 shadow-xl shadow-black/20`}
      >
        {track?.albumImageUrl ? (
          <img
            src={track.albumImageUrl}
            alt={t('player.coverAlt', { name: track.name })}
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#12264A] text-cyan-200">
            <MusicNoteIcon className="h-6 w-6" aria-hidden="true" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{trackName}</p>
          <p className="truncate text-sm text-gray-300">{artistName}</p>
          <div className="mt-1.5">{progressBar}</div>
        </div>

        {playbackControls}

        {onToggleMinimize ? (
          <button
            type="button"
            onClick={onToggleMinimize}
            className={`${toggleButtonClass} h-10 w-10`}
            title={t('player.maximize')}
            aria-label={t('player.maximizePlayer')}
            aria-expanded={false}
          >
            <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section
      className={`${className} flex items-center gap-4 rounded-3xl border border-gray-800 bg-[#020B1F] p-4 shadow-xl shadow-black/20 sm:gap-5 sm:p-5`}
    >
      {track?.albumImageUrl ? (
        <img
          src={track.albumImageUrl}
          alt={t('player.coverAlt', { name: track.name })}
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

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#27365A] bg-[#09142A]/90 px-3.5 py-2 text-sm font-medium text-gray-200 transition hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-500/30"
              title={t('player.logoutTitle')}
              aria-label={t('player.logout')}
            >
              <LogoutIcon className="h-4 w-4" aria-hidden="true" />
              <span>{t('player.logout')}</span>
            </button>
            {onToggleMinimize ? (
              <button
                type="button"
                onClick={onToggleMinimize}
                className={`${toggleButtonClass} h-10 w-10`}
                title={t('player.minimize')}
                aria-label={t('player.minimizePlayer')}
                aria-expanded={true}
              >
                <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-auto">
          {progressBar}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-400">{formatDuration(track?.progressMs ?? 0)}</span>
            {playbackControls}
            <span className="text-sm text-gray-400">{formatDuration(durationMs)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
