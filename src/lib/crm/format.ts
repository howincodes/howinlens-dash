import type { CrmLeadStatus, CrmLeadTemperature, CrmOutreachKind } from './types'

// ── Temperature ──────────────────────────────────────────
export function tempDot(t: CrmLeadTemperature): string {
  switch (t) {
    case 'hot':  return '🔥'
    case 'warm': return '🌤'
    case 'cold': return '❄'
    case 'dead': return '💀'
  }
}

export function tempLabel(t: CrmLeadTemperature): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function tempColor(t: CrmLeadTemperature): string {
  switch (t) {
    case 'hot':  return 'text-red-500'
    case 'warm': return 'text-amber-500'
    case 'cold': return 'text-sky-500'
    case 'dead': return 'text-muted-foreground'
  }
}

export function tempBg(t: CrmLeadTemperature): string {
  switch (t) {
    case 'hot':  return 'bg-red-500/10 text-red-600 border-red-500/30'
    case 'warm': return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    case 'cold': return 'bg-sky-500/10 text-sky-600 border-sky-500/30'
    case 'dead': return 'bg-muted text-muted-foreground border-border'
  }
}

// ── Status ───────────────────────────────────────────────
export function statusLabel(s: CrmLeadStatus): string {
  switch (s) {
    case 'new': return 'New'
    case 'contacted': return 'Contacted'
    case 'qualified': return 'Qualified'
    case 'negotiating': return 'Negotiating'
    case 'won': return 'Won'
    case 'lost': return 'Lost'
    case 'on_followup': return 'On Followup'
    case 'dropped': return 'Dropped'
  }
}

export function statusColor(s: CrmLeadStatus): string {
  switch (s) {
    case 'new':         return 'bg-slate-500/10 text-slate-600 border-slate-500/30'
    case 'contacted':   return 'bg-blue-500/10 text-blue-600 border-blue-500/30'
    case 'qualified':   return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    case 'negotiating': return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    case 'won':         return 'bg-green-500/10 text-green-700 border-green-500/30'
    case 'lost':        return 'bg-rose-500/10 text-rose-600 border-rose-500/30'
    case 'on_followup': return 'bg-violet-500/10 text-violet-600 border-violet-500/30'
    case 'dropped':     return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
  }
}

// ── Outreach kind icons / labels ─────────────────────────
export function outreachKindLabel(k: CrmOutreachKind): string {
  switch (k) {
    case 'note': return 'Note'
    case 'call': return 'Call'
    case 'whatsapp': return 'WhatsApp'
    case 'email': return 'Email'
    case 'meeting': return 'Meeting'
    case 'sms': return 'SMS'
    case 'status_change': return 'Status changed'
    case 'temperature_change': return 'Temperature changed'
    case 'assignment': return 'Assigned'
    case 'source_change': return 'Source changed'
  }
}

// ── Money / dates ────────────────────────────────────────
export function fmtMoney(amount: string | number | null | undefined, currency = 'INR'): string {
  if (amount == null) return '—'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(n) || n === 0) return '—'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${currency} ${Math.round(n)}`
  }
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function fmtFollowupCountdown(iso: string | null | undefined): {
  text: string
  tone: 'overdue' | 'due_today' | 'soon' | 'later' | 'none'
} {
  if (!iso) return { text: 'No follow-up', tone: 'none' }
  const target = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = target - now
  const oneDay = 24 * 60 * 60 * 1000
  if (diffMs < -oneDay) {
    const days = Math.floor(-diffMs / oneDay)
    return { text: `${days}d overdue`, tone: 'overdue' }
  }
  if (diffMs < 0) {
    const hours = Math.floor(-diffMs / (60 * 60 * 1000))
    return { text: `${Math.max(1, hours)}h overdue`, tone: 'overdue' }
  }
  if (diffMs < oneDay) {
    return { text: 'Due today', tone: 'due_today' }
  }
  if (diffMs < 3 * oneDay) {
    const days = Math.ceil(diffMs / oneDay)
    return { text: `In ${days}d`, tone: 'soon' }
  }
  const days = Math.ceil(diffMs / oneDay)
  return { text: `In ${days}d`, tone: 'later' }
}
