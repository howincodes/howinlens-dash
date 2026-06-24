import { Suspense, lazy, useState } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const CrmPipelinesPanel = lazy(() => import('./crm/CrmPipelines'))
const CrmSourcesPanel = lazy(() => import('./crm/CrmSources'))
const CrmTemplatesPanel = lazy(() => import('./crm/CrmTemplates'))
const CrmAutoCoolPanel = lazy(() => import('./crm/CrmAutoCool'))

type Tab = 'pipelines' | 'sources' | 'templates' | 'auto-cool'

const TABS: Array<{ key: Tab; label: string; description: string }> = [
  { key: 'pipelines', label: 'Pipelines', description: 'Stage labels per pipeline + currency.' },
  { key: 'sources',   label: 'Sources',   description: 'Where leads come from. Add/disable.' },
  { key: 'templates', label: 'Templates', description: 'WhatsApp / email / SMS message templates.' },
  { key: 'auto-cool', label: 'Auto-cool', description: 'Cool a lead\'s temperature when silent.' },
]

export default function SettingsCrm() {
  const [tab, setTab] = useState<Tab>('pipelines')
  const current = TABS.find((t) => t.key === tab)!

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          CRM
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure lead sources, pipeline stages, outreach templates, and auto-cool rules.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'h-10 px-4 text-sm font-medium border-b-2 transition-colors',
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground -mt-2">{current.description}</p>

      <Suspense fallback={
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      }>
        {tab === 'pipelines' && <CrmPipelinesPanel />}
        {tab === 'sources' && <CrmSourcesPanel />}
        {tab === 'templates' && <CrmTemplatesPanel />}
        {tab === 'auto-cool' && <CrmAutoCoolPanel />}
      </Suspense>
    </div>
  )
}
