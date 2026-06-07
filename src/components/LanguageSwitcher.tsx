import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, ChevronDownIcon, GlobeIcon } from './icons'
import { SUPPORTED_LANGUAGES } from '../i18n'

interface LanguageSwitcherProps {
  className?: string
  /** Which edge the dropdown menu is anchored to. */
  align?: 'left' | 'right'
}

export const LanguageSwitcher = ({ className = '', align = 'right' }: LanguageSwitcherProps) => {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const activeCode = SUPPORTED_LANGUAGES.find(
    (language) => language.code === i18n.resolvedLanguage,
  )?.code

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const selectLanguage = (code: string) => {
    void i18n.changeLanguage(code)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('language.label')}
        title={t('language.label')}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#27365A] bg-[#09142A]/90 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-emerald-300 hover:bg-emerald-400 hover:text-gray-950 hover:shadow-md hover:shadow-emerald-500/30"
      >
        <GlobeIcon className="h-4 w-4" aria-hidden="true" />
        <span className="uppercase">{activeCode}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <ul
          role="listbox"
          aria-label={t('language.label')}
          className={`absolute top-full z-50 mt-2 min-w-40 overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 py-1 shadow-xl shadow-black/40 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {SUPPORTED_LANGUAGES.map((language) => {
            const isActive = language.code === activeCode

            return (
              <li key={language.code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => selectLanguage(language.code)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition hover:bg-emerald-500/15 ${
                    isActive ? 'text-emerald-300' : 'text-gray-200'
                  }`}
                >
                  <span>{t(language.labelKey)}</span>
                  {isActive ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
