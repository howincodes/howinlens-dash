import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'AED', symbol: 'د.إ' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
] as const

interface Props {
  amount: string | number | null | undefined
  currency?: string
  onChange: (amount: string, currency: string) => void
  showCurrency?: boolean
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
  invalid?: boolean
}

function formatGroups(value: string): string {
  if (!value) return ''
  const cleaned = value.replace(/[^\d.]/g, '')
  const [intPart, decPart] = cleaned.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart != null ? `${grouped}.${decPart.slice(0, 2)}` : grouped
}

function stripGroups(formatted: string): string {
  return formatted.replace(/,/g, '')
}

export function MoneyInput({
  amount, currency = 'INR', onChange, showCurrency = true, disabled,
  className, placeholder, id, invalid,
}: Props) {
  const [display, setDisplay] = useState(() =>
    amount != null && amount !== '' ? formatGroups(String(amount)) : ''
  )

  // Sync from external value
  useEffect(() => {
    const next = amount != null && amount !== '' ? formatGroups(String(amount)) : ''
    if (next !== display) setDisplay(next)
  }, [amount]) // eslint-disable-line react-hooks/exhaustive-deps

  const onAmountChange = (raw: string) => {
    // allow only digits + 1 decimal point + optional trailing dot during typing
    const cleaned = raw.replace(/[^\d.]/g, '')
    const dotCount = (cleaned.match(/\./g) || []).length
    const safe = dotCount > 1
      ? cleaned.replace(/\./g, (m, i) => (i === cleaned.indexOf('.') ? m : ''))
      : cleaned
    setDisplay(formatGroups(safe))
    onChange(stripGroups(formatGroups(safe)), currency)
  }

  const onCurrencyChange = (c: string) => {
    onChange(stripGroups(display), c)
  }

  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency

  return (
    <div className={cn('relative flex h-9 rounded-md border bg-background', invalid && 'border-rose-500', className)}>
      <span className="flex items-center px-2 text-sm text-muted-foreground border-r font-mono">{symbol}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => onAmountChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 px-2 text-sm bg-transparent outline-none font-mono"
      />
      {showCurrency ? (
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          disabled={disabled}
          className="border-l px-1 text-xs bg-transparent outline-none rounded-r-md"
          aria-label="Currency"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code}</option>
          ))}
        </select>
      ) : null}
    </div>
  )
}
