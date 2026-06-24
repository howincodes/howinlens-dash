import { useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { MODULE_ORDER, MODULES, isModuleVisible } from '@/lib/modules/registry'

interface RailItem {
  to: string
  label: string
  icon: LucideIcon
  /** Match this prefix as the "active" rail item. */
  match: (pathname: string) => boolean
  shortcut?: string
}

function useRailItems(): RailItem[] {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.kind !== 'developer'
  const perms = user?.permissions ?? []

  const items: RailItem[] = []

  // Overview — admin-style cross-hub landing; hidden for sales-only roles
  const canSeeOverview =
    user?.role === 'Admin' ||
    perms.some((p) => p === 'config.view' || p === 'users.view')
  if (canSeeOverview) {
    items.push({
      to: '/overview',
      label: 'Overview',
      icon: LayoutDashboard,
      match: (p) => p === '/' || p === '/overview',
    })
  }

  // Module icons in defined order — gated by visibility helper
  for (const id of MODULE_ORDER) {
    const m = MODULES[id]
    if (!isModuleVisible(m, perms, isAdmin, user?.role)) continue
    items.push({
      to: m.defaultPath,
      label: m.label,
      icon: m.icon,
      match: (p) => p === m.basePath || p.startsWith(`${m.basePath}/`),
    })
  }

  return items
}

export function IconRail() {
  const location = useLocation()
  const navigate = useNavigate()
  const items = useRailItems()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const canSeeSettings =
    user?.role === 'Admin' ||
    (user?.permissions ?? []).some((p) => p === 'config.view' || p === 'users.view')

  // ⌘1..⌘9 / Ctrl+1..9 jumps between rail items.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const n = parseInt(e.key, 10)
      if (Number.isNaN(n) || n < 1 || n > items.length) return
      // Don't hijack browser tab shortcut on browsers that already use it
      if (e.shiftKey || e.altKey) return
      e.preventDefault()
      navigate(items[n - 1].to)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items, navigate])

  return (
    <nav
      aria-label="Modules"
      className="w-[72px] shrink-0 border-r bg-card/40 backdrop-blur-sm hidden md:flex flex-col items-center py-3 gap-1 relative z-30"
    >
      <div className="mb-2">
        <NavLink
          to="/overview"
          aria-label="HowinLens"
          className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
        >
          <span className="font-bold text-sm tracking-tight">HL</span>
        </NavLink>
      </div>

      <div className="flex-1 flex flex-col items-center gap-0.5 w-full px-1">
        {items.map((item, i) => {
          const isActive = item.match(location.pathname)
          const shortcut = i + 1 <= 9 ? `${i + 1}` : null
          return (
            <RailButton
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isActive={isActive}
              shortcut={shortcut ?? undefined}
            />
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-0.5 mt-auto pb-1 w-full px-1">
        {canSeeSettings && (
          <RailButton
            to="/settings"
            label="Settings"
            icon={Settings}
            isActive={location.pathname.startsWith('/settings')}
          />
        )}
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className={cn(
            'group relative w-full rounded-lg flex flex-col items-center justify-center gap-1 py-1.5 transition-colors',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="text-[10px] font-medium leading-none tracking-tight">Log out</span>
        </button>
      </div>
    </nav>
  )
}

function RailButton({
  to,
  label,
  icon: Icon,
  isActive,
  shortcut,
}: {
  to: string
  label: string
  icon: LucideIcon
  isActive: boolean
  shortcut?: string
}) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative w-full rounded-lg flex flex-col items-center justify-center gap-1 py-1.5 transition-colors',
        isActive
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      title={shortcut ? `${label} (⌘${shortcut})` : label}
    >
      {/* Active indicator stripe on the left edge */}
      {isActive && (
        <span
          aria-hidden
          className="absolute -left-1 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
        />
      )}
      <Icon className="w-[18px] h-[18px]" />
      <span className="text-[10px] font-medium leading-none tracking-tight max-w-full truncate px-1">
        {label}
      </span>
    </NavLink>
  )
}
