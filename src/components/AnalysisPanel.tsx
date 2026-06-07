import { BoltIcon, CheckIcon, InfoIcon } from './icons'
import { Tooltip } from './Tooltip'
import type { AnalysisResult, LyricsLine } from '../types'

const InfoBubble = ({ title }: { title: string }) => (
  <span
    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-600 text-[9px] leading-none text-gray-400 transition hover:border-emerald-400 hover:text-emerald-300"
    title={title}
  >
    <InfoIcon className="h-3 w-3" />
  </span>
)

interface AnalysisPanelProps {
  analysis: AnalysisResult | null
  analysisSource: 'cache' | 'api' | null
  error: string | null
  isAnalyzing: boolean
  selectedLine: LyricsLine | null
}

export const AnalysisPanel = ({
  analysis,
  analysisSource,
  error,
  isAnalyzing,
  selectedLine,
}: AnalysisPanelProps) => (
  <aside className="h-full min-h-0 overflow-y-auto rounded-3xl border border-gray-800 bg-gray-950/80 p-5 shadow-xl shadow-black/20">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-2xl font-semibold text-white">Satır analizi</h2>
      {analysis && analysisSource ? (
        <Tooltip
          align="left"
          label={
            analysisSource === 'cache'
              ? 'Bu analiz kayıttan yüklendi — anında açıldı.'
              : 'Bu analiz az önce oluşturuldu ve kaydedildi.'
          }
        >
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
              analysisSource === 'cache'
                ? 'border-emerald-300/70 bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/30'
                : 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
            }`}
          >
            {analysisSource === 'cache' ? (
              <CheckIcon className="h-[18px] w-[18px]" />
            ) : (
              <BoltIcon className="h-[18px] w-[18px]" />
            )}
          </span>
        </Tooltip>
      ) : null}
    </div>

    {selectedLine ? (
      <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/60 px-3 py-2">
        <p className="jp-text truncate text-sm text-gray-200" title={selectedLine.text}>
          {selectedLine.text}
        </p>
      </div>
    ) : (
      <div className="mt-4 rounded-2xl border border-dashed border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-400">
        Analiz görmek için soldaki satırlardan birine tıkla.
      </div>
    )}

    {isAnalyzing ? (
      <div className="mt-4 flex min-h-48 flex-col items-center justify-center gap-3 rounded-3xl border border-gray-800 bg-gray-900/60">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-400" />
        <p className="text-sm text-gray-400">Analiz hazırlanıyor...</p>
      </div>
    ) : null}

    {error ? (
      <div className="mt-4 rounded-3xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
        {error}
      </div>
    ) : null}

    {analysis && !isAnalyzing ? (
      <div className="mt-4 space-y-5">
        <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-gray-500">
                <span>Romaji</span>
                <InfoBubble title="Japonca satırın Latin harflerle okunuşu." />
              </div>
              <p className="mt-1 text-sm text-white">{analysis.romaji || '—'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-gray-500">
                <span>Türkçe</span>
                <InfoBubble title="Satırın bağlama göre Türkçe anlamı veya kısa çevirisi." />
              </div>
              <p className="mt-1 text-sm text-white">{analysis.translation || '—'}</p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Kelime ve kanji detayları</h3>
            <span className="text-sm text-gray-500">{analysis.words.length} kart</span>
          </div>
          <div className="mt-3 grid gap-3">
            {analysis.words.length > 0 ? (
              analysis.words.map((word, index) => (
                <article key={index} className="rounded-2xl border border-gray-800 bg-gray-900/65 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="jp-text text-lg text-white">{word.japanese || '—'}</p>
                      <p className="mt-0.5 text-xs text-emerald-300">{word.romaji || '—'}</p>
                    </div>
                    <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
                      {word.meaning || 'Anlam yok'}
                    </span>
                  </div>

                  {word.kanji ? (
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                          <span>Karakter</span>
                          <InfoBubble title="Kanji ise karakterin kendisi; kana ise ilgili yazım." />
                        </dt>
                        <dd className="jp-text mt-2 text-lg text-white">
                          {word.kanji.character || '—'}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                          <span>Radikal</span>
                          <InfoBubble title="Karakterin anlam taşımaya yardımcı temel parçası." />
                        </dt>
                        <dd className="mt-2 text-sm text-white">{word.kanji.radical || '—'}</dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                          <span>Onyomi</span>
                          <InfoBubble title="Kanji'nin Çince kökenli okunuşu." />
                        </dt>
                        <dd className="mt-2 text-sm text-white">{word.kanji.onyomi || '—'}</dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                          <span>Kunyomi</span>
                          <InfoBubble title="Kanji'nin yerli Japonca okunuşu." />
                        </dt>
                        <dd className="mt-2 text-sm text-white">{word.kanji.kunyomi || '—'}</dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3 sm:col-span-2">
                        <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                          <span>Açıklama</span>
                          <InfoBubble title="Karakter veya kelimenin kısa anlam notu." />
                        </dt>
                        <dd className="mt-2 text-sm leading-6 text-gray-200">
                          {word.kanji.explanation || '—'}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-400">
                Model kelime kartı döndürmedi.
              </div>
            )}
          </div>
        </section>
      </div>
    ) : null}
  </aside>
)
