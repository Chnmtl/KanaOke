import type { ReactNode } from 'react'

interface TooltipProps {
  /** Tooltip text shown on hover. */
  label: ReactNode
  /** The element the tooltip is attached to (usually a button or chip). */
  children: ReactNode
  /** Horizontal edge the bubble is anchored to. Use 'left' near the left edge of a panel. */
  align?: 'left' | 'right'
  /** Extra classes for the wrapper (e.g. layout helpers). */
  className?: string
}

export const Tooltip = ({ label, children, align = 'right', className = '' }: TooltipProps) => (
  <div className={`group/tip relative ${className}`}>
    {children}
    <span
      className={`pointer-events-none absolute top-full z-30 mt-2 w-max max-w-[240px] rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs leading-snug text-gray-200 opacity-0 shadow-xl shadow-black/40 transition duration-150 group-hover/tip:opacity-100 ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      {label}
    </span>
  </div>
)
