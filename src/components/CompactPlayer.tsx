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

interface CompactPlayerProps {
  className?: string
  isExpanded?: boolean
  isLoading: boolean
  onLogout?: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (positionMs: number) => void
  onToggleExpand: () => void
  onTogglePlayback: () => void
  progressRatio: number
  track: SpotifyTrack | null
}

const iconButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-300 transition hover:border-emerald-300 hover:bg-emerald-400 hover:text-gray-950 hover:shadow-md hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-700 disabled:hover:bg-gray-800 disabled:hover:text-gray-300 disabled:hover:shadow-none'

const logoutButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-300 transition hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-500/30'

export const CompactPlayer = ({
  className = '',
  isExpanded = false,
  isLoading,
  onLogout,
  onNext,
  onPrevious,
  onSeek,
  onToggleExpand,
  onTogglePlayback,
  progressRatio,
  track,
}: CompactPlayerProps) => {
  const { t } = useTranslation()
  const trackName = track?.name ?? (isLoading ? t('player.loading') : t('player.noTrack'))
  const nameRomaji = useRomaji(track?.name)
  const artistRomaji = useRomaji(track?.artist)
  const albumRomaji = useRomaji(track?.albumName)
  const durationMs = track?.durationMs ?? 0
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

  if (isExpanded) {
    return (
      <div
        className={`flex flex-col gap-3 border-t border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4 ${className}`}
      >
        <div className="flex items-center gap-4">
          {track?.albumImageUrl ? (
            <img
              src={track.albumImageUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-800 sm:h-20 sm:w-20">
              <MusicNoteIcon className="h-8 w-8 text-gray-500" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white sm:text-xl">{trackName}</p>
            {nameRomaji ? (
              <p className="truncate text-xs italic text-gray-400">{nameRomaji}</p>
            ) : null}
            <p className="truncate text-sm text-gray-300 sm:text-base">{track?.artist ?? '—'}</p>
            {artistRomaji ? (
              <p className="truncate text-xs italic text-gray-500">{artistRomaji}</p>
            ) : null}
            {track?.albumName ? (
              <p className="mt-0.5 truncate text-xs uppercase tracking-[0.24em] text-gray-500">
                {track.albumName}
                {albumRomaji ? (
                  <span className="ml-1 normal-case tracking-normal text-gray-600">
                    ({albumRomaji})
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageSwitcher align="left" />
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className={logoutButtonClass}
                aria-label={t('player.logout')}
                title={t('player.logout')}
              >
                <LogoutIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onToggleExpand}
              className={iconButtonClass}
              aria-label={t('player.minimizePlayer')}
              title={t('player.minimize')}
            >
              <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasTrack}
            className={iconButtonClass}
            aria-label={t('player.previous')}
            title={t('player.previous')}
          >
            <PreviousIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onTogglePlayback}
            disabled={!hasTrack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isPlaying ? t('player.pause') : t('player.play')}
            title={isPlaying ? t('player.pause') : t('player.play')}
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PlayIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasTrack}
            className={iconButtonClass}
            aria-label={t('player.next')}
            title={t('player.next')}
          >
            <NextIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div>
          <div
            role="slider"
            tabIndex={hasTrack ? 0 : -1}
            aria-label={t('player.seek')}
            aria-valuemin={0}
            aria-valuemax={durationMs}
            aria-valuenow={track?.progressMs ?? 0}
            onClick={handleSeek}
            onKeyDown={handleSeekKeyDown}
            className="h-1.5 cursor-pointer overflow-hidden rounded-full bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
              style={{ width: `${progressRatio}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-gray-400">
            <span>{formatDuration(track?.progressMs ?? 0)}</span>
            <span>{formatDuration(durationMs)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 border-t border-gray-800 bg-gray-950/95 px-4 py-2 backdrop-blur ${className}`}
    >
      {track?.albumImageUrl ? (
        <img
          src={track.albumImageUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-800">
          <MusicNoteIcon className="h-6 w-6 text-gray-500" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{trackName}</p>
        <p className="truncate text-xs text-gray-400">{track?.artist ?? '—'}</p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
            style={{ width: `${progressRatio}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onTogglePlayback}
        disabled={!hasTrack}
        className={iconButtonClass}
        aria-label={isPlaying ? t('player.pause') : t('player.play')}
        title={isPlaying ? t('player.pause') : t('player.play')}
      >
        {isPlaying ? (
          <PauseIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <PlayIcon className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={onToggleExpand}
        className={iconButtonClass}
        aria-label={t('player.maximizePlayer')}
        title={t('player.maximize')}
      >
        <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
