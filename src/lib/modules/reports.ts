import { BarChart3, TrendingUp, Trophy, Filter, UserCheck, MessagesSquare, Code2 } from 'lucide-react'
import type { HubDef } from './types'

export const reportsHub: HubDef = {
  id: 'reports',
  label: 'Reports',
  description: 'Sales analytics + Claude Code prompt activity.',
  icon: BarChart3,
  basePath: '/reports',
  defaultPath: '/reports/sales/funnel',
  permissionPrefix: 'reports.',
  groups: [
    {
      id: 'reports-engineering',
      label: 'Engineering',
      icon: Code2,
      items: [
        { path: '/reports/prompts', label: 'Claude prompts', icon: MessagesSquare, permission: 'prompts.view.all' },
      ],
    },
    {
      id: 'reports-sales',
      label: 'Sales',
      icon: TrendingUp,
      items: [
        { path: '/reports/sales/funnel', label: 'Funnel', icon: Filter, permission: 'crm.reports.view' },
        { path: '/reports/sales/source-roi', label: 'Source ROI', icon: TrendingUp, permission: 'crm.reports.view' },
        { path: '/reports/sales/owner-leaderboard', label: 'Owner leaderboard', icon: Trophy, permission: 'crm.reports.view' },
        { path: '/reports/sales/referrer-leaderboard', label: 'Referrer leaderboard', icon: UserCheck, permission: 'crm.reports.view' },
      ],
    },
  ],
}
