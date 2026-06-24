// ──────────────────────────────────────────────────────────────────────────────
// Phone number helpers — country dial codes, formatting, normalization, validation.
// Lightweight (no libphonenumber dep) — covers the cases HowinLens actually uses.
// ──────────────────────────────────────────────────────────────────────────────

export interface CountryDialCode {
  code: string         // ISO-2: IN, US, GB, AE, SG, AU, CA, MY, BD, NP, LK, PK, PH, SA
  name: string
  dial: string         // '+91'
  /** Number of digits in a national number (after dial code). */
  digits: number
  /** Optional second valid length. */
  digitsAlt?: number
  flag: string         // emoji
}

// Ordered to put India first (HowinLens primary market), then common neighbors + intl.
export const COUNTRIES: CountryDialCode[] = [
  { code: 'IN', name: 'India',         dial: '+91', digits: 10, flag: '🇮🇳' },
  { code: 'US', name: 'United States', dial: '+1',  digits: 10, flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom',dial: '+44', digits: 10, flag: '🇬🇧' },
  { code: 'AE', name: 'UAE',           dial: '+971',digits: 9,  flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore',     dial: '+65', digits: 8,  flag: '🇸🇬' },
  { code: 'AU', name: 'Australia',     dial: '+61', digits: 9,  flag: '🇦🇺' },
  { code: 'CA', name: 'Canada',        dial: '+1',  digits: 10, flag: '🇨🇦' },
  { code: 'BD', name: 'Bangladesh',    dial: '+880',digits: 10, flag: '🇧🇩' },
  { code: 'NP', name: 'Nepal',         dial: '+977',digits: 10, flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka',     dial: '+94', digits: 9,  flag: '🇱🇰' },
  { code: 'PK', name: 'Pakistan',      dial: '+92', digits: 10, flag: '🇵🇰' },
  { code: 'PH', name: 'Philippines',   dial: '+63', digits: 10, flag: '🇵🇭' },
  { code: 'MY', name: 'Malaysia',      dial: '+60', digits: 9,  digitsAlt: 10, flag: '🇲🇾' },
  { code: 'SA', name: 'Saudi Arabia',  dial: '+966',digits: 9,  flag: '🇸🇦' },
]

export const DEFAULT_COUNTRY: CountryDialCode = COUNTRIES[0] // IN

export function findCountryByDial(dial: string): CountryDialCode | undefined {
  return COUNTRIES.find((c) => c.dial === dial)
}

export function findCountryByCode(code: string): CountryDialCode | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

/** Strip everything that isn't a digit or leading +. Used for storage / wa.me URLs. */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = String(raw).trim()
  // Keep leading +, drop everything else non-digit
  const sign = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/\D/g, '')
  return digits.length > 0 ? sign + digits : ''
}

/**
 * Detect country from a stored phone string (E.164-ish).
 * Returns null if no country dial-code prefix matches.
 */
export function detectCountry(stored: string | null | undefined): CountryDialCode | null {
  if (!stored) return null
  const norm = normalizePhone(stored)
  if (!norm.startsWith('+')) return null
  // Try longest dial codes first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (norm.startsWith(c.dial)) return c
  }
  return null
}

/**
 * Split a stored phone into country + national-digits.
 * If no country detected, falls back to default (IN) and treats whole thing as national.
 */
export function splitStoredPhone(stored: string | null | undefined): { country: CountryDialCode; national: string } {
  const norm = normalizePhone(stored)
  const detected = detectCountry(norm)
  if (detected) {
    return {
      country: detected,
      national: norm.slice(detected.dial.length).replace(/\D/g, ''),
    }
  }
  // Take last `defaults.digits` as national assuming default country
  const c = DEFAULT_COUNTRY
  const digits = norm.replace(/\D/g, '')
  return { country: c, national: digits }
}

/**
 * Format a national phone number for display (groups of digits per country convention).
 * IN: 5+5 (98765 43210). US: 3+3+4. GB: 4+6 / 5+5 (variable, simplified). Others: simple 3-grouped.
 */
export function formatNational(country: CountryDialCode, national: string): string {
  const digits = national.replace(/\D/g, '').slice(0, country.digits + 2) // tolerate over-typing
  if (digits.length === 0) return ''
  switch (country.code) {
    case 'IN': {
      if (digits.length <= 5) return digits
      return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`
    }
    case 'US':
    case 'CA': {
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
    }
    case 'GB': {
      // Simplified — grouped 5+5 for mobile-ish
      if (digits.length <= 5) return digits
      return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`
    }
    default: {
      // Generic: chunks of 3
      const out: string[] = []
      for (let i = 0; i < digits.length; i += 3) {
        out.push(digits.slice(i, i + 3))
      }
      return out.join(' ')
    }
  }
}

/** Format full phone "+91 98765 43210" from country + national. */
export function formatFullPhone(country: CountryDialCode, national: string): string {
  const nat = formatNational(country, national)
  if (!nat) return country.dial
  return `${country.dial} ${nat}`
}

/** Format a stored phone (E.164) into a pretty display string. */
export function formatStoredPhone(stored: string | null | undefined): string {
  if (!stored) return ''
  const { country, national } = splitStoredPhone(stored)
  return formatFullPhone(country, national)
}

/** Returns whether the digits length matches the country's expected length. */
export function isValidPhone(country: CountryDialCode, national: string): boolean {
  const digits = national.replace(/\D/g, '')
  return digits.length === country.digits || digits.length === country.digitsAlt
}

/** Returns E.164 formatted string for storage: "+919876543210". Empty if invalid. */
export function toE164(country: CountryDialCode, national: string): string {
  const digits = national.replace(/\D/g, '')
  if (digits.length === 0) return ''
  return `${country.dial}${digits}`.replace(/\s/g, '')
}
