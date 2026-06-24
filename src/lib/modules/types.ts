import type { LucideIcon } from 'lucide-react'

export type HubId =
  | 'people'
  | 'work'
  | 'sales'
  | 'reports'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  permission?: string
  /** Mark a deeper sub-item that should not look "active" for shorter prefixes. */
  endMatch?: boolean
}

export interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
  /** When true, the group renders as a single flat link (no header, no collapse). */
  standalone?: boolean
}

export interface HubDef {
  id: HubId
  label: string
  shortLabel?: string
  description?: string
  icon: LucideIcon
  basePath: string
  defaultPath: string
  permissionPrefix: string
  groups: NavGroup[]
  comingSoon?: boolean
}

// Legacy type aliases — kept temporarily so any straggling import compiles.
export type ModuleId = HubId
export type ModuleDef = HubDef
