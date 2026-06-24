import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  TrendingUp,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { crmReportOverview } from '@/lib/crm/client'
import type { CrmOverviewKpis } from '@/lib/crm/types'
import { fmtMoney } from '@/lib/crm/format'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { HUBS, HUB_ORDER, isModuleVisible } from '@/lib/modules/registry'
import { getUsers } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * ERP landing page. Shows a greeting, quick navigation into the hubs the user
 * can access, and a couple of headline stats (team size, CRM pulse) when the
 * user has the relevant permissions. Deliberately free of the old AI-ops tiles
 * (credential pool, watchers, recent prompts) — those features are gone.
 */
export default function Overview() {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const isAdmin = user?.role === 'Admin'

  const canSeeTeam = isAdmin || perms.includes('users.view')
  const canSeeCrm = isAdmin || perms.some((p) => p.startsWith('crm.'))

  const [teamCount, setTeamCount] = useState<number | null>(null)
  const [crm, setCrm] = useState<CrmOverviewKpis | null>(null)

  useEffect(() => {
    if (!canSeeTeam) return
    getUsers()
      .then((rows: unknown) => setTeamCount(Array.isArray(rows) ? rows.length : null))
      .catch(() => setTeamCount(null))
  }, [canSeeTeam])

  useEffect(() => {
    if (!canSeeCrm) return
    crmReportOverview()
      .then(setCrm)
      .catch(() => setCrm(null))
  }, [canSeeCrm])

  const visibleHubs = useMemo(
    () =>
      HUB_ORDER.map((id) => HUBS[id]).filter((h) =>
        isModuleVisible(h, perms, true, user?.role),
      ),
    [perms, user?.role],
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's your workspace at a glance.
        </p>
      </div>

      {/* CRM pulse — only for users with CRM access */}
      {canSeeCrm && (
        <section>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70 mb-3">
            Sales pulse
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              icon={CalendarIcon}
              label="Due today"
              value={crm ? String(crm.dueToday) : '—'}
              tone="sky"
            />
            <StatTile
              icon={TrendingUp}
              label="New this week"
              value={crm ? String(crm.newThisWeek) : '—'}
              tone="violet"
            />
            <StatTile
              icon={Flame}
              label="Hot leads"
              value={crm ? String(crm.hotLeads) : '—'}
              tone="amber"
            />
            <StatTile
              icon={Trophy}
              label="Won this month"
              value={crm ? `${crm.wonThisMonth.count} · ${fmtMoney(crm.wonThisMonth.value)}` : '—'}
              tone="emerald"
            />
          </div>
        </section>
      )}

      {/* Team headcount */}
      {canSeeTeam && (
        <section>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70 mb-3">
            Team
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              icon={UsersRound}
              label="People"
              value={teamCount === null ? '—' : String(teamCount)}
              tone="sky"
            />
          </div>
        </section>
      )}

      {/* Hub navigation */}
      <section>
        <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70 mb-3">
          Jump to
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleHubs.map((hub) => {
            const Icon = hub.icon
            return (
              <Link key={hub.id} to={hub.defaultPath}>
                <Card className="p-4 hover:border-primary/40 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm flex items-center gap-1">
                        {hub.label}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {hub.description ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {hub.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

const TONES: Record<string, string> = {
  sky: 'bg-sky-500/10 text-sky-600',
  violet: 'bg-violet-500/10 text-violet-600',
  amber: 'bg-amber-500/10 text-amber-600',
  emerald: 'bg-emerald-500/10 text-emerald-600',
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: keyof typeof TONES | string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <span className={cn('w-7 h-7 rounded-md flex items-center justify-center', TONES[tone] ?? TONES.sky)}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </Card>
  )
}
