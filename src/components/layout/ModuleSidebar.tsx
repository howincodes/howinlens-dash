import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWSStore } from '@/hooks/useWebSockets'
import { getModuleForPath, getVisibleGroups } from '@/lib/modules/registry'
import type { HubDef, HubId, NavGroup } from '@/lib/modules/types'
import { useAuthStore } from '@/store/authStore'

const STORAGE_PREFIX = 'howinlens.sidebar.expanded'

function loadExpanded(hubId: HubId): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}.${hubId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object')
      return parsed as Record<string, boolean>
  } catch {}
  return {}
}

function saveExpanded(hubId: HubId, state: Record<string, boolean>) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}.${hubId}`, JSON.stringify(state))
  } catch {}
}

/**
 * One-time migration of the legacy single-key expanded state into the new
 * per-module storage. Maps each legacy group id onto its module.
 */
function migrateLegacy() {
  try {
    // Wipe legacy keys from prior IA iterations.
    localStorage.removeItem('howinlens.sidebar.expanded')
    for (const id of ['ops', 'hr', 'crm']) {
      localStorage.removeItem(`${STORAGE_PREFIX}.${id}`)
    }
  } catch {}
}

function findActiveGroupId(groups: NavGroup[], pathname: string): string | null {
  let bestGroup: string | null = null
  let bestLen = -1
  for (const group of groups) {
    for (const item of group.items) {
      if (
        pathname === item.path ||
        (item.path !== '/' && pathname.startsWith(item.path))
      ) {
        if (item.path.length > bestLen) {
          bestLen = item.path.length
          bestGroup = group.id
        }
      }
    }
  }
  return bestGroup
}

export function ModuleSidebar() {
  const location = useLocation()
  const wsStatus = useWSStore((s) => s.status)

  const userPerms = useAuthStore((s) => s.user?.permissions ?? [])
  const userRole = useAuthStore((s) => s.user?.role)

  // Resolve the active hub from the URL. Returns null on /overview, /settings,
  // /me, etc. — those screens render their own context (or none).
  const activeHub = useMemo<HubDef | null>(
    () => getModuleForPath(location.pathname),
    [location.pathname],
  )

  const visibleGroups = useMemo<NavGroup[]>(
    () => (activeHub ? getVisibleGroups(activeHub, userPerms, userRole) : []),
    [activeHub, userPerms, userRole],
  )

  useEffect(() => {
    migrateLegacy()
  }, [])

  const [expandedByHub, setExpandedByHub] = useState<
    Partial<Record<HubId, Record<string, boolean>>>
  >({})

  // Lazy-load the expanded map for the active hub on first encounter,
  // defaulting to all groups expanded.
  useEffect(() => {
    if (!activeHub) return
    setExpandedByHub((prev) => {
      if (prev[activeHub.id]) return prev
      const stored = loadExpanded(activeHub.id)
      const defaults: Record<string, boolean> = {}
      for (const g of visibleGroups) {
        if (g.standalone) continue
        defaults[g.id] = stored[g.id] ?? true
      }
      return { ...prev, [activeHub.id]: defaults }
    })
  }, [activeHub, visibleGroups])

  const expanded = activeHub ? (expandedByHub[activeHub.id] ?? {}) : {}

  const activeGroupId = useMemo(
    () => findActiveGroupId(visibleGroups, location.pathname),
    [visibleGroups, location.pathname],
  )

  // Auto-expand the group containing the current route.
  useEffect(() => {
    if (!activeHub || !activeGroupId) return
    setExpandedByHub((prev) => {
      const cur = prev[activeHub.id] ?? {}
      if (cur[activeGroupId]) return prev
      const next = { ...cur, [activeGroupId]: true }
      saveExpanded(activeHub.id, next)
      return { ...prev, [activeHub.id]: next }
    })
  }, [activeGroupId, activeHub])

  const toggleGroup = (id: string) => {
    if (!activeHub) return
    setExpandedByHub((prev) => {
      const cur = prev[activeHub.id] ?? {}
      const next = { ...cur, [id]: !cur[id] }
      saveExpanded(activeHub.id, next)
      return { ...prev, [activeHub.id]: next }
    })
  }

  if (!activeHub) return null

  return (
    <aside className="w-60 border-r bg-card/50 backdrop-blur-sm flex-col hidden md:flex">
      <div className="h-16 flex items-center px-5 border-b gap-2.5">
        <activeHub.icon className="w-[18px] h-[18px] text-primary" />
        <div className="min-w-0">
          <div className="font-semibold text-sm tracking-tight leading-tight truncate">
            {activeHub.label}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {activeHub.comingSoon ? 'Coming soon' : 'Hub'}
          </div>
        </div>
      </div>

      <div className="flex-1 py-3 overflow-y-auto px-2 space-y-0.5">
        {visibleGroups.map((group) => {
          if (group.standalone) {
            const item = group.items[0]
            return (
              <NavLink
                key={group.id}
                to={item.path}
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </NavLink>
            )
          }

          const isExpanded = !!expanded[group.id]
          const isActiveGroup = activeGroupId === group.id
          const Chevron = isExpanded ? ChevronDown : ChevronRight
          return (
            <div key={group.id} className="pt-2 first:pt-0">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isExpanded}
                className={cn(
                  'w-full flex items-center px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-colors',
                  isActiveGroup
                    ? 'text-foreground'
                    : 'text-muted-foreground/80 hover:text-foreground',
                )}
              >
                <group.icon className="w-3.5 h-3.5 mr-2 opacity-70" />
                <span className="flex-1 text-left">{group.label}</span>
                <Chevron className="w-3.5 h-3.5 opacity-60" />
              </button>
              {isExpanded && (
                <nav className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === activeHub.basePath}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center pl-9 pr-3 py-2 text-sm font-medium rounded-md transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              )}
            </div>
          )
        })}

        {activeHub.comingSoon && (
          <div className="mt-4 mx-2 p-3 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/30 leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1 text-foreground/80 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              In design
            </div>
            Full hub pages land in a later phase. The placement is locked in
            so links and lenses won't move when content fills in.
          </div>
        )}
      </div>

      <div className="p-4 border-t mt-auto">
        <div className="flex items-center text-xs text-muted-foreground">
          <span className="relative flex h-2.5 w-2.5 mr-2">
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                wsStatus === 'connected'
                  ? 'bg-green-400'
                  : wsStatus === 'reconnecting'
                    ? 'bg-yellow-400'
                    : 'bg-red-400',
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-2.5 w-2.5',
                wsStatus === 'connected'
                  ? 'bg-green-500'
                  : wsStatus === 'reconnecting'
                    ? 'bg-yellow-500'
                    : 'bg-red-500',
              )}
            />
          </span>
          <span className="capitalize">{wsStatus}</span>
        </div>
      </div>
    </aside>
  )
}
