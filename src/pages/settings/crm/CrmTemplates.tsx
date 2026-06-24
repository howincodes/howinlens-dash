import { useEffect, useState } from 'react'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SideSheet } from '@/pages/sales/components/SideSheet'
import { confirm } from '@/components/ui/confirm-dialog'
import {
  crmListTemplates, crmCreateTemplate, crmUpdateTemplate, crmDeleteTemplate, crmListPipelines,
} from '@/lib/crm/client'
import type { CrmOutreachTemplate, CrmPipeline, CrmTemplateChannel } from '@/lib/crm/types'

const CHANNELS: CrmTemplateChannel[] = ['whatsapp', 'email', 'sms', 'note']

export default function CrmTemplates() {
  const [templates, setTemplates] = useState<CrmOutreachTemplate[]>([])
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CrmOutreachTemplate | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = () => {
    setLoading(true)
    Promise.all([crmListTemplates(), crmListPipelines()])
      .then(([t, p]) => {
        setTemplates(t.templates)
        setPipelines(p.pipelines)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const remove = async (id: number, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: 'Templates are soft-deleted; existing outreach events keep their template_id reference.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteTemplate(id)
      toast.success('Template deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New template
        </Button>
      </div>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No templates yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {t.channel}{t.pipelineId ? ` · pipeline #${t.pipelineId}` : ''}{!t.active ? ' · inactive' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                    {t.body}
                  </div>
                  {t.variables.length > 0 ? (
                    <div className="flex gap-1 mt-2">
                      {t.variables.map((v) => (
                        <span key={v} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(t.id, t.name)} className="p-1 text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TemplateSheet
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null) }}
        editing={editing}
        pipelines={pipelines}
        onSaved={() => { setCreating(false); setEditing(null); refresh() }}
      />
    </div>
  )
}

function TemplateSheet({
  open, onClose, editing, pipelines, onSaved,
}: {
  open: boolean
  onClose: () => void
  editing: CrmOutreachTemplate | null
  pipelines: CrmPipeline[]
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [channel, setChannel] = useState<CrmTemplateChannel>('whatsapp')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [pipelineKey, setPipelineKey] = useState<string>('')
  const [active, setActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setName(editing.name)
      setChannel(editing.channel)
      setSubject(editing.subject ?? '')
      setBody(editing.body)
      setPipelineKey(pipelines.find((p) => p.id === editing.pipelineId)?.key ?? '')
      setActive(editing.active)
    } else {
      setName(''); setChannel('whatsapp'); setSubject(''); setBody(''); setPipelineKey(''); setActive(true)
    }
  }, [open, editing, pipelines])

  const submit = async () => {
    if (!name.trim() || !body.trim()) { setError('Name and body required'); return }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        channel,
        subject: subject.trim() || null,
        body,
        pipelineKey: pipelineKey || null,
        active,
      }
      if (editing) {
        await crmUpdateTemplate(editing.id, payload as never)
        toast.success('Template updated')
      } else {
        await crmCreateTemplate(payload as never)
        toast.success('Template created')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title={editing ? 'Edit template' : 'New template'} width="lg">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium block mb-1.5">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium block mb-1.5">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as CrmTemplateChannel)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5">Pipeline (optional)</label>
            <select value={pipelineKey} onChange={(e) => setPipelineKey(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">All</option>
              {pipelines.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        {channel === 'email' ? (
          <div>
            <label className="text-xs font-medium block mb-1.5">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm" />
          </div>
        ) : null}
        <div>
          <label className="text-xs font-medium block mb-1.5">
            Body * <span className="font-normal text-muted-foreground">— use <code className="bg-muted px-1 rounded font-mono">{'{{name}}'}</code>, <code className="bg-muted px-1 rounded font-mono">{'{{course}}'}</code>, <code className="bg-muted px-1 rounded font-mono">{'{{owner}}'}</code></span>
          </label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full rounded-md border bg-background p-2 text-sm font-mono resize-y" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {editing ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
