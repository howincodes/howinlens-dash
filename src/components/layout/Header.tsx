import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  Search,
  ChevronRight,
  Menu,
  User,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { getModuleForPath, findActiveItem } from '@/lib/modules/registry'
import { cn } from '@/lib/utils'
import { useNewTaskStore } from '@/store/newTaskStore'

interface Crumb {
  label: string
  href?: string
}

function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation()

  if (pathname === '/' || pathname === '/overview') {
    return [{ label: 'Overview' }]
  }

  if (pathname.startsWith('/settings')) {
    const tail = pathname.replace(/^\/settings\/?/, '').split('/')[0]
    const tailLabel = tail
      ? tail.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'General'
    return [
      { label: 'Settings', href: '/settings' },
      { label: tailLabel },
    ]
  }

  const module = getModuleForPath(pathname)
  if (!module) return [{ label: 'HowinLens' }]

  const crumbs: Crumb[] = [{ label: module.label, href: module.defaultPath }]
  const active = findActiveItem(module, pathname)
  if (active) {
    for (const group of module.groups) {
      const item = group.items.find((i) => i.path === active.itemPath)
      if (item) {
        if (!group.standalone) crumbs.push({ label: group.label })
        if (item.path !== module.defaultPath) crumbs.push({ label: item.label })
        break
      }
    }
  }
  return crumbs
}

interface HeaderProps {
  onOpenMobileNav?: () => void
}

export function Header({ onOpenMobileNav }: HeaderProps = {}) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const crumbs = useBreadcrumbs()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const openNewTask = useNewTaskStore((s) => s.openModal)

  useEffect(() => {
    if (!menuOpen) return
    const handleDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleDocClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleDocClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [menuOpen])

  // ⌘K placeholder — Phase D wires this to a real palette
  const openCommandPalette = () => {
    // Intentionally inert in Phase A. Toast lightly rather than crash.
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.info('[command palette] coming soon — Phase D')
    }
  }

  return (
    <header className="h-14 md:h-16 border-b flex items-center justify-between px-3 md:px-6 bg-background/95 backdrop-blur z-10 sticky top-0 gap-3">
      {onOpenMobileNav ? (
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
          className="md:hidden p-2 -ml-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      ) : null}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1 flex items-center text-sm">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <div key={`${c.label}-${i}`} className="flex items-center min-w-0">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 mx-2 text-muted-foreground/60 shrink-0" />
              )}
              {c.href && !isLast ? (
                <a
                  href={c.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {c.label}
                </a>
              ) : (
                <span
                  className={
                    isLast ? 'font-medium text-foreground truncate' : 'text-muted-foreground truncate'
                  }
                >
                  {c.label}
                </span>
              )}
            </div>
          )
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border bg-card/40 hover:bg-card text-xs text-muted-foreground transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground/70">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => openNewTask()}
          className="hidden md:inline-flex"
          aria-label="Create new task"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New task
        </Button>

        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-md transition-colors',
              menuOpen ? 'bg-muted' : 'hover:bg-muted',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {(user?.name || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden lg:block min-w-0 text-left">
              <div className="text-xs font-medium leading-tight truncate max-w-[140px]">
                {user?.name || 'Admin'}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight truncate max-w-[140px]">
                {user?.role || 'Member'}
              </div>
            </div>
            <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-lg py-1 z-50"
            >
              <div className="px-3 py-2 border-b">
                <div className="text-xs font-medium truncate">
                  {user?.name || 'Admin'}
                </div>
                {user?.email ? (
                  <div className="text-[11px] text-muted-foreground truncate">
                    {user.email}
                  </div>
                ) : null}
              </div>
              <Link
                to="/me/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                My profile
              </Link>
              {(user?.role === 'Admin' ||
                (user?.permissions ?? []).some(
                  (p) => p === 'config.view' || p === 'users.view',
                )) && (
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  Settings
                </Link>
              )}
              <div className="border-t my-1" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
