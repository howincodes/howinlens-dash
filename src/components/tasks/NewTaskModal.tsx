import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { UserPicker, Avatar } from '@/components/ui/user-picker'
import { createTaskApi, getProjects, getUsers } from '@/lib/api'

// Global "New Task" modal — available from the Header chevron and from
// the user-profile "Assign task to user" shortcut. Project is optional;
// omitting it routes the task to the assignee's Inbox project on the
// server.

interface Project {
  id: number
  name: string
  isInbox?: boolean
}

export function NewTaskModal({
  open,
  onClose,
  onCreated,
  defaultAssigneeId,
  defaultProjectId,
  lockAssignee,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (taskId: number) => void
  defaultAssigneeId?: number | null
  defaultProjectId?: number | null
  /** When true, the user picker is fixed to defaultAssigneeId (used when invoked from a profile). */
  lockAssignee?: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium')
  const [assigneeId, setAssigneeId] = useState<number | null>(null)
  const [projectId, setProjectId] = useState<number | null>(null)
  const [dueAt, setDueAt] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setTitle('')
    setDescription('')
    setPriority('medium')
    setAssigneeId(defaultAssigneeId ?? null)
    setProjectId(defaultProjectId ?? null)
    setDueAt('')
    getProjects()
      .then((arr: unknown) => {
        if (Array.isArray(arr)) setProjects(arr as Project[])
      })
      .catch(() => { /* ignore */ })
  }, [open, defaultAssigneeId, defaultProjectId])

  // Keyboard escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const submit = async () => {
    if (!title.trim()) { setError('Title required'); return }
    if (!assigneeId && !projectId) {
      setError('Pick an assignee or a project')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload: Parameters<typeof createTaskApi>[0] = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        ...(assigneeId ? { assigneeId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
      }
      const task: unknown = await createTaskApi(payload)
      const id = (task as { id?: number })?.id
      toast.success(projectId ? 'Task created' : 'Task added to Inbox')
      onCreated?.(id ?? 0)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-12"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md mx-4 rounded-lg border bg-card shadow-xl">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> New task
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">esc</button>
        </div>

        <div className="p-5 space-y-3">
          <Field label="Title" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional context"
              className="w-full rounded-md border bg-background p-2 text-sm resize-y"
            />
          </Field>

          <Field
            label="Assignee"
            hint={projectId ? undefined : 'No project picked → goes to assignee\'s Inbox'}
          >
            {lockAssignee && defaultAssigneeId
              ? <LockedAssigneeChip userId={defaultAssigneeId} />
              : (
                <UserPicker
                  value={assigneeId}
                  onChange={(v) => setAssigneeId(v)}
                  placeholder="Assign to…"
                />
              )}
          </Field>

          <Field label="Project" hint="Optional — leave blank to land in the assignee's personal Inbox">
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">— No project (Inbox) —</option>
              {projects.filter((p) => !p.isInbox).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              />
            </Field>
          </div>

          {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !title.trim()}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? 'Creating…' : 'Create task'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LockedAssigneeChip({ userId }: { userId: number }) {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getUsers()
      .then((arr: unknown) => {
        if (cancelled || !Array.isArray(arr)) return
        const u = (arr as Array<{ id: number; name: string }>).find((x) => x.id === userId)
        setName(u?.name ?? null)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [userId])
  return (
    <div className="h-9 rounded-md border bg-muted/30 px-2 text-sm flex items-center gap-2">
      <Avatar name={name ?? `U${userId}`} size="sm" />
      <span className="font-medium">{name ?? `User #${userId}`}</span>
      <span className="text-[10px] text-muted-foreground ml-auto">locked</span>
    </div>
  )
}
