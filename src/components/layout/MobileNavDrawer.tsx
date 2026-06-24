import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  LogOut,
  X,
  Terminal,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNewTaskStore } from '@/store/newTaskStore'
import {
  HUB_ORDER,
  HUBS,
  isModuleVisible,
  getModuleForPath,
  getVisibleGroups,
} from '@/lib/modules/registry'
import { cn } from '@/lib/utils'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = user?.kind !== 'developer'
  const perms = user?.permissions ?? []
  const activeHub = getModuleForPath(location.pathname)
  const openNewTask = useNewTaskStore((s) => s.openModal)

  // Close drawer whenever the route changes
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const visibleHubs = HUB_ORDER.filter((id) =>
    isModuleVisible(HUBS[id], perms, isAdmin, user?.role),
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r shadow-xl transition-transform md:hidden flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b">
          <Link to="/overview" className="flex items-center gap-2 font-bold">
            <Terminal className="w-5 h-5 text-primary" />
            HowinLens
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Quick actions */}
          <div className="px-3">
            <button
              type="button"
              onClick={() => { openNewTask(); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="flex-1 text-left">New task</span>
            </button>
          </div>

          {/* Cross-cutting */}
          <div className="px-3">
            <NavLink
              to="/overview"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-muted',
                )
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </NavLink>
          </div>

          {/* Hubs */}
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-6 mb-1">
              Hubs
            </div>
            <div className="px-3 space-y-0.5">
              {visibleHubs.map((id) => {
                const hub = HUBS[id]
                const Icon = hub.icon
                const isActive = activeHub?.id === id
                return (
                  <NavLink
                    key={id}
                    to={hub.defaultPath}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/80 hover:bg-muted',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1">{hub.label}</span>
                    {hub.comingSoon ? (
                      <span className="text-[9px] uppercase tracking-wider font-semibold rounded px-1 py-0.5 bg-muted-foreground/10 text-muted-foreground">
                        soon
                      </span>
                    ) : null}
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Active hub sub-items */}
          {activeHub ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-6 mb-1">
                In {activeHub.label}
              </div>
              <div className="px-3 space-y-0.5">
                {getVisibleGroups(activeHub, perms, user?.role).flatMap((g) =>
                  g.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === activeHub.basePath}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-1.5 rounded-md text-xs transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="w-3 h-3 opacity-40" />
                    </NavLink>
                  )),
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t p-3 space-y-1">
          {(user?.role === 'Admin' ||
            perms.some((p) => p === 'config.view' || p === 'users.view')) && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-muted',
                )
              }
            >
              <Settings className="w-4 h-4" />
              Settings
            </NavLink>
          )}
          <button
            type="button"
            onClick={() => {
              logout()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
          {user?.name ? (
            <div className="px-3 pt-2 text-[10px] text-muted-foreground/70">
              Signed in as <span className="font-medium">{user.name}</span>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}
