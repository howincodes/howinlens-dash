import { useEffect, useState } from 'react'
import { Plus, Loader2, Trash2, Banknote, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { MoneyInput } from '@/components/ui/money-input'
import { SideSheet } from './SideSheet'
import { confirm } from '@/components/ui/confirm-dialog'
import {
  crmListCampaignRecharges,
  crmCreateCampaignRecharge,
  crmUpdateCampaignRecharge,
  crmDeleteCampaignRecharge,
} from '@/lib/crm/client'
import { fmtMoney, fmtDateShort } from '@/lib/crm/format'
import type { CrmCampaignRecharge } from '@/lib/crm/types'

export function CampaignRechargesSection({
  campaignId,
  currency = 'INR',
  onTotalChange,
}: {
  campaignId: number
  currency?: string
  onTotalChange?: (total: string) => void
}) {
  const [recharges, setRecharges] = useState<CrmCampaignRecharge[]>([])
  const [total, setTotal] = useState<string>('0')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CrmCampaignRecharge | null>(null)

  const refresh = () => {
    setLoading(true)
    crmListCampaignRecharges(campaignId)
      .then((r) => {
        setRecharges(r.recharges)
        setTotal(r.total.amount)
        onTotalChange?.(r.total.amount)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [campaignId])

  const remove = async (r: CrmCampaignRecharge) => {
    const ok = await confirm({
      title: `Delete ${fmtMoney(r.amount, r.currency)} recharge?`,
      description: 'Soft-deleted from the campaign total. AI insights will exclude this entry on next analysis.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteCampaignRecharge(campaignId, r.id)
      toast.success('Recharge deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recharges</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <Banknote className="h-3.5 w-3.5 inline mr-1" />
            <span className="font-mono text-foreground font-semibold">{fmtMoney(total, currency)}</span>
            <span className="text-xs ml-2">across {recharges.length} top-up{recharges.length !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add recharge
        </Button>
      </div>

      {error ? <div className="px-4 py-2 text-sm text-rose-600">{error}</div> : null}
      {loading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : recharges.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground italic">
          No recharges logged yet. Add a top-up to track actual money put in.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
              <th className="px-3 py-2 font-medium">Note</th>
              <th className="px-3 py-2 font-medium">By</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {recharges.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="px-3 py-2 text-xs">{fmtDateShort(r.rechargedAt)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs font-semibold">{fmtMoney(r.amount, r.currency)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground italic">{r.note || '—'}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.byUserName || '—'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(r)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(r)} className="p-1 text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <RechargeSheet
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        editing={editing}
        currency={currency}
        campaignId={campaignId}
        onSaved={() => { setAdding(false); setEditing(null); refresh() }}
      />
    </div>
  )
}

function RechargeSheet({
  open, onClose, editing, currency, campaignId, onSaved,
}: {
  open: boolean
  onClose: () => void
  editing: CrmCampaignRecharge | null
  currency: string
  campaignId: number
  onSaved: () => void
}) {
  const [amount, setAmount] = useState<string>('')
  const [rechargedAt, setRechargedAt] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setAmount(editing.amount)
      setRechargedAt(editing.rechargedAt ? editing.rechargedAt.slice(0, 10) : '')
      setNote(editing.note ?? '')
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setAmount('')
      setRechargedAt(today)
      setNote('')
    }
  }, [open, editing])

  const submit = async () => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) { setError('Amount must be > 0'); return }
    setSubmitting(true)
    setError(null)
    try {
      if (editing) {
        await crmUpdateCampaignRecharge(campaignId, editing.id, {
          amount: n,
          rechargedAt: rechargedAt ? new Date(rechargedAt).toISOString() : undefined,
          note: note.trim() || null,
        })
        toast.success('Recharge updated')
      } else {
        await crmCreateCampaignRecharge(campaignId, {
          amount: n,
          rechargedAt: rechargedAt ? new Date(rechargedAt).toISOString() : undefined,
          note: note.trim() || null,
        })
        toast.success('Recharge added')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title={editing ? 'Edit recharge' : 'Add recharge'}>
      <div className="space-y-3">
        <Field label="Amount" required>
          <MoneyInput amount={amount} currency={currency} onChange={(amt) => setAmount(amt)} />
        </Field>
        <Field label="Date" required>
          <input
            type="date"
            value={rechargedAt}
            onChange={(e) => setRechargedAt(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Note" hint="Optional — e.g. 'Recharged after low-balance alert'">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional"
            className="w-full rounded-md border bg-background p-2 text-sm resize-y"
          />
        </Field>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !amount}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? 'Saving…' : editing ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
