import type { AnalysisResult } from '../types'

const JAPANESE_TEXT_PATTERN =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

interface GitHubModelsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>
    }
  }>
}

const promptForLine = (line: string) => `Sen bir Japonca öğretmenisin. Aşağıdaki şarkı sözü satırını analiz et.
Türkçe açıklama yap.

Satır: "${line}"

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
  ],
  "his": "..."
}`

const normalizeAnalysisResult = (payload: Partial<AnalysisResult>): AnalysisResult => ({
  his: payload.his?.trim() ?? '',
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

export const analyzeJapaneseLine = async (line: string): Promise<AnalysisResult> => {
  if (!JAPANESE_TEXT_PATTERN.test(line)) {
    throw new Error('Sadece Japonca satırlar analiz edilebilir.')
  }

  const token = import.meta.env.VITE_GITHUB_TOKEN

  if (!token) {
    throw new Error('VITE_GITHUB_TOKEN tanımlı değil. Lütfen .env dosyanızı kontrol edin.')
  }

  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ content: promptForLine(line), role: 'user' }],
        model: 'claude-sonnet-4-5',
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`GitHub Models API hatası: ${response.status}`)
    }

    const payload = (await response.json()) as GitHubModelsResponse
    const content = payload.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Model cevabı boş döndü.')
    }

    const parsed = JSON.parse(parseResponseContent(content)) as Partial<AnalysisResult>
    return normalizeAnalysisResult(parsed)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Satır analizi başarısız oldu: ${error.message}`, { cause: error })
    }

    throw new Error('Satır analizi başarısız oldu.', { cause: error })
  }
}
