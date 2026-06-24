import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Time formatting ─────────────────────────────────────────────────────────
// All user-visible timestamps render in Asia/Kolkata (IST) regardless of
// browser locale. The dashboard never shows UTC — if you need a different
// zone per-user in the future, thread it through these helpers.

const IST = 'Asia/Kolkata'

/** HH:MM in IST (24h). Returns '--:--' on invalid input. */
export function formatIstTime(value: Date | string | number | null | undefined): string {
  if (value == null) return '--:--'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '--:--'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST,
  }).format(d)
}

/** HH:MM:SS in IST. Used where seconds matter (log streams, etc). */
export function formatIstTimeWithSeconds(value: Date | string | number | null | undefined): string {
  if (value == null) return '--:--:--'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '--:--:--'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: IST,
  }).format(d)
}

/** Full date-time in IST, e.g. "11 Apr 2026, 14:02 IST". */
export function formatIstDateTime(value: Date | string | number | null | undefined): string {
  if (value == null) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST,
  }).format(d) + ' IST'
}

/** Human "2h ago" / "just now" — relative, zone-agnostic. */
export function formatRelative(value: Date | string | number | null | undefined): string {
  if (value == null) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}
