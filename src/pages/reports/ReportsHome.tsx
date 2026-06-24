import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  LineChart,
  Brain,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { getLeaderboard, getAiLogs } from '@/lib/api'

interface Tile {
  to: string
  icon: LucideIcon
  title: string
  blurb: string
}

const TILES: Tile[] = [
  {
    to: '/reports/analytics',
    icon: LineChart,
    title: 'Analytics',
    blurb: 'Cross-team dashboards: prompts, credit burn, focus, model mix.',
  },
  {
    to: '/reports/ai-insights',
    icon: Brain,
    title: 'AI insights',
    blurb: 'Generated summaries per day, week, and activity window.',
  },
]

export default function ReportsHome() {
  const [stats, setStats] = useState<{
    promptsLast7d: number | null
    aiCallsLast24h: number | null
    activeContributorsLast7d: number | null
  }>({
    promptsLast7d: null,
    aiCallsLast24h: null,
    activeContributorsLast7d: null,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getLeaderboard(7).catch(() => null),
      getAiLogs({ limit: 1 }).catch(() => null),
    ]).then(([leaderRes, logsRes]) => {
      if (cancelled) return
      const leaderData =
        (leaderRes as any)?.data ||
        (leaderRes as any)?.leaderboard ||
        (Array.isArray(leaderRes) ? leaderRes : [])
      const promptsLast7d = leaderData.reduce(
        (acc: number, e: any) => acc + Number(e?.prompts || 0),
        0,
      )
      const activeContributorsLast7d = leaderData.filter(
        (e: any) => Number(e?.prompts || 0) > 0,
      ).length

      // getAiLogs returns { entries, total } or { data, total }
      const aiTotal =
        (logsRes as any)?.total ??
        (logsRes as any)?.count ??
        ((logsRes as any)?.data?.length || 0)
      setStats({
        promptsLast7d,
        aiCallsLast24h: Number(aiTotal || 0),
        activeContributorsLast7d,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground max-w-prose">
          Analytics dashboards and AI-generated insights drawn from the
          unified activity stream.
        </p>
      </header>

      {/* ─── Quick-look metrics ─────────────────────────────── */}
      <section className="grid gap-3 md:grid-cols-3">
        <Metric
          icon={Sparkles}
          label="Prompts (last 7d)"
          value={stats.promptsLast7d}
        />
        <Metric
          icon={Brain}
          label="AI calls logged (server-side)"
          value={stats.aiCallsLast24h}
          suffix="total"
        />
        <Metric
          icon={LineChart}
          label="Active contributors (7d)"
          value={stats.activeContributorsLast7d}
        />
      </section>

      {/* ─── Tile launcher ──────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2">
        {TILES.map((t) => {
          const Icon = t.icon
          return (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-lg border bg-card/50 hover:bg-card hover:shadow-md transition-all p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-semibold text-base mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.blurb}
              </p>
              <div className="mt-4 pt-4 border-t flex items-center text-xs font-medium text-primary">
                Open
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

interface MetricProps {
  icon: LucideIcon
  label: string
  value: number | null
  suffix?: string
}

function Metric({ icon: Icon, label, value, suffix }: MetricProps) {
  return (
    <div className="rounded-lg border bg-card/50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
          {label}
        </div>
        <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />
      </div>
      <div className="flex items-baseline gap-1.5">
        {value === null ? (
          <div className="h-7 w-12 rounded bg-muted animate-pulse" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums">
            {value.toLocaleString()}
          </span>
        )}
        {suffix ? (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    </div>
  )
}
