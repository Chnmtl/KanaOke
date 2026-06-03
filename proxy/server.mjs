import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const loadEnvFile = (fileName) => {
  const filePath = path.join(projectRoot, fileName)

  if (!existsSync(filePath)) {
    return
  }

  const fileContents = readFileSync(filePath, 'utf8')

  for (const rawLine of fileContents.split(/\r?\n/u)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const defaultModel = process.env.VITE_GITHUB_MODEL?.trim() || 'gpt-4.1-mini'
const port = Number.parseInt(process.env.ANALYSIS_PROXY_PORT ?? '8787', 10)
const githubModelsToken = process.env.GITHUB_MODELS_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim()
const debugEnabled = process.env.ANALYSIS_PROXY_DEBUG === 'true'

const logDebug = (event, payload) => {
  if (!debugEnabled) {
    return
  }

  console.info(`[proxy] ${event}`, payload)
}

const jsonHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
}

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, jsonHeaders)
  response.end(JSON.stringify(payload))
}

const readJsonBody = async (request) => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const promptForLine = (line, context) => `Sen bir sarki sozu ogretmenisin. Asagidaki satiri analiz et ve Turkce acikla.

Kurallar:
- Eger satir Japonca ise romaji alanini doldur, kelime ve kanji detaylarini uygun oldugunda ver.
- Eger satir Japonca degilse en azindan dogal bir Turkce ceviri ver.
- Japonca olmayan satirlarda romaji alanini bos birakabilirsin.
- Japonca olmayan satirlarda kelimeler alanini bos dizi olarak dondur.
- Her durumda gecerli JSON dondur.


Satır: "${line}"

Şarkı adı: ${context.trackName ?? 'Bilinmiyor'}
Sanatçı: ${context.artistName ?? 'Bilinmiyor'}
Satır sırası: ${(context.lineIndex ?? 0) + 1}

Çevredeki satırlar:
${Array.isArray(context.surroundingLines) && context.surroundingLines.length > 0 ? context.surroundingLines.map((item, index) => `${index + 1}. ${item}`).join('\n') : 'Yok'}

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

const extractModelError = async (response) => {
  const rawError = await response.text()

  if (!rawError) {
    return ''
  }

  try {
    const parsed = JSON.parse(rawError)
    return parsed.error?.message ?? parsed.error?.code ?? rawError
  } catch {
    return rawError
  }
}

const server = createServer(async (request, response) => {
  const startedAt = Date.now()

  if (!request.url) {
    sendJson(response, 400, { error: 'Eksik istek URLsi.' })
    return
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host ?? '127.0.0.1'}`)

  if (request.method === 'OPTIONS') {
    response.writeHead(204, jsonHeaders)
    response.end()
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/health') {
    sendJson(response, 200, {
      model: defaultModel,
      ok: true,
      tokenConfigured: Boolean(githubModelsToken),
    })
    return
  }

  if (request.method !== 'POST' || requestUrl.pathname !== '/api/analyze') {
    sendJson(response, 404, { error: 'Bulunamadi.' })
    return
  }

  if (!githubModelsToken) {
    sendJson(response, 500, {
      error: 'GITHUB_MODELS_TOKEN tanimli degil. Proxy sunucusunun ortam degiskenlerini kontrol edin.',
    })
    return
  }

  try {
    const body = await readJsonBody(request)
    const line = typeof body.line === 'string' ? body.line.trim() : ''
    const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : defaultModel
    const context = typeof body.context === 'object' && body.context ? body.context : {}

    logDebug('analysis_request_started', {
      lineLength: line.length,
      lineIndex: context.lineIndex,
      model,
      path: requestUrl.pathname,
      surroundingLineCount: Array.isArray(context.surroundingLines) ? context.surroundingLines.length : 0,
    })

    if (!line) {
      sendJson(response, 400, { error: 'line alani zorunludur.' })
      return
    }

    const upstreamResponse = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubModelsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ content: promptForLine(line, context), role: 'user' }],
        model,
        response_format: { type: 'json_object' },
      }),
    })

    if (!upstreamResponse.ok) {
      const detail = (await extractModelError(upstreamResponse)).replace(/\s+/g, ' ').trim()
      logDebug('analysis_request_failed', {
        durationMs: Date.now() - startedAt,
        model,
        status: upstreamResponse.status,
      })
      sendJson(response, upstreamResponse.status, {
        error: detail || `GitHub Models API hatasi: ${upstreamResponse.status}`,
      })
      return
    }

    const payload = await upstreamResponse.json()
    const content = payload.choices?.[0]?.message?.content

    if (!content) {
      sendJson(response, 502, { error: 'Model cevabi bos dondu.' })
      return
    }

    const responseText = typeof content === 'string'
      ? content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      : content
          .map((entry) => entry.text?.trim() ?? '')
          .filter(Boolean)
          .join('\n')

    logDebug('analysis_request_succeeded', {
      durationMs: Date.now() - startedAt,
      model,
      status: 200,
    })

    sendJson(response, 200, { result: JSON.parse(responseText) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy istegi islenemedi.'
    logDebug('analysis_request_crashed', {
      durationMs: Date.now() - startedAt,
      message,
      status: 500,
    })
    sendJson(response, 500, { error: message })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Analysis proxy listening on http://127.0.0.1:${port}`)
  if (debugEnabled) {
    console.log('[proxy] Debug logging enabled via ANALYSIS_PROXY_DEBUG=true')
  }
})