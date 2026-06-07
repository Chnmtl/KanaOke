import { useEffect, useState } from 'react'
import { convertToRomaji } from '../api/romaji'

/**
 * Resolves the offline romaji reading for a piece of Japanese text (track name,
 * artist, album). Returns '' until ready or when the text is not Japanese, so
 * callers can conditionally render the reading without extra state handling.
 */
export const useRomaji = (text: string | null | undefined): string => {
  const [romaji, setRomaji] = useState('')

  useEffect(() => {
    let isActive = true

    // convertToRomaji resolves to '' for empty/non-Japanese text, so the state
    // is always updated asynchronously here (never synchronously in the effect).
    void convertToRomaji(text ?? '').then((result) => {
      if (isActive) {
        setRomaji(result)
      }
    })

    return () => {
      isActive = false
    }
  }, [text])

  return romaji
}
