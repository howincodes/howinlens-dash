// ──────────────────────────────────────────────────────────────────────────────
// Form validation helpers — return null if valid, error string otherwise.
// ──────────────────────────────────────────────────────────────────────────────

export type Validator<T = string> = (v: T) => string | null

export const required = (label = 'Required'): Validator =>
  (v: string) => (v && v.trim().length > 0 ? null : label)

export const email: Validator = (v: string) => {
  if (!v) return null
  // RFC-5322ish — simple but rejects obvious garbage
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(v.trim()) ? null : 'Invalid email format'
}

export const url: Validator = (v: string) => {
  if (!v) return null
  try {
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
    new URL(withScheme)
    return null
  } catch {
    return 'Invalid URL'
  }
}

export function ensureScheme(v: string): string {
  if (!v) return v
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

export const maxLen = (n: number): Validator =>
  (v: string) => (v && v.length > n ? `Max ${n} characters` : null)

export const minNumber = (n: number): Validator<number | string> =>
  (v) => {
    const num = typeof v === 'string' ? parseFloat(v) : v
    if (Number.isNaN(num)) return null
    return num < n ? `Must be ≥ ${n}` : null
  }

export const dateAfter = (other: Date | null | undefined, label = 'Must be after start'): Validator<Date | null | undefined> =>
  (v) => {
    if (!v || !other) return null
    return v > other ? null : label
  }

export const futureDate: Validator<Date | null | undefined> =
  (v) => (!v || v > new Date() ? null : 'Must be in the future')

export const pastDate: Validator<Date | null | undefined> =
  (v) => (!v || v < new Date() ? null : 'Must be in the past')

export function combine<T>(...validators: Validator<T>[]): Validator<T> {
  return (v) => {
    for (const fn of validators) {
      const err = fn(v)
      if (err) return err
    }
    return null
  }
}
