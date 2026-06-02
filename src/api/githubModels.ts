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

const promptForLine = (line: string, context: AnalysisContext) => `Sen bir sarki sozu ogretmenisin. Asagidaki satiri analiz et ve Turkce acikla.

Kurallar:
- Eger satir Japonca ise romaji alanini doldur, kelime ve kanji detaylarini uygun oldugunda ver.
- Eger satir Japonca degilse en azindan dogal bir Turkce ceviri ver.
- Japonca olmayan satirlarda romaji alanini bos birakabilirsin.
- Japonca olmayan satirlarda kelimeler alanini bos dizi olarak dondur.
- Her durumda gecerli JSON dondur.


Satır: "${line}"

Şarkı adı: ${context.trackName ?? 'Bilinmiyor'}
Sanatçı: ${context.artistName ?? 'Bilinmiyor'}
Satır sırası: ${context.lineIndex + 1}

Çevredeki satırlar:
${context.surroundingLines.length > 0 ? context.surroundingLines.map((item, index) => `${index + 1}. ${item}`).join('\n') : 'Yok'}

Şu formatta JSON döndür:
{
  "romaji": "...",
  "turkce": "...",
  "kelimeler": [
    {
      "japonca": "...",
      "romaji": "...",
      "anlam": "...",
      "kanji": {
        "karakter": "...",
        "onyomi": "...",
        "kunyomi": "...",
        "radikal": "...",
        "aciklama": "..."
      }
    }
  ]
}`

type RawAnalysisPayload = Partial<AnalysisResult> & { his?: string }

const normalizeAnalysisResult = (payload: RawAnalysisPayload): AnalysisResult => ({
  baglamNotu: payload.baglamNotu?.trim() ?? payload.his?.trim() ?? '',
  kelimeler: Array.isArray(payload.kelimeler)
    ? payload.kelimeler.map((word) => ({
        anlam: word.anlam?.trim() ?? '',
        japonca: word.japonca?.trim() ?? '',
        kanji: word.kanji
          ? {
              aciklama: word.kanji.aciklama?.trim() ?? '',
              karakter: word.kanji.karakter?.trim() ?? '',
              kunyomi: word.kanji.kunyomi?.trim() ?? '',
              onyomi: word.kanji.onyomi?.trim() ?? '',
              radikal: word.kanji.radikal?.trim() ?? '',
            }
          : null,
        romaji: word.romaji?.trim() ?? '',
      }))
    : [],
  romaji: payload.romaji?.trim() ?? '',
  turkce: payload.turkce?.trim() ?? '',
})

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
        | AnalysisResult
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
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ content: promptForLine(line, context), role: 'user' }],
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
    return normalizeAnalysisResult(parsed)
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
