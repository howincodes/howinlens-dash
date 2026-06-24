import { HeartHandshake } from 'lucide-react'

export default function SettingsHr() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-primary" />
          HR
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure work week, leave types, and salary periods.
        </p>
      </div>

      <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
        HR settings appear here once the HR module ships. Planned panels:
        <ul className="mt-3 inline-block text-left text-xs space-y-1">
          <li>· Work week defaults (off days, working hours)</li>
          <li>· Leave types &amp; accrual policies</li>
          <li>· Salary period configuration</li>
          <li>· Holiday calendar import</li>
        </ul>
      </div>
    </div>
  )
}
