import type { LyricsLine } from '../types'

const JAPANESE_TEXT_PATTERN =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

interface LyricsDisplayProps {
  activeLineIndex: number
  hasSyncedLyrics: boolean
  isLoading: boolean
  lines: LyricsLine[]
  onSelectLine: (line: LyricsLine) => void
  selectedLineId: string | null
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
  hasSyncedLyrics,
  isLoading,
  lines,
  onSelectLine,
  selectedLineId,
}: LyricsDisplayProps) => (
  <section className="rounded-3xl border border-gray-800 bg-gray-950/80 p-5 shadow-xl shadow-black/20">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Lyrics</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Karaoke görünümü</h2>
      </div>
      <span className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1 text-xs text-gray-400">
        {hasSyncedLyrics ? 'Senkronize LRC' : 'Plain lyrics fallback'}
      </span>
    </div>

    <p className="mt-4 text-sm text-gray-400">
      Japonca olmayan satırlar analiz için devre dışıdır. Bir satıra tıklayarak sağ panelde
      romaji, çeviri ve kanji açıklamasını görebilirsin.
    </p>

    <div className="mt-6 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      {isLoading ? (
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-gray-800 bg-gray-900/60">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-400" />
          <p className="text-sm text-gray-400">Şarkı sözleri yükleniyor...</p>
        </div>
      ) : null}

      {!isLoading && lines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900/60 p-6 text-center text-gray-400">
          Çalan parça için henüz gösterilecek söz bulunamadı.
        </div>
      ) : null}

      {!isLoading &&
        lines.map((line, index) => {
          const isActive = index === activeLineIndex
          const isPast = activeLineIndex >= 0 && index < activeLineIndex
          const isJapanese = JAPANESE_TEXT_PATTERN.test(line.text)
          const isSelected = selectedLineId === line.id

          return (
            <button
              key={line.id}
              type="button"
              disabled={!isJapanese}
              onClick={() => onSelectLine(line)}
              className={`group block w-full rounded-3xl text-left transition duration-200 hover:bg-white/5 hover:opacity-100 disabled:cursor-not-allowed disabled:hover:bg-transparent ${lineClasses(isActive, isPast, isSelected)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="jp-text leading-relaxed">{line.text}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    isJapanese
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {isJapanese ? 'Analiz açık' : 'Analiz kapalı'}
                </span>
              </div>
            </button>
          )
        })}
    </div>
  </section>
)
