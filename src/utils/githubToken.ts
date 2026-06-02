const GITHUB_TOKEN_STORAGE_KEY = 'github_models_token'

export const getGitHubToken = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  return sessionStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) ?? ''
}

export const setGitHubToken = (token: string) => {
  if (typeof window === 'undefined') {
    return
  }

  sessionStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token)
}

export const clearGitHubToken = () => {
  if (typeof window === 'undefined') {
    return
  }

  sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY)
}
