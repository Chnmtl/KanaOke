import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SpotifyTrack } from '../types'

interface StoredSpotifyTokens {
  accessToken: string
  expiresAt: number
  refreshToken: string
}

interface SpotifyTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
}

interface SpotifyCurrentlyPlayingResponse {
  is_playing?: boolean
  progress_ms?: number
  item?: {
    album?: {
      images?: Array<{ url?: string }>
      name?: string
    }
    artists?: Array<{ name?: string }>
    duration_ms?: number
    id?: string
    name?: string
  } | null
}

const ACCESS_STORAGE_KEY = 'spotify_tokens'
const VERIFIER_STORAGE_KEY = 'spotify_pkce_verifier'
const POLL_INTERVAL_MS = 1_000
const LOCAL_PROGRESS_TICK_MS = 100
const TOKEN_REFRESH_BUFFER_MS = 60_000
const SPOTIFY_SCOPES =
  'user-read-currently-playing user-read-playback-state user-modify-playback-state'

const toBase64Url = (value: ArrayBuffer | Uint8Array) => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const createCodeVerifier = () => {
  const values = crypto.getRandomValues(new Uint8Array(64))
  return toBase64Url(values)
}

const createCodeChallenge = async (verifier: string) => {
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return toBase64Url(digest)
}

const loadTokens = (): StoredSpotifyTokens | null => {
  const storedValue = localStorage.getItem(ACCESS_STORAGE_KEY)

  if (!storedValue) {
    return null
  }

  try {
    return JSON.parse(storedValue) as StoredSpotifyTokens
  } catch {
    localStorage.removeItem(ACCESS_STORAGE_KEY)
    return null
  }
}

const saveTokens = (payload: SpotifyTokenResponse, previousRefreshToken?: string) => {
  const tokens: StoredSpotifyTokens = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1_000,
    refreshToken: payload.refresh_token ?? previousRefreshToken ?? '',
  }

  localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(tokens))
  return tokens
}

const clearAuthStorage = () => {
  localStorage.removeItem(ACCESS_STORAGE_KEY)
  localStorage.removeItem(VERIFIER_STORAGE_KEY)
}

const mapPlayerResponse = (payload: SpotifyCurrentlyPlayingResponse): SpotifyTrack | null => {
  if (!payload.item) {
    return null
  }

  return {
    albumName: payload.item.album?.name,
    albumImageUrl: payload.item.album?.images?.[0]?.url,
    artist: payload.item.artists?.[0]?.name ?? 'Bilinmeyen sanatçı',
    durationMs: payload.item.duration_ms ?? 0,
    id:
      payload.item.id ??
      `${payload.item.name ?? 'track'}-${payload.item.artists?.[0]?.name ?? 'artist'}`,
    isPlaying: Boolean(payload.is_playing),
    name: payload.item.name ?? 'Bilinmeyen parça',
    progressMs: payload.progress_ms ?? 0,
  }
}

