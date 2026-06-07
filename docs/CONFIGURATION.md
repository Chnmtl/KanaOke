# Configuration & Details

> 🌐 **Language / Dil:** **English** · [Türkçe](CONFIGURATION.tr.md)

This document covers KanaOke's configuration, environment variables, architecture, and proxy details. For the general introduction and quick start, see the main [README](../README.md).

## Architecture

- **Client (Vite/React):** Spotify authentication and "now playing" polling, LRCLIB queries and candidate selection, the UI, and the browser cache.
- **Local proxy (`proxy/server.mjs`, Node):** keeps the GitHub Models token server-side only and exposes three endpoints:
  - `POST /api/analyze` — line analysis (GitHub Models call + deterministic romaji override).
  - `POST /api/romaji` — romaji generation via kuroshiro + kuromoji.
  - `GET /health` — status check (`{ ok, model, tokenConfigured }`).

### Why a separate proxy?

- **Token safety:** the GitHub Models PAT is never embedded in the client; it's kept on the server only.
- **Romaji readings:** lyric lines show kuroshiro + kuromoji's dictionary-based reading by default. When a line is analyzed, that kuromoji reading is sent to the model as a reference; the model validates it and corrects it if the song uses an unusual/custom reading (e.g. furigana). The final romaji in an analysis comes from the model; if the model leaves a field empty, that field is filled with the kuromoji reading (fallback).
- **The dictionary is read straight from the file system** (`node_modules/kuromoji/dict`); no dictionary is downloaded to the browser and no shim/polyfill is required. Kuroshiro/kuromoji is lazily initialized once and reused.

## Environment Variables

Copy `.env.example` in the root to `.env` and fill it in.

| Variable | Side | Description |
| --- | --- | --- |
| `VITE_SPOTIFY_CLIENT_ID` | Client | The Spotify app's Client ID. |
| `VITE_SPOTIFY_REDIRECT_URI` | Client | The Spotify Redirect URI (callback address). |
| `VITE_ANALYSIS_API_URL` | Client | Analysis proxy endpoint (`.../api/analyze`). |
| `VITE_ROMAJI_API_URL` | Client | Romaji proxy endpoint (`.../api/romaji`). If unset, romaji is not shown (the app still works). |
| `VITE_GITHUB_MODEL` | Both | The model to use (default `gpt-4.1-mini`). |
| `VITE_ALLOW_INSECURE_CLIENT_TOKEN` | Client | `false` in production. Can be set to `true` for temporary testing only. |
| `VITE_GITHUB_TOKEN` | Client | Used only in insecure mode (when the above is `true`); leave empty in production. |
| `GITHUB_MODELS_TOKEN` | Server | The proxy's GitHub Models PAT. `GITHUB_TOKEN` is also read as a fallback. |
| `ANALYSIS_PROXY_PORT` | Server | Proxy port (default `8787`). |
| `VITE_ANALYSIS_DEBUG` | Client | If `true`, logs analysis calls in the browser. |
| `ANALYSIS_PROXY_DEBUG` | Server | If `true`, logs model/timing/status info in the proxy. |

> Debug logs never print the token value.

### Using a PAT in the client (not recommended)

The default and recommended path is to route analysis requests through the proxy (`VITE_ANALYSIS_API_URL`). For temporary local testing only, you can call GitHub Models directly from the client without a proxy; this requires `VITE_ALLOW_INSECURE_CLIENT_TOKEN=true` and `VITE_GITHUB_TOKEN`. Don't use this in production, since the token would be embedded in the browser.

## Proxy Details

- **Analysis:** `POST http://127.0.0.1:8787/api/analyze` — body `{ line, model?, context? }`, response `{ result }`.
- **Romaji:** `POST http://127.0.0.1:8787/api/romaji` — body `{ "texts": ["東京", ...] }` or, for a single string, `{ "text": "..." }`; response `{ "romaji": ["tōkyō", ...] }`. Non-Japanese text returns an empty string.
- **Health:** `GET http://127.0.0.1:8787/health`.
- The proxy reads `GITHUB_MODELS_TOKEN` from `process.env`, `.env`, or `.env.local`.
- Use `ANALYSIS_PROXY_PORT` to change the default port.

## Lyrics & Cache

- **LRCLIB candidate selection:** if multiple candidates are returned, the best one is chosen by scoring on title, artist, album, duration proximity, and the ratio of Japanese content. If no synced record exists, it falls back to plain lyrics.
- **Lyrics cache:** localStorage, ~30 days. Manually entered lyrics are stored with the track as well.
- **Analysis cache:** localStorage, ~14 days. The analysis panel shows with a badge whether the result came from the cache or was just generated; lines that have already been analyzed are marked in the lyrics list.

## Playback Controls

- Play/pause, next, previous, and seek on the progress bar are supported; commands update optimistically for instant feedback and reconcile with the real state on the next poll.
- These controls require **Spotify Premium** and the `user-modify-playback-state` scope; an active Spotify device (an open app) must be available. Otherwise a "no active device" or "permission denied" warning is shown.

## Codespaces Notes

- Open public port 5173 and register the resulting URL with `/callback` appended as the Spotify Redirect URI.
- Match `VITE_SPOTIFY_REDIRECT_URI` to that callback address.
- Don't put the GitHub token in the client `.env`; use `GITHUB_MODELS_TOKEN` server-side as a Codespaces secret.
- For temporary testing only, `VITE_ALLOW_INSECURE_CLIENT_TOKEN=true` and `VITE_GITHUB_TOKEN` can be used (not recommended in production).
