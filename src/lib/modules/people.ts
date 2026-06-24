import {
  UsersRound,
  LayoutGrid,
  CalendarDays,
  CalendarOff,
  Banknote,
} from 'lucide-react'
import type { HubDef } from './types'

export const peopleHub: HubDef = {
  id: 'people',
  label: 'People',
  description: 'Employees — directory, attendance, leave, and payroll.',
  icon: UsersRound,
  basePath: '/people',
  defaultPath: '/people',
  permissionPrefix: 'people.',
  groups: [
    {
      id: 'people-home',
      label: 'Directory',
      icon: UsersRound,
      standalone: true,
      items: [{ path: '/people', label: 'Employees', icon: LayoutGrid, permission: 'users.view' }],
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: CalendarDays,
      items: [
        { path: '/people/attendance', label: 'Attendance', icon: CalendarDays, permission: 'attendance.view' },
        { path: '/people/leave', label: 'Leave', icon: CalendarOff, permission: 'leave.request' },
        { path: '/people/payroll', label: 'Payroll', icon: Banknote, permission: 'salary.view' },
      ],
    },
  ],
}
