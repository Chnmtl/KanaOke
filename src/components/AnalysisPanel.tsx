import type { AnalysisResult, LyricsLine } from '../types'

interface AnalysisPanelProps {
  analysis: AnalysisResult | null
  error: string | null
  isAnalyzing: boolean
  isJapaneseLine: boolean
  selectedLine: LyricsLine | null
}

export const AnalysisPanel = ({
  analysis,
  error,
  isAnalyzing,
  isJapaneseLine,
  selectedLine,
}: AnalysisPanelProps) => (
  <aside className="rounded-3xl border border-gray-800 bg-gray-950/80 p-5 shadow-xl shadow-black/20">
    <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Analysis</p>
    <h2 className="mt-1 text-2xl font-semibold text-white">Satır analizi</h2>

    {selectedLine ? (
      <div className="mt-6 rounded-3xl border border-gray-800 bg-gray-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Seçilen satır</p>
        <p className="jp-text mt-2 text-lg leading-relaxed text-white">{selectedLine.text}</p>
      </div>
    ) : (
      <div className="mt-6 rounded-3xl border border-dashed border-gray-800 bg-gray-900/60 p-6 text-sm text-gray-400">
        Analiz görmek için soldaki Japonca satırlardan birine tıkla.
      </div>
    )}

    {selectedLine && !isJapaneseLine ? (
      <div className="mt-4 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        Bu satır Japonca karakter içermediği için analiz devre dışı bırakıldı.
      </div>
    ) : null}

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
      <div className="mt-6 space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Romaji</p>
          <p className="mt-2 text-base text-white">{analysis.romaji || '—'}</p>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Türkçe</p>
          <p className="mt-2 text-base text-white">{analysis.turkce || '—'}</p>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Kelime ve kanji detayları</h3>
            <span className="text-sm text-gray-500">{analysis.kelimeler.length} kart</span>
          </div>
          <div className="mt-4 grid gap-4">
            {analysis.kelimeler.length > 0 ? (
              analysis.kelimeler.map((word, index) => (
                <article
                  key={`${word.japonca}-${index}`}
                  className="rounded-3xl border border-gray-800 bg-gray-900/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="jp-text text-xl text-white">{word.japonca || '—'}</p>
                      <p className="mt-1 text-sm text-emerald-300">{word.romaji || '—'}</p>
                    </div>
                    <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
                      {word.anlam || 'Anlam yok'}
                    </span>
                  </div>

                  {word.kanji ? (
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-gray-500">
                          Karakter
                        </dt>
                        <dd className="jp-text mt-2 text-lg text-white">
                          {word.kanji.karakter || '—'}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-gray-500">
                          Radikal
                        </dt>
                        <dd className="mt-2 text-sm text-white">{word.kanji.radikal || '—'}</dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-gray-500">
                          Onyomi
                        </dt>
                        <dd className="mt-2 text-sm text-white">{word.kanji.onyomi || '—'}</dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-gray-500">
                          Kunyomi
                        </dt>
                        <dd className="mt-2 text-sm text-white">{word.kanji.kunyomi || '—'}</dd>
                      </div>
                      <div className="rounded-2xl bg-gray-950/70 p-3 sm:col-span-2">
                        <dt className="text-xs uppercase tracking-[0.2em] text-gray-500">
                          Açıklama
                        </dt>
                        <dd className="mt-2 text-sm leading-6 text-gray-200">
                          {word.kanji.aciklama || '—'}
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

        <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">His analizi</p>
          <p className="mt-2 text-base leading-7 text-white">{analysis.his || '—'}</p>
        </section>
      </div>
    ) : null}
  </aside>
)
