import { convertToRomaji, fetchRomaji } from './romaji'
import { promptForLine } from '../../shared/analysisPrompt.mjs'
import type { AnalysisContext, AnalysisResult } from '../types'

interface GitHubModelsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>
    }
  }>
}

interface GitHubModelsErrorResponse {
  error?: {
    code?: string
    message?: string
  }
}

const DEFAULT_GITHUB_MODEL = 'gpt-4.1-mini'
const ANALYSIS_DEBUG_ENABLED = import.meta.env.VITE_ANALYSIS_DEBUG === 'true'

const logAnalysisDebug = (event: string, payload: Record<string, unknown>) => {
  if (!ANALYSIS_DEBUG_ENABLED) {
    return
  }

  console.info(`[analysis] ${event}`, payload)
}

interface RawKanji {
  aciklama?: string
  karakter?: string
  kunyomi?: string
  onyomi?: string
  radikal?: string
}

interface RawWord {
  anlam?: string
  japonca?: string
  kanji?: RawKanji | null
  romaji?: string
}

interface RawForeign {
  anlam?: string
  metin?: string
}

interface RawAnalysisPayload {
  kelimeler?: RawWord[]
  romaji?: string
  turkce?: string
  yabanci?: RawForeign[]
}

// The model keeps non-Japanese (e.g. English) segments verbatim inside the
// Turkish translation and lists each one in `yabanci` with its meaning. We do
// the parenthetical insertion here so the format is deterministic and the
// original text is guaranteed to survive: "Its a deal" -> "Its a deal (anlaştık)".
const applyForeignGlosses = (translation: string, foreign?: RawForeign[]): string => {
  if (!translation || !Array.isArray(foreign)) {
    return translation
  }

  return foreign.reduce((text, entry) => {
    const metin = entry.metin?.trim() ?? ''
    const anlam = entry.anlam?.trim() ?? ''

    if (!metin || !anlam) {
      return text
    }

    const index = text.indexOf(metin)
    const after = index === -1 ? '' : text.slice(index + metin.length)

    // Skip if the segment is missing, or already followed by a parenthetical
    // (model glossed it itself, or this ran twice) to avoid "deal (x) (x)".
    if (index === -1 || after.trimStart().startsWith('(')) {
      return text
    }

    return `${text.slice(0, index + metin.length)} (${anlam})${after}`
  }, translation)
}

const normalizeAnalysisResult = (payload: RawAnalysisPayload): AnalysisResult => ({
  romaji: payload.romaji?.trim() ?? '',
  translation: applyForeignGlosses(payload.turkce?.trim() ?? '', payload.yabanci),
  words: Array.isArray(payload.kelimeler)
    ? payload.kelimeler.map((word) => ({
        japanese: word.japonca?.trim() ?? '',
        kanji: word.kanji
          ? {
              character: word.kanji.karakter?.trim() ?? '',
              explanation: word.kanji.aciklama?.trim() ?? '',
              kunyomi: word.kanji.kunyomi?.trim() ?? '',
              onyomi: word.kanji.onyomi?.trim() ?? '',
              radical: word.kanji.radikal?.trim() ?? '',
            }
          : null,
        meaning: word.anlam?.trim() ?? '',
        romaji: word.romaji?.trim() ?? '',
      }))
    : [],
})

// Mirror of the proxy's fallback: the model owns the final romaji (it verifies
// the kuromoji reading passed in the prompt and corrects unusual song readings).
// We only fill in the deterministic kuroshiro reading where the model left a
// field empty, so the UI always has something to show.
const applyFallbackReadings = async (
  result: AnalysisResult,
  lineRomaji: string,
): Promise<AnalysisResult> => {
  const missingWords = result.words.filter((word) => !word.romaji.trim())
  const wordRomaji = missingWords.length
    ? await fetchRomaji(missingWords.map((word) => word.japanese))
    : new Map<string, string>()

  return {
    ...result,
    romaji: result.romaji.trim() || lineRomaji,
    words: result.words.map((word) =>
      word.romaji.trim()
        ? word
        : { ...word, romaji: wordRomaji.get(word.japanese.trim()) ?? '' },
    ),
  }
}

