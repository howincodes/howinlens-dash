import { useEffect, useRef, useState } from 'react'
import { Loader2, Upload, Link as LinkIcon, Trash2, ExternalLink, FileText, Film, Image as ImageIcon, File as FileIcon, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { SideSheet } from './SideSheet'
import { confirm } from '@/components/ui/confirm-dialog'
import {
  crmListCampaignMedia, crmUploadCampaignFile, crmAddCampaignLink,
  crmDeleteCampaignMedia, crmUpdateCampaignMedia, crmGetMediaLimits,
} from '@/lib/crm/client'
import { fmtDateShort } from '@/lib/crm/format'
import type { CrmCampaignMedia, CrmMediaLimits } from '@/lib/crm/types'

function humanSize(n: number | null): string {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function isImage(m: CrmCampaignMedia): boolean {
  return m.type === 'file' && !!m.mimeType && m.mimeType.startsWith('image/')
}
function isVideo(m: CrmCampaignMedia): boolean {
  return m.type === 'file' && !!m.mimeType && m.mimeType.startsWith('video/')
}
function isPdf(m: CrmCampaignMedia): boolean {
  return m.type === 'file' && m.mimeType === 'application/pdf'
}

function mediaIcon(m: CrmCampaignMedia) {
  if (m.type === 'link') return <LinkIcon className="h-4 w-4" />
  if (isImage(m)) return <ImageIcon className="h-4 w-4" />
  if (isVideo(m)) return <Film className="h-4 w-4" />
  if (isPdf(m)) return <FileText className="h-4 w-4" />
  return <FileIcon className="h-4 w-4" />
}

export function CampaignMediaSection({ campaignId }: { campaignId: number }) {
  const [media, setMedia] = useState<CrmCampaignMedia[]>([])
  const [limits, setLimits] = useState<CrmMediaLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [linkSheetOpen, setLinkSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CrmCampaignMedia | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = () => {
    setLoading(true)
    Promise.all([crmListCampaignMedia(campaignId), crmGetMediaLimits()])
      .then(([m, l]) => { setMedia(m.media); setLimits(l) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [campaignId])

  const handleFile = async (file: File) => {
    if (limits) {
      if (file.size > limits.maxMb * 1024 * 1024) {
        toast.error(`File exceeds ${limits.maxMb} MB limit`)
        return
      }
      if (limits.allowedMime.length > 0 && !limits.allowedMime.includes(file.type)) {
        toast.error(`File type ${file.type || 'unknown'} not allowed`)
        return
      }
    }
    setUploading(true)
    try {
      await crmUploadCampaignFile(campaignId, file)
      toast.success(`Uploaded ${file.name}`)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((f) => void handleFile(f))
    e.target.value = ''
  }

  const remove = async (m: CrmCampaignMedia) => {
    const ok = await confirm({
      title: m.type === 'file' ? `Delete "${m.originalName ?? m.filename}"?` : 'Delete link?',
      description: 'Soft-deleted — record removed from gallery and AI insights.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteCampaignMedia(campaignId, m.id)
      toast.success('Media deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Media</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {media.length} item{media.length !== 1 ? 's' : ''}
            {limits ? <span className="text-xs ml-2">· max {limits.maxMb} MB · {limits.allowedMime.length} file types</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple onChange={onFileChange} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => setLinkSheetOpen(true)}>
            <LinkIcon className="mr-1 h-3.5 w-3.5" /> Add link
          </Button>
          <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </div>

      {error ? <div className="px-4 py-2 text-sm text-rose-600">{error}</div> : null}
      {loading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : media.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground italic">
          No media yet. Upload posters / videos / ad creatives, or paste a link.
        </div>
      ) : (
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map((m) => (
            <MediaCard key={m.id} m={m} onEdit={() => setEditing(m)} onDelete={() => remove(m)} />
          ))}
        </div>
      )}

      <LinkSheet
        open={linkSheetOpen}
        onClose={() => setLinkSheetOpen(false)}
        campaignId={campaignId}
        onSaved={() => { setLinkSheetOpen(false); refresh() }}
      />

      <CaptionSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        editing={editing}
        campaignId={campaignId}
        onSaved={() => { setEditing(null); refresh() }}
      />
    </div>
  )
}

function MediaCard({ m, onEdit, onDelete }: { m: CrmCampaignMedia; onEdit: () => void; onDelete: () => void }) {
  const isImg = isImage(m)
  const isVid = isVideo(m)
  const url = m.type === 'link' ? m.url : m.downloadUrl

  return (
    <div className="group relative rounded-md border bg-background overflow-hidden">
      <div className="aspect-video bg-muted/40 flex items-center justify-center overflow-hidden relative">
        {isImg && url ? (
          <img src={url} alt={m.caption ?? m.originalName ?? 'media'} className="w-full h-full object-cover" />
        ) : isVid && url ? (
          <video src={url} controls className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground p-3">
            {mediaIcon(m)}
            <span className="text-[10px] font-mono uppercase">
              {m.type === 'link' ? 'LINK' : m.mimeType ?? 'FILE'}
            </span>
          </div>
        )}
        {/* Hover actions */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="h-6 w-6 rounded bg-background/80 backdrop-blur border flex items-center justify-center text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
          <button onClick={onDelete} className="h-6 w-6 rounded bg-background/80 backdrop-blur border flex items-center justify-center text-muted-foreground hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      <div className="p-2 space-y-1">
        <div className="flex items-center gap-1 text-xs">
          {mediaIcon(m)}
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="truncate hover:text-primary flex-1 inline-flex items-center gap-1">
              {m.type === 'link' ? (m.url ?? '—') : (m.originalName ?? m.filename ?? '—')}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          ) : (
            <span className="truncate flex-1">{m.originalName ?? m.filename ?? m.url ?? '—'}</span>
          )}
        </div>
        {m.caption ? <p className="text-[11px] text-muted-foreground italic line-clamp-2">{m.caption}</p> : null}
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{humanSize(m.sizeBytes)}</span>
          <span>{fmtDateShort(m.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

function LinkSheet({ open, onClose, campaignId, onSaved }: { open: boolean; onClose: () => void; campaignId: number; onSaved: () => void }) {
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setUrl(''); setCaption(''); setError(null) }
  }, [open])

  const submit = async () => {
    if (!url.trim()) { setError('URL required'); return }
    setSubmitting(true); setError(null)
    try {
      await crmAddCampaignLink(campaignId, { url: url.trim(), caption: caption.trim() || null })
      toast.success('Link added')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title="Add link">
      <div className="space-y-3">
        <Field label="URL" required hint="YouTube, Drive, ad-platform preview, etc.">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Caption">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Optional context: 'Final cut for Meta Reels'"
            className="w-full rounded-md border bg-background p-2 text-sm resize-y"
          />
        </Field>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
          <Button onClick={submit} disabled={submitting || !url.trim()}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}

function CaptionSheet({
  open, onClose, editing, campaignId, onSaved,
}: { open: boolean; onClose: () => void; editing: CrmCampaignMedia | null; campaignId: number; onSaved: () => void }) {
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && editing) { setCaption(editing.caption ?? ''); setError(null) }
  }, [open, editing])

  const submit = async () => {
    if (!editing) return
    setSubmitting(true); setError(null)
    try {
      await crmUpdateCampaignMedia(campaignId, editing.id, { caption: caption.trim() || null })
      toast.success('Caption updated')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title="Edit caption">
      <div className="space-y-3">
        {editing ? <div className="text-xs text-muted-foreground">{editing.originalName ?? editing.url ?? '—'}</div> : null}
        <Field label="Caption">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="w-full rounded-md border bg-background p-2 text-sm resize-y"
          />
        </Field>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
