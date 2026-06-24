import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUsers, updateUser, deleteUser } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  AlertCircle,
  UsersRound,
  ChevronRight,
} from 'lucide-react'
import { AddUserModal } from '@/components/AddUserModal'
import { ConfirmActionModal } from '@/components/ConfirmActionModal'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

// Single employees directory with a role filter. No AI-ops surfaces
// (prompts, credits, watch status) — those were removed in the ERP pivot.

export default function PeopleDirectory() {
  const navigate = useNavigate()
  const authUser = useAuthStore((s) => s.user)
  const perms = authUser?.permissions ?? []
  const isAdmin = authUser?.role === 'Admin'
  const canManage = isAdmin || perms.includes('users.manage') || perms.includes('users.create')
  const canDelete = isAdmin || perms.includes('users.delete')

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ user: any; action: 'deactivated' | 'active' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const res = await getUsers()
      setUsers((res as any[]) || [])
    } catch (err) {
      console.error('Failed to load people', err)
      setError('Failed to load people. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async (user: any) => {
    setDeleting(true)
    try {
      await deleteUser(user.id)
      setDeleteConfirm(null)
      loadData()
    } catch (_err) {
      alert('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const handleQuickAction = async (user: any, action: 'deactivated' | 'active') => {
    try {
      await updateUser(user.id, { status: action })
      loadData()
    } catch (_err) {
      /* ConfirmActionModal handles its own errors */
    }
  }

  // Distinct roles present in the data → filter chips
  const roles = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) if (u.role) set.add(u.role)
    return Array.from(set).sort()
  }, [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => roleFilter === 'all' || u.role === roleFilter)
      .filter((u) =>
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? u.status === 'active'
            : u.status !== 'active',
      )
      .filter((u) => {
        if (!q) return true
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [users, roleFilter, statusFilter, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 p-4 md:p-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UsersRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight leading-none">Employees</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
              {roleFilter !== 'all' ? ` · ${roleFilter}` : ''}
            </p>
          </div>
        </div>
        {canManage ? (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add person
          </Button>
        ) : null}
      </header>

      {/* Role filter chips */}
      <nav aria-label="Roles" className="flex items-center gap-1.5 flex-wrap border-b pb-3">
        <RoleChip label="All" active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} count={users.length} />
        {roles.map((r) => (
          <RoleChip
            key={r}
            label={r}
            active={roleFilter === r}
            onClick={() => setRoleFilter(r)}
            count={users.filter((u) => u.role === r).length}
          />
        ))}
      </nav>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone…"
            className="pl-9 bg-muted/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="deactivated">Deactivated only</option>
        </select>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">
            {search ? 'No people matching your search.' : 'No people yet.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {filtered.map((u) => (
              <PersonRow
                key={u.id}
                user={u}
                canManage={canManage}
                canDelete={canDelete}
                onActivate={() => setConfirmAction({ user: u, action: 'active' })}
                onDeactivate={() => setConfirmAction({ user: u, action: 'deactivated' })}
                onDelete={() => setDeleteConfirm(u)}
                onOpen={() => navigate(`/people/${u.id}`)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      {showAddModal ? (
        <AddUserModal onClose={() => setShowAddModal(false)} onSuccess={loadData} />
      ) : null}

      {confirmAction ? (
        <ConfirmActionModal
          user={confirmAction.user}
          action={confirmAction.action}
          onClose={() => setConfirmAction(null)}
          onSuccess={() => {
            setConfirmAction(null)
            handleQuickAction(confirmAction.user, confirmAction.action)
            loadData()
          }}
        />
      ) : null}

      {deleteConfirm ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-lg border-destructive/20 p-6">
            <h3 className="text-lg font-semibold text-center">Delete person</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Permanently delete <strong>{deleteConfirm.name}</strong>? Cannot be undone.
            </p>
            <div className="flex justify-center gap-2 mt-5">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete permanently
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function RoleChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors border',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card hover:bg-muted text-foreground/80 border-transparent',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'text-[10px] font-mono px-1 py-0.5 rounded',
          active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}

interface PersonRowProps {
  user: any
  canManage: boolean
  canDelete: boolean
  onActivate: () => void
  onDeactivate: () => void
  onDelete: () => void
  onOpen: () => void
}

function PersonRow({ user, canManage, canDelete, onActivate, onDeactivate, onDelete, onOpen }: PersonRowProps) {
  const initials =
    (user.name || user.email || '?')
      .split(/\s+/)
      .map((p: string) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  const joined = user.joinedAt || user.createdAt
  const joinedLabel = joined ? format(new Date(joined), 'MMM d, yyyy') : null

  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
      <button type="button" onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
            user.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Link
              to={`/people/${user.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium hover:underline truncate"
            >
              {user.name || user.email}
            </Link>
            {user.role ? (
              <Badge variant="secondary" className="text-[10px]">{user.role}</Badge>
            ) : null}
            {user.status !== 'active' ? (
              <Badge variant="destructive" className="text-[10px]">{user.status}</Badge>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-2 flex-wrap">
            {user.email ? <span>{user.email}</span> : null}
            {user.phone ? (<><span>·</span><span>{user.phone}</span></>) : null}
            {joinedLabel ? (<><span>·</span><span>joined {joinedLabel}</span></>) : null}
          </div>
        </div>
      </button>

      {canManage ? (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {user.status === 'active' ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-amber-600 hover:text-amber-700"
              title="Deactivate"
              onClick={(e) => { e.stopPropagation(); onDeactivate() }}
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700"
              title="Activate"
              onClick={(e) => { e.stopPropagation(); onActivate() }}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
    </div>
  )
}