const parseResponseContent = (content: string | Array<{ text?: string; type?: string }>) => {
  if (typeof content === 'string') {
    return content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  }

  return content
    .map((entry) => entry.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
}

export const analyzeJapaneseLine = async (
  line: string,
  context: AnalysisContext,
): Promise<AnalysisResult> => {
  const startedAt = Date.now()
  const analysisApiUrl = import.meta.env.VITE_ANALYSIS_API_URL?.trim()
  const allowInsecureClientToken = import.meta.env.VITE_ALLOW_INSECURE_CLIENT_TOKEN === 'true'
  const token = import.meta.env.VITE_GITHUB_TOKEN
  const model = import.meta.env.VITE_GITHUB_MODEL ?? DEFAULT_GITHUB_MODEL

  if (analysisApiUrl) {
    logAnalysisDebug('proxy_request_started', {
      lineLength: line.length,
      lineIndex: context.lineIndex,
      model,
      surroundingLineCount: context.surroundingLines.length,
      url: analysisApiUrl,
    })

    try {
      const proxyResponse = await fetch(analysisApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          line,
          model,
        }),
      })

      logAnalysisDebug('proxy_response_received', {
        durationMs: Date.now() - startedAt,
        model,
        status: proxyResponse.status,
        url: analysisApiUrl,
      })

      if (!proxyResponse.ok) {
        const proxyError = await proxyResponse.text()
        const compactProxyError = proxyError.replace(/\s+/g, ' ').trim()
        throw new Error(
          compactProxyError
            ? `Analiz proxy hatası: ${proxyResponse.status} (${compactProxyError})`
            : `Analiz proxy hatası: ${proxyResponse.status}`,
        )
      }

      const proxyPayload = (await proxyResponse.json()) as
        | { result?: RawAnalysisPayload }
        | RawAnalysisPayload

      if ('result' in proxyPayload && proxyPayload.result) {
        return normalizeAnalysisResult(proxyPayload.result)
      }

      return normalizeAnalysisResult(proxyPayload as RawAnalysisPayload)
    } catch (error) {
      logAnalysisDebug('proxy_request_failed', {
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Unknown error',
        model,
        url: analysisApiUrl,
      })

      if (error instanceof Error) {
        throw new Error(
          `Analiz proxy'sine ulasilamadi (${analysisApiUrl}). Proxy sunucusunun calistigini kontrol edin. ${error.message}`,
          { cause: error },
        )
      }

      throw new Error(
        `Analiz proxy'sine ulasilamadi (${analysisApiUrl}). Proxy sunucusunun calistigini kontrol edin.`,
        { cause: error },
      )
    }
  }

  if (!allowInsecureClientToken) {
    throw new Error(
      'Güvenlik nedeniyle istemcide PAT kullanımı varsayılan olarak kapalıdır. VITE_ANALYSIS_API_URL ile bir backend proxy kullanın.',
    )
  }

  if (!token) {
    throw new Error(
      'VITE_GITHUB_TOKEN tanımlı değil. Geçici istemci kullanımı için VITE_ALLOW_INSECURE_CLIENT_TOKEN=true da tanımlanmalı.',
    )
  }

  logAnalysisDebug('direct_request_started', {
    lineLength: line.length,
    lineIndex: context.lineIndex,
    model,
    surroundingLineCount: context.surroundingLines.length,
    url: 'https://models.inference.ai.azure.com/chat/completions',
  })

  try {
    // Resolve the kuromoji reading once: fed to the model as a reference to
    // verify against, and reused as a fallback if the model omits a reading.
    const lineRomaji = await convertToRomaji(line)

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ content: promptForLine(line, context, lineRomaji), role: 'user' }],
        model,
        response_format: { type: 'json_object' },
      }),
    })

    logAnalysisDebug('direct_response_received', {
      durationMs: Date.now() - startedAt,
      model,
      status: response.status,
      url: 'https://models.inference.ai.azure.com/chat/completions',
    })

    if (!response.ok) {
      const rawError = await response.text()
      let detail = ''

      if (rawError) {
        try {
          const parsed = JSON.parse(rawError) as GitHubModelsErrorResponse
          detail = parsed.error?.message ?? parsed.error?.code ?? rawError
        } catch {
          detail = rawError
        }
      }

      const compactDetail = detail.replace(/\s+/g, ' ').trim()
      const message = compactDetail
        ? `GitHub Models API hatası: ${response.status} (${compactDetail})`
        : `GitHub Models API hatası: ${response.status}`

      throw new Error(message)
    }

    const payload = (await response.json()) as GitHubModelsResponse
    const content = payload.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Model cevabı boş döndü.')
    }

    const parsed = JSON.parse(parseResponseContent(content)) as RawAnalysisPayload
    return applyFallbackReadings(normalizeAnalysisResult(parsed), lineRomaji)
  } catch (error) {
    logAnalysisDebug('direct_request_failed', {
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'Unknown error',
      model,
      url: 'https://models.inference.ai.azure.com/chat/completions',
    })

    if (error instanceof Error) {
      throw new Error(`Satır analizi başarısız oldu: ${error.message}`, { cause: error })
    }

    throw new Error('Satır analizi başarısız oldu.', { cause: error })
  }
}
