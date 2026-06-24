import {
  Briefcase,
  FolderKanban,
  CheckSquare,
} from 'lucide-react'
import type { HubDef } from './types'

export const workHub: HubDef = {
  id: 'work',
  label: 'Work',
  description: 'Projects and tasks.',
  icon: Briefcase,
  basePath: '/work',
  defaultPath: '/work/projects',
  permissionPrefix: 'work.',
  groups: [
    {
      id: 'work-home',
      label: 'Work',
      icon: Briefcase,
      standalone: true,
      items: [{ path: '/work', label: 'Overview', icon: Briefcase, permission: 'projects.view' }],
    },
    {
      id: 'work-entities',
      label: 'Entities',
      icon: FolderKanban,
      items: [
        { path: '/work/projects', label: 'Projects', icon: FolderKanban, permission: 'projects.view' },
        { path: '/work/tasks', label: 'Tasks', icon: CheckSquare, permission: 'tasks.view' },
      ],
    },
  ],
}
