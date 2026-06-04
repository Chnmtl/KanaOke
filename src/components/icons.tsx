import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
}

export const MusicNoteIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M9 18V6.5l10-2V16" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </svg>
)

export const LinesIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M5 7h14" />
    <path d="M5 12h14" />
    <path d="M5 17h14" />
  </svg>
)

export const BoltIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />
  </svg>
)

export const SparkleIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8Z" />
    <path d="m18 16 .9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9Z" />
  </svg>
)

export const DotIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
  </svg>
)

export const InfoIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <path d="M12 7h.01" />
  </svg>
)

export const RefreshIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M20 11a8 8 0 0 0-14.9-3" />
    <path d="M4 4v5h5" />
    <path d="M4 13a8 8 0 0 0 14.9 3" />
    <path d="M20 20v-5h-5" />
  </svg>
)

export const EditIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="m19 6-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
)

export const DatabaseIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <ellipse cx="12" cy="5" rx="7" ry="3" />
    <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
    <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </svg>
)

export const LogoutIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const ChevronUpIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="m18 15-6-6-6 6" />
  </svg>
)

export const PlayIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M7 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
  </svg>
)

export const PauseIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M8 5v14" />
    <path d="M16 5v14" />
  </svg>
)

export const NextIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M6 5.5v13l9-6.5-9-6.5Z" fill="currentColor" stroke="none" />
    <path d="M18 5v14" />
  </svg>
)

export const PreviousIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M18 5.5v13l-9-6.5 9-6.5Z" fill="currentColor" stroke="none" />
    <path d="M6 5v14" />
  </svg>
)