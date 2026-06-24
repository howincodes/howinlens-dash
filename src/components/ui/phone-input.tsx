import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  COUNTRIES, DEFAULT_COUNTRY, type CountryDialCode,
  formatNational, splitStoredPhone, toE164, isValidPhone, normalizePhone,
} from '@/lib/phone'
import { cn } from '@/lib/utils'

interface Props {
  /** Stored E.164 value (e.g. "+919876543210"). */
  value: string | null | undefined
  /** Called with E.164 string (or '' if cleared). */
  onChange: (e164: string) => void
  /** Optional onBlur for validation timing. */
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  id?: string
  autoFocus?: boolean
}

export function PhoneInput({
  value, onChange, onBlur, placeholder, disabled, invalid, className, id, autoFocus,
}: Props) {
  const [{ country, national }, setSplit] = useState(() => splitStoredPhone(value))
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync from external value changes
  useEffect(() => {
    const next = splitStoredPhone(value)
    if (next.country.code !== country.code || next.national !== national) {
      setSplit(next)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const updateNational = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, (country.digits ?? 15) + 2)
    setSplit({ country, national: digits })
    onChange(toE164(country, digits))
  }

  const updateCountry = (c: CountryDialCode) => {
    setSplit({ country: c, national })
    onChange(toE164(c, national))
    setOpen(false)
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const filtered = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES

  const display = formatNational(country, national)
  const isValid = national.length === 0 || isValidPhone(country, national)

  return (
    <div className={cn('relative flex h-9 rounded-md border bg-background', invalid && 'border-rose-500', !isValid && 'border-amber-500/50', className)} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1 px-2 border-r text-sm hover:bg-muted transition-colors rounded-l-md"
        aria-label={`Select country code (current: ${country.name})`}
      >
        <span className="text-base leading-none">{country.flag}</span>
        <span className="font-mono text-xs text-muted-foreground">{country.dial}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="numeric"
        value={display}
        onChange={(e) => updateNational(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder ?? formatNational(country, '9'.repeat(country.digits))}
        disabled={disabled}
        autoFocus={autoFocus}
        className="flex-1 px-2 text-sm bg-transparent outline-none rounded-r-md"
      />
      {open ? (
        <div className="absolute top-full left-0 z-30 mt-1 w-72 rounded-md border bg-popover shadow-lg overflow-hidden">
          <input
            type="search"
            placeholder="Search country or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full h-8 px-2 border-b text-sm bg-background outline-none"
          />
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => updateCountry(c)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left',
                    c.code === country.code && 'bg-muted/50',
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground italic">No match</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

void DEFAULT_COUNTRY
void normalizePhone
