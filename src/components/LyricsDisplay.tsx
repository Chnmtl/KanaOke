import { useEffect, useRef, useState, type ComponentType } from 'react'
import {
  BoltIcon,
  CheckIcon,
  CloseIcon,
  DotIcon,
  EditIcon,
  InfoIcon,
  LinesIcon,
  MusicNoteIcon,
  RefreshIcon,
  SparkleIcon,
  TrashIcon,
} from './icons'
import { Tooltip } from './Tooltip'
import type { AnalysisResult, LyricsLine } from '../types'

const JAPANESE_TEXT_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

interface LyricsDisplayProps {
  activeLineIndex: number
  cachedAnalysisByLineId: Map<string, AnalysisResult>
  cachedAnalysisLineIds: Set<string>
  clearManualLyricsText: () => void
  hasSyncedLyrics: boolean
  isLoading: boolean
  isUsingManualLyrics: boolean
  lines: LyricsLine[]
  manualLyricsText: string
  onSelectLine: (line: LyricsLine) => void
  onManualLyricsChange: (lyricsText: string) => void
  onRefreshLyrics: () => void
  romajiByLineId: Map<string, string>
  selectedLineId: string | null
  sourceDescription: string | null
}

const INFO_BADGE_COPY =
  'Bu satırda Japonca karakter yok; yine de referans olarak gösterilir ve dil analizi yapılmaz.'

const pillClassName =
  'inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 transition hover:border-emerald-400/50 hover:text-white'

type ActionTone = 'neutral' | 'emerald' | 'cyan'

const actionToneClassName: Record<ActionTone, string> = {
  neutral: 'border-gray-700 bg-gray-900 text-gray-300',
  emerald: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  cyan: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
}

interface HeaderActionProps {
  icon: ComponentType<{ className?: string }>
  tooltip: string
  ariaLabel: string
  onClick?: () => void
  tone?: ActionTone
  count?: number
  active?: boolean
}

const HeaderAction = ({
  icon: Icon,
  tooltip,
  ariaLabel,
  onClick,
  tone = 'neutral',
  count,
  active = false,
}: HeaderActionProps) => {
  const interactive = typeof onClick === 'function'

  return (
    <Tooltip label={tooltip}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={interactive ? active : undefined}
        aria-label={ariaLabel}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-95 ${
          active ? 'border-emerald-300/70 bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/30' : actionToneClassName[tone]
        } ${
          interactive
            ? 'cursor-pointer hover:border-emerald-300 hover:bg-emerald-400 hover:text-gray-950 hover:shadow-md hover:shadow-emerald-500/30'
            : 'cursor-default'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {typeof count === 'number' && count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-semibold text-gray-950">
            {count}
          </span>
        ) : null}
      </button>
    </Tooltip>
  )
}

const lineClasses = (isActive: boolean, isPast: boolean, isSelected: boolean) => {
  if (isActive) {
    return 'border-l-4 border-emerald-400 bg-white/5 px-5 py-4 text-2xl font-semibold text-white shadow-lg shadow-black/20'
  }

  if (isSelected) {
    return 'border border-emerald-400/40 bg-emerald-500/10 px-5 py-4 text-lg text-gray-100'
  }

  if (isPast) {
    return 'border border-transparent px-5 py-4 text-base text-gray-400 opacity-40'
  }

  return 'border border-transparent px-5 py-4 text-base text-gray-300 opacity-60'
}