export const useSpotifyPlayer = () => {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
  const [player, setPlayer] = useState<SpotifyTrack | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const accessTokenRef = useRef<string | null>(null)
  const refreshTokenRef = useRef<string | null>(null)
  const lastProgressTickAtRef = useRef<number | null>(null)
  const isConfigured = useMemo(() => Boolean(clientId && redirectUri), [clientId, redirectUri])

  const refreshAccessToken = useCallback(async () => {
    if (!clientId || !refreshTokenRef.current) {
      throw new Error('Spotify oturumu yenilenemedi.')
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshTokenRef.current,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Spotify token yenileme hatası: ${response.status}`)
    }

    const payload = (await response.json()) as SpotifyTokenResponse
    const tokens = saveTokens(payload, refreshTokenRef.current)
    accessTokenRef.current = tokens.accessToken
    refreshTokenRef.current = tokens.refreshToken
    return tokens.accessToken
  }, [clientId])

  const exchangeCodeForToken = useCallback(
    async (code: string, verifier: string) => {
      if (!clientId || !redirectUri) {
        throw new Error('Spotify yapılandırma değişkenleri eksik.')
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        body: new URLSearchParams({
          client_id: clientId,
          code,
          code_verifier: verifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Spotify token alma hatası: ${response.status}`)
      }

      const payload = (await response.json()) as SpotifyTokenResponse
      const tokens = saveTokens(payload)
      accessTokenRef.current = tokens.accessToken
      refreshTokenRef.current = tokens.refreshToken
      return tokens
    },
    [clientId, redirectUri],
  )

  const ensureAccessToken = useCallback(async () => {
    const tokens = loadTokens()

    if (!tokens) {
      return null
    }

    accessTokenRef.current = tokens.accessToken
    refreshTokenRef.current = tokens.refreshToken

    if (Date.now() < tokens.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return tokens.accessToken
    }

    return refreshAccessToken()
  }, [refreshAccessToken])

  const requestCurrentlyPlaying = useCallback(
    async (accessToken: string) =>
      fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      }),
    [],
  )

  const fetchCurrentlyPlaying = useCallback(async () => {
    const accessToken = await ensureAccessToken()

    if (!accessToken) {
      setPlayer(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    try {
      let response = await requestCurrentlyPlaying(accessToken)

      if (response.status === 401) {
        response = await requestCurrentlyPlaying(await refreshAccessToken())
      }

      if (response.status === 204) {
        setPlayer(null)
        setError(null)
        return
      }

      if (!response.ok) {
        throw new Error(`Spotify oynatıcı bilgisi alınamadı: ${response.status}`)
      }

      const payload = (await response.json()) as SpotifyCurrentlyPlayingResponse
      setPlayer(mapPlayerResponse(payload))
      setError(null)
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Spotify oynatıcı bilgisi alınamadı.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [ensureAccessToken, refreshAccessToken, requestCurrentlyPlaying])

  const sendPlayerCommand = useCallback(
    async (method: 'PUT' | 'POST', path: string, query?: Record<string, string>) => {
      const accessToken = await ensureAccessToken()

      if (!accessToken) {
        setError('Spotify oturumu bulunamadı. Lütfen yeniden giriş yapın.')
        return
      }

      const queryString = query ? `?${new URLSearchParams(query).toString()}` : ''
      const url = `https://api.spotify.com/v1/me/player${path}${queryString}`

      const runRequest = (token: string) =>
        fetch(url, {
          method,
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })

      try {
        let response = await runRequest(accessToken)

        if (response.status === 401) {
          response = await runRequest(await refreshAccessToken())
        }

        if (response.status === 403) {
          setError(
            'Spotify oynatma kontrolü reddedildi. Premium hesap gerekir ve yeni izin için yeniden giriş yapın.',
          )
          return
        }

        if (response.status === 404) {
          setError('Aktif Spotify cihazı bulunamadı. Spotify uygulamasında bir parça başlatın.')
          return
        }

        if (!response.ok && response.status !== 204) {
          throw new Error(`Spotify komutu başarısız oldu: ${response.status}`)
        }

        setError(null)
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Spotify komutu gönderilemedi.',
        )
      }
    },
    [ensureAccessToken, refreshAccessToken],
  )

  const togglePlayback = useCallback(async () => {
    const shouldPause = player?.isPlaying ?? false

    // Optimistically flip state for instant feedback; the next poll reconciles.
    setPlayer((currentPlayer) =>
      currentPlayer ? { ...currentPlayer, isPlaying: !shouldPause } : currentPlayer,
    )
    lastProgressTickAtRef.current = Date.now()

    await sendPlayerCommand('PUT', shouldPause ? '/pause' : '/play')
  }, [player?.isPlaying, sendPlayerCommand])

  const playNext = useCallback(async () => {
    await sendPlayerCommand('POST', '/next')
    window.setTimeout(() => {
      void fetchCurrentlyPlaying()
    }, 350)
  }, [fetchCurrentlyPlaying, sendPlayerCommand])

  const playPrevious = useCallback(async () => {
    await sendPlayerCommand('POST', '/previous')
    window.setTimeout(() => {
      void fetchCurrentlyPlaying()
    }, 350)
  }, [fetchCurrentlyPlaying, sendPlayerCommand])

  const seekTo = useCallback(
    async (positionMs: number) => {
      const clampedPosition = Math.max(
        0,
        Math.min(player?.durationMs ?? positionMs, Math.round(positionMs)),
      )

      // Optimistically move the progress so the bar reflects the seek instantly.
      setPlayer((currentPlayer) =>
        currentPlayer ? { ...currentPlayer, progressMs: clampedPosition } : currentPlayer,
      )
      lastProgressTickAtRef.current = Date.now()

      await sendPlayerCommand('PUT', '/seek', { position_ms: String(clampedPosition) })
    },
    [player?.durationMs, sendPlayerCommand],
  )

  useEffect(() => {
    const bootstrapSpotify = async () => {
      if (!isConfigured) {
        setError(
          'Spotify için VITE_SPOTIFY_CLIENT_ID ve VITE_SPOTIFY_REDIRECT_URI tanımlanmalıdır.',
        )
        setIsLoading(false)
        return
      }

      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      const code = params.get('code')

      if (errorParam) {
        setError('Spotify yetkilendirmesi iptal edildi.')
        setIsLoading(false)
        return
      }

      if (code) {
        const verifier = localStorage.getItem(VERIFIER_STORAGE_KEY)

        if (!verifier) {
          setError('Spotify PKCE doğrulayıcısı bulunamadı.')
          setIsLoading(false)
          return
        }

        try {
          await exchangeCodeForToken(code, verifier)
          setIsAuthenticated(true)
          setError(null)
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Spotify oturumu açılamadı.')
          clearAuthStorage()
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname)
          setIsLoading(false)
        }

        return
      }

      const accessToken = await ensureAccessToken()
      setIsAuthenticated(Boolean(accessToken))
      setIsLoading(false)
    }

    void bootstrapSpotify()
  }, [ensureAccessToken, exchangeCodeForToken, isConfigured])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const initialTimeoutId = window.setTimeout(() => {
      void fetchCurrentlyPlaying()
    }, 0)
    const intervalId = window.setInterval(() => {
      void fetchCurrentlyPlaying()
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearTimeout(initialTimeoutId)
      window.clearInterval(intervalId)
    }
  }, [fetchCurrentlyPlaying, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    lastProgressTickAtRef.current = Date.now()

    const intervalId = window.setInterval(() => {
      const now = Date.now()
      const lastTickAt = lastProgressTickAtRef.current ?? now
      const deltaMs = Math.max(0, now - lastTickAt)
      lastProgressTickAtRef.current = now

      setPlayer((currentPlayer) => {
        if (!currentPlayer || !currentPlayer.isPlaying || currentPlayer.durationMs <= 0) {
          return currentPlayer
        }

        if (currentPlayer.progressMs >= currentPlayer.durationMs) {
          return currentPlayer
        }

        const nextProgressMs = Math.min(currentPlayer.durationMs, currentPlayer.progressMs + deltaMs)

        if (nextProgressMs === currentPlayer.progressMs) {
          return currentPlayer
        }

        return {
          ...currentPlayer,
          progressMs: nextProgressMs,
        }
      })
    }, LOCAL_PROGRESS_TICK_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated])

  const login = useCallback(async () => {
    if (!clientId || !redirectUri) {
      setError(
        'Spotify için VITE_SPOTIFY_CLIENT_ID ve VITE_SPOTIFY_REDIRECT_URI tanımlanmalıdır.',
      )
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const verifier = createCodeVerifier()
      const challenge = await createCodeChallenge(verifier)
      localStorage.setItem(VERIFIER_STORAGE_KEY, verifier)

      const params = new URLSearchParams({
        client_id: clientId,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SPOTIFY_SCOPES,
      })

      window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Spotify girişi başlatılamadı.')
      setIsLoading(false)
    }
  }, [clientId, redirectUri])

  const logout = useCallback(() => {
    clearAuthStorage()
    accessTokenRef.current = null
    refreshTokenRef.current = null
    setPlayer(null)
    setIsAuthenticated(false)
    setError(null)
  }, [])

  return {
    error,
    isAuthenticated,
    isLoading,
    login,
    logout,
    playNext,
    playPrevious,
    player,
    seekTo,
    togglePlayback,
  }
}
