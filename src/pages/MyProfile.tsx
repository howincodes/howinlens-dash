import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, Plus, Monitor, Copy, Check, Trash2, ShieldAlert, Terminal, UserCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import PromptList from '@/components/lens/PromptList'
import { useAuthStore, useHasPermission } from '@/store/authStore'
import {
  meGetPrompts, meGetPrompt, meGetPromptStats, meGetDevices, meCreateDevice, meRevokeDevice,
  type DeviceRow,
} from '@/lib/api'

function fmtWhen(iso: string): string {
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export default function MyProfile() {
  const user = useAuthStore((s) => s.user)
  const canSeePrompts = useHasPermission('prompts.view.own')
  const canManageDevices = useHasPermission('devices.manage.own')

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCircle2 className="h-6 w-6 text-primary" />
          {user?.name ?? 'My profile'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user?.email}{user?.role ? ` · ${user.role}` : ''}
        </p>
      </div>

      {canSeePrompts && <PromptStats />}
      {canManageDevices && <DevicesCard />}
      {canSeePrompts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My recent prompts</CardTitle>
            <CardDescription>Your Claude Code prompts, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <PromptList list={meGetPrompts} detail={meGetPrompt} pageSize={20} emptyHint="No prompts captured yet — install the Lens client below." />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PromptStats() {
  const [stats, setStats] = useState<{ today: number; week: number; month: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    meGetPromptStats().then((s) => { if (!cancelled) setStats(s) }).catch(() => { /* */ })
    return () => { cancelled = true }
  }, [])
  const tiles = [
    { label: 'Today', value: stats?.today },
    { label: 'This week', value: stats?.week },
    { label: 'This month', value: stats?.month },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold tabular-nums">{t.value ?? '—'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DevicesCard() {
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [freshToken, setFreshToken] = useState<string | null>(null)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    meGetDevices()
      .then((r) => { if (!cancelled) setDevices(r.data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])
  useEffect(() => load(), [load])

  async function create() {
    setCreating(true)
    setError(null)
    try {
      const res = await meCreateDevice({ name: newName.trim() || undefined })
      setFreshToken(res.token)
      setNewName('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create device')
    } finally {
      setCreating(false)
    }
  }

  async function revoke(id: number, name: string) {
    if (!window.confirm(`Revoke "${name}"? Its token stops working immediately. Other devices are unaffected.`)) return
    try {
      await meRevokeDevice(id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4" /> My devices</CardTitle>
        <CardDescription>Each machine running the Lens client gets its own token. Revoke one without affecting the others.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5 text-sm text-rose-600">{error}</div>}

        {freshToken && <TokenReveal token={freshToken} onDismiss={() => setFreshToken(null)} />}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">New device name (optional)</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. MacBook Pro" />
          </div>
          <Button onClick={create} disabled={creating} size="sm">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1.5">Generate token</span>
          </Button>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[110px]">Platform</TableHead>
                <TableHead className="w-[100px]">Client</TableHead>
                <TableHead className="w-[150px]">Last seen</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</TableCell></TableRow>
              ) : devices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground italic">No devices yet. Generate a token, then run the installer below.</TableCell></TableRow>
              ) : (
                devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">{d.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.platform ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{d.clientVersion ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtWhen(d.lastSeenAt)}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'active' ? 'success' : 'secondary'}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => revoke(d.id, d.name)} title="Revoke">
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <InstallSnippet />
      </CardContent>
    </Card>
  )
}

function TokenReveal({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(token).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <ShieldAlert className="h-4 w-4" /> Save this token now — it won't be shown again.
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono bg-background border rounded px-2 py-1.5 break-all">{token}</code>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground underline">Dismiss</button>
    </div>
  )
}

function InstallSnippet() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://howinlens.howincloud.com'
  const cmd = `curl -fsSL ${origin}/lens/install | bash`
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Terminal className="h-4 w-4 text-muted-foreground" /> Install the Lens client
      </div>
      <p className="text-xs text-muted-foreground">
        On your machine (macOS / Linux), run step 1 to install, then step 2 to pair —
        paste a token you generated above. Windows: <code className="font-mono">iwr {origin}/lens/install.ps1 | iex</code>.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono bg-background border rounded px-2 py-1.5 break-all">{cmd}</code>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <code className="block text-xs font-mono bg-background border rounded px-2 py-1.5 break-all">lens install --server {origin}</code>
    </div>
  )
}
