import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'

const AuditLog = lazy(() =>
  import('@/pages/AuditLog').then((m) => ({ default: m.AuditLog })),
)

export default function SettingsAudit() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuditLog />
    </Suspense>
  )
}
