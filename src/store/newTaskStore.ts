import { create } from 'zustand'

// Tiny store so any page can pop the global "New Task" modal — e.g. the
// Header's [+] button, the UserDetail "Assign task" button, the Tasks page
// keyboard shortcut. State carries optional defaults (assignee, project)
// for the calling context.

interface NewTaskState {
  open: boolean
  defaultAssigneeId: number | null
  defaultProjectId: number | null
  lockAssignee: boolean
  openModal: (opts?: {
    assigneeId?: number | null
    projectId?: number | null
    lockAssignee?: boolean
  }) => void
  closeModal: () => void
}

export const useNewTaskStore = create<NewTaskState>((set) => ({
  open: false,
  defaultAssigneeId: null,
  defaultProjectId: null,
  lockAssignee: false,
  openModal: (opts) => set({
    open: true,
    defaultAssigneeId: opts?.assigneeId ?? null,
    defaultProjectId: opts?.projectId ?? null,
    lockAssignee: opts?.lockAssignee ?? false,
  }),
  closeModal: () => set({ open: false }),
}))
