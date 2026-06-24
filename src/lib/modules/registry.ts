import { peopleHub } from './people'
import { workHub } from './work'
import { salesHub } from './sales'
import { reportsHub } from './reports'
import type { HubDef, HubId, NavGroup, NavItem } from './types'

export const HUBS: Record<HubId, HubDef> = {
  people: peopleHub,
  work: workHub,
  sales: salesHub,
  reports: reportsHub,
}

export const HUB_ORDER: HubId[] = [
  'people',
  'work',
  'sales',
  'reports',
]

// Legacy aliases — kept temporarily so any straggling import compiles.
export const MODULES = HUBS
export const MODULE_ORDER = HUB_ORDER

/**
 * Resolve which hub owns the given pathname.
 * Returns null for paths that don't belong to any hub
 * (e.g. /overview, /settings, /me/*).
 */
export function getModuleForPath(pathname: string): HubDef | null {
  for (const id of HUB_ORDER) {
    const m = HUBS[id]
    if (pathname === m.basePath || pathname.startsWith(`${m.basePath}/`)) {
      return m
    }
  }
  return null
}

/**
 * Permission prefixes that grant access to each hub.
 * Multiple prefixes per hub allow legacy + new permission keys to coexist.
 */
const HUB_PERM_PREFIXES: Record<HubId, string[]> = {
  people: ['users.', 'attendance.', 'leave.', 'salary.'],
  work: ['tasks.', 'projects.'],
  sales: ['crm.'],
  reports: ['reports.', 'crm.reports.', 'prompts.view.all'],
}

/**
 * Hub visibility. The "Admin" role bypasses all checks (matches server-side
 * requirePerm bypass). Otherwise, a hub is visible if the user holds any
 * permission whose key starts with one of the hub's known prefixes.
 *
 * The role==='Admin' check is the primary bypass — non-admin users (eg.
 * "Sales Manager") rely entirely on the prefix match.
 */
export function isModuleVisible(
  hub: HubDef,
  perms: string[],
  isAdmin: boolean,
  role?: string,
): boolean {
  if (isAdmin && role === 'Admin') return true
  // Treat "Admin"-named role as an explicit override regardless of `kind`.
  if (role === 'Admin') return true
  const prefixes = HUB_PERM_PREFIXES[hub.id] ?? [hub.permissionPrefix]
  return perms.some((p) => prefixes.some((pre) => p.startsWith(pre)))
}

/**
 * Filter a hub's groups + items down to what the current user can access.
 * Items without a `permission` are always visible; items with one require an
 * exact permission match (or Admin role). Groups with zero visible items are
 * dropped entirely so the sidebar doesn't render empty headers.
 */
export function getVisibleGroups(
  hub: HubDef,
  perms: string[],
  role?: string,
): NavGroup[] {
  const isAdmin = role === 'Admin'
  const itemVisible = (item: NavItem) =>
    !item.permission || isAdmin || perms.includes(item.permission)
  const out: NavGroup[] = []
  for (const group of hub.groups) {
    const items = group.items.filter(itemVisible)
    if (items.length === 0) continue
    out.push({ ...group, items })
  }
  return out
}

/**
 * Find which sidebar item in a hub corresponds to the active route.
 * Longest-prefix match wins so /people/123 picks /people, not /people/employees.
 */
export function findActiveItem(hub: HubDef, pathname: string) {
  let best: { groupId: string; itemPath: string } | null = null
  let bestLen = -1
  for (const group of hub.groups) {
    for (const item of group.items) {
      const isExact = pathname === item.path
      const isPrefix =
        item.path !== hub.basePath && pathname.startsWith(`${item.path}/`)
      const isHubBaseExact =
        item.path === hub.basePath && pathname === hub.basePath
      if (isExact || isPrefix || isHubBaseExact) {
        if (item.path.length > bestLen) {
          bestLen = item.path.length
          best = { groupId: group.id, itemPath: item.path }
        }
      }
    }
  }
  return best
}
