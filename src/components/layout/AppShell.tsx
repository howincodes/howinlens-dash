import { Outlet, Navigate } from 'react-router-dom'
import { Suspense, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { IconRail } from './IconRail'
import { ModuleSidebar } from './ModuleSidebar'
import { Header } from './Header'
import { MobileNavDrawer } from './MobileNavDrawer'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket, useWSStore } from '@/hooks/useWebSockets'
import { getMe } from '@/lib/api'
import { NewTaskModal } from '@/components/tasks/NewTaskModal'
import { useNewTaskStore } from '@/store/newTaskStore'

function Toaster() {
  const events = useWSStore((s) => s.events)
  const [toasts, setToasts] = useState<any[]>([])
  const [lastSeen, setLastSeen] = useState(Date.now())

  useEffect(() => {
    const newEvents = events.filter(
      (e) =>
        e.timestamp > lastSeen &&
        ['prompt_blocked', 'user_deactivated'].includes(e.type),
    )
    if (newEvents.length > 0) {
      newEvents.forEach((evt) => {
        const id = Date.now() + Math.random()
        setToasts((curr) => [...curr, { id, ...evt }])
        setTimeout(() => {
          setToasts((curr) => curr.filter((t) => t.id !== id))
        }, 5000)
      })
      setLastSeen(Date.now())
    }
  }, [events, lastSeen])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-destructive text-destructive-foreground shadow-lg px-4 py-3 rounded-md flex items-start gap-3 min-w-[300px] animate-in slide-in-from-right"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm capitalize">
              {t.type.replace(/_/g, ' ')}
            </p>
            <p className="text-xs opacity-90 mt-1">
              {t.payload?.user?.name || t.payload?.user_id} triggered an alert.
            </p>
          </div>
          <button
            onClick={() => setToasts((c) => c.filter((x) => x.id !== t.id))}
            className="text-destructive-foreground/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function AppShell() {
  const token = useAuthStore((s) => s.token)
  const setPermissions = useAuthStore((s) => s.setPermissions)
  const userId = useAuthStore((s) => s.user?.id)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useWebSocket()

  // Refresh permissions on mount so a stale persisted session (from before
  // permissions were stored in the user object) gets up-to-date access keys.
  useEffect(() => {
    if (!token || !userId) return
    let cancelled = false
    getMe()
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data?.permissions)) setPermissions(data.permissions)
      })
      .catch(() => {
        // /auth/me failure is non-fatal — UI falls back to legacy admin
        // visibility (all modules visible). 401 will be handled by the
        // global fetch wrapper if it logs the user out.
      })
    return () => {
      cancelled = true
    }
  }, [token, userId, setPermissions])

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <IconRail />
      <ModuleSidebar />
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <GlobalNewTaskHost />
      <Toaster />
    </div>
  )
}

function GlobalNewTaskHost() {
  const open = useNewTaskStore((s) => s.open)
  const close = useNewTaskStore((s) => s.closeModal)
  const defaultAssigneeId = useNewTaskStore((s) => s.defaultAssigneeId)
  const defaultProjectId = useNewTaskStore((s) => s.defaultProjectId)
  const lockAssignee = useNewTaskStore((s) => s.lockAssignee)
  return (
    <NewTaskModal
      open={open}
      onClose={close}
      defaultAssigneeId={defaultAssigneeId}
      defaultProjectId={defaultProjectId}
      lockAssignee={lockAssignee}
    />
  )
}