export const LyricsDisplay = ({
  activeLineIndex,
  cachedAnalysisByLineId,
  cachedAnalysisLineIds,
  clearManualLyricsText,
  hasSyncedLyrics,
  isLoading,
  isUsingManualLyrics,
  lines,
  manualLyricsText,
  onSelectLine,
  onManualLyricsChange,
  onRefreshLyrics,
  romajiByLineId,
  selectedLineId,
  sourceDescription,
}: LyricsDisplayProps) => {
  const [userWantsEditorOpen, setUserWantsEditorOpen] = useState(false)
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const lineRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const autoFollowPausedUntilRef = useRef(0)
  const pauseAutoFollow = (durationMs = 8_000) => {
    autoFollowPausedUntilRef.current = Date.now() + durationMs
  }
  const isEditingManualLyrics =
    userWantsEditorOpen || isUsingManualLyrics || manualLyricsText.trim().length > 0
  const filterSavedOnly = showSavedOnly && cachedAnalysisLineIds.size > 0

  useEffect(() => {
    if (!hasSyncedLyrics || isLoading || activeLineIndex < 0 || activeLineIndex >= lines.length) {
      return
    }

    const activeLineId = lines[activeLineIndex]?.id

    if (!activeLineId) {
      return
    }

    const scrollContainer = scrollContainerRef.current
    const activeElement = lineRefs.current[activeLineId]

    if (!scrollContainer || !activeElement) {
      return
    }

    if (Date.now() < autoFollowPausedUntilRef.current) {
      return
    }

    const containerRect = scrollContainer.getBoundingClientRect()
    const activeRect = activeElement.getBoundingClientRect()
    const activeCenterY =
      activeRect.top - containerRect.top + scrollContainer.scrollTop + activeRect.height / 2
    const targetTop = Math.max(0, activeCenterY - scrollContainer.clientHeight / 2)

    scrollContainer.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    })
  }, [activeLineIndex, hasSyncedLyrics, isLoading, lines])

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-gray-800 bg-gray-950/80 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Karaoke görünümü</h2>
        <div className="flex items-center gap-1.5">
          <HeaderAction
            icon={hasSyncedLyrics ? MusicNoteIcon : LinesIcon}
            tone={hasSyncedLyrics ? 'emerald' : 'neutral'}
            ariaLabel="Söz senkronizasyon durumu"
            tooltip={
              hasSyncedLyrics
                ? 'Senkronize sözler: şarkıyla zaman uyumlu, otomatik ilerler.'
                : 'Düz söz: zaman bilgisi yok, otomatik ilerlemez.'
            }
          />
          {cachedAnalysisLineIds.size > 0 ? (
            <HeaderAction
              icon={BoltIcon}
              tone="emerald"
              count={cachedAnalysisLineIds.size}
              active={filterSavedOnly}
              onClick={() => setShowSavedOnly((currentValue) => !currentValue)}
              ariaLabel={filterSavedOnly ? 'Tüm satırları göster' : 'Sadece kayıtlı satırları göster'}
              tooltip={
                filterSavedOnly
                  ? 'Filtre açık: yalnızca kayıtlı satırlar gösteriliyor. Tümünü görmek için tıkla.'
                  : `${cachedAnalysisLineIds.size} satırın analizi kayıtlı. Yalnızca bunları görmek için tıkla.`
              }
            />
          ) : null}
          {sourceDescription ? (
            <HeaderAction
              icon={InfoIcon}
              ariaLabel="Söz kaynağı"
              tooltip={sourceDescription}
            />
          ) : null}
          <HeaderAction
            icon={RefreshIcon}
            onClick={onRefreshLyrics}
            ariaLabel="Sözleri yenile"
            tooltip="Sözleri yeniden getir"
          />
          <HeaderAction
            icon={isEditingManualLyrics ? CloseIcon : EditIcon}
            onClick={() => setUserWantsEditorOpen((currentValue) => !currentValue)}
            tone={isEditingManualLyrics ? 'cyan' : 'neutral'}
            ariaLabel={isEditingManualLyrics ? 'Manuel söz girişini kapat' : 'Söz ekle'}
            tooltip={
              isEditingManualLyrics ? 'Manuel söz girişini kapat' : 'Söz ekle veya düzenle'
            }
          />
        </div>
      </div>

      {isEditingManualLyrics ? (
        <div className="mt-5 rounded-3xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Manuel giriş</p>
              <p className="mt-1 text-sm text-gray-300">
                Şarkı sözü yanlışsa veya hiç bulunamadıysa buraya yapıştırabilirsin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearManualLyricsText()
                setUserWantsEditorOpen(true)
              }}
              className={pillClassName}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              <span>Temizle</span>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <textarea
              value={manualLyricsText}
              onChange={(event) => onManualLyricsChange(event.target.value)}
              placeholder="Buraya şarkı sözlerini satır satır yapıştır..."
              className="min-h-40 w-full rounded-2xl border border-gray-800 bg-gray-950/80 px-4 py-3 text-sm leading-6 text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-emerald-400/50"
            />
            <p className="text-xs text-gray-500">
              Girilen metin tarayıcıda kaydedilir ve aynı parçada tekrar açıldığında yeniden kullanılır.
            </p>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollContainerRef}
        className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
        onWheel={() => pauseAutoFollow()}
        onTouchMove={() => pauseAutoFollow()}
        onPointerDown={() => pauseAutoFollow()}
      >
        {isLoading ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-gray-800 bg-gray-900/60">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-400" />
            <p className="text-sm text-gray-400">Şarkı sözleri yükleniyor...</p>
          </div>
        ) : null}

        {!isLoading && lines.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900/60 p-6 text-center text-gray-400">
            Çalan parça için henüz gösterilecek söz bulunamadı. Manuel söz alanını kullanabilirsin.
          </div>
        ) : null}

        {!isLoading &&
          lines
            .map((line, index) => ({ line, index }))
            .filter(({ line }) => !filterSavedOnly || cachedAnalysisLineIds.has(line.id))
            .map(({ line, index }) => {
            const isActive = index === activeLineIndex
            const isPast = activeLineIndex >= 0 && index < activeLineIndex
            const isJapanese = JAPANESE_TEXT_PATTERN.test(line.text)
            const isSelected = selectedLineId === line.id
            const hasCachedAnalysis = cachedAnalysisLineIds.has(line.id)
            const cachedAnalysis = cachedAnalysisByLineId.get(line.id)

            const badgeState = hasCachedAnalysis ? 'saved' : isJapanese ? 'ready' : 'info'

            const badgeClassName = {
              saved:
                'border border-emerald-300/70 bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/30',
              ready:
                'border border-cyan-400/50 bg-cyan-500/15 text-cyan-300 group-hover:border-cyan-300 group-hover:bg-cyan-400 group-hover:text-gray-950 group-hover:shadow-md group-hover:shadow-cyan-500/30',
              info: 'border border-gray-700/60 bg-gray-900/40 text-gray-600',
            }[badgeState]

            const badgeTitle = {
              saved: 'Analiz kaydedildi — tıklayınca anında açılır.',
              ready: 'Bu satır analiz için hazır — tıklayarak analiz et.',
              info: INFO_BADGE_COPY,
            }[badgeState]

            const badgeLabel = {
              saved: 'Analiz kaydedildi',
              ready: 'Analize hazır',
              info: 'Sadece görüntüle',
            }[badgeState]

            const BadgeIcon = { saved: CheckIcon, ready: SparkleIcon, info: DotIcon }[badgeState]

            return (
              <button
                key={line.id}
                ref={(element) => {
                  lineRefs.current[line.id] = element
                }}
                type="button"
                onClick={() => {
                  pauseAutoFollow()
                  onSelectLine(line)
                }}
                className={`group block w-full rounded-3xl text-left transition duration-200 hover:bg-white/5 hover:opacity-100 ${lineClasses(isActive, isPast, isSelected)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="jp-text leading-relaxed text-inherit">{line.text}</p>
                    {(cachedAnalysis?.romaji || romajiByLineId.get(line.id)) ? (
                      <p className="mt-0.5 text-sm italic text-gray-400">
                        {cachedAnalysis?.romaji ?? romajiByLineId.get(line.id)}
                      </p>
                    ) : null}
                    {cachedAnalysis?.translation ? (
                      <p className="mt-2 text-sm leading-6 text-gray-300">{cachedAnalysis.translation}</p>
                    ) : null}
                  </div>
                  <span
                    className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition duration-200 ${badgeClassName}`}
                    title={badgeTitle}
                    aria-label={badgeLabel}
                  >
                    <BadgeIcon className="h-[18px] w-[18px]" />
                  </span>
                </div>
              </button>
            )
          })}
      </div>
    </section>
  )
}
