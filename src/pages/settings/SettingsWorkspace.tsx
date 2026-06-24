import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

export default function SettingsWorkspace() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organisation-wide defaults that apply across every module.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4" />
            Organisation
          </CardTitle>
          <CardDescription>
            Display name, locale, default timezone, and currency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
            Workspace settings land alongside the HR module — they configure
            things like work week, fiscal year, and base currency that the
            other modules read from. For now the dashboard uses sensible
            defaults.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
