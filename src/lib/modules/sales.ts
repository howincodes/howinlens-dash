import {
  TrendingUp,
  LayoutDashboard,
  Sparkle,
  Megaphone,
  UserCheck,
  Users2,
  Filter,
  Activity,
} from 'lucide-react'
import type { HubDef } from './types'

export const salesHub: HubDef = {
  id: 'sales',
  label: 'Sales',
  description: 'Leads, contacts, outreach, and campaigns.',
  icon: TrendingUp,
  basePath: '/sales',
  defaultPath: '/sales/overview',
  permissionPrefix: 'crm.',
  groups: [
    {
      id: 'sales-home',
      label: 'Sales',
      icon: TrendingUp,
      standalone: true,
      items: [{ path: '/sales/overview', label: 'Overview', icon: LayoutDashboard }],
    },
    {
      id: 'sales-pipeline',
      label: 'Pipeline',
      icon: Sparkle,
      items: [
        { path: '/sales/leads', label: 'Leads', icon: Sparkle },
        { path: '/sales/outreach', label: 'Outreach feed', icon: Activity },
        { path: '/sales/campaigns', label: 'Campaigns', icon: Megaphone },
      ],
    },
    {
      id: 'sales-people',
      label: 'People',
      icon: Users2,
      items: [
        { path: '/sales/contacts', label: 'Contacts', icon: Users2 },
        { path: '/sales/referrers', label: 'Referrers', icon: UserCheck },
      ],
    },
    {
      id: 'sales-reports',
      label: 'Reports',
      icon: Filter,
      items: [
        { path: '/reports/sales/funnel', label: 'Funnel', icon: Filter },
        { path: '/reports/sales/source-roi', label: 'Source ROI', icon: TrendingUp },
      ],
    },
  ],
}
