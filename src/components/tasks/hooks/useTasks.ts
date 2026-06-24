import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getTasksPage,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  restoreTaskApi,
  changeTaskStatus,
  assignTask,
  reorderTaskApi,
  setTaskLabelsApi,
  type TaskListFilters,
} from '@/lib/api';

// Single source of truth for task-related TanStack Query keys.
//
// `list` holds the args so we can invalidate precisely after a mutation;
// `detail` is the drawer's full task fetch; `labels` is per-project.
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (projectId: number, filters?: TaskListFilters) =>
    [...taskKeys.lists(), projectId, filters ?? {}] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
  labels: (projectId: number) => ['labels', projectId] as const,
};

export function useTasksQuery(projectId: number | null, filters: TaskListFilters = {}) {
  return useQuery({
    queryKey: projectId ? taskKeys.list(projectId, filters) : ['tasks', 'disabled'],
    queryFn: () => getTasksPage(projectId!, filters),
    enabled: projectId != null,
  });
}

interface MutateContext {
  prevLists?: Array<[readonly unknown[], any]>;
}

// Optimistic helper — applies a JS patch to every cached task-list containing
// this task, returns the rollback snapshots if the server rejects the call.
function buildOptimisticUpdater(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: number,
  patch: (task: any) => any,
): Promise<MutateContext> {
  return (async () => {
    await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
    const prevLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
    prevLists.forEach(([key, value]: any) => {
      if (!value || !Array.isArray(value.items)) return;
      const next = {
        ...value,
        items: value.items.map((t: any) => (t.id === taskId ? patch(t) : t)),
      };
      queryClient.setQueryData(key, next);
    });
    return { prevLists } as MutateContext;
  })();
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createTaskApi>[0]) => createTaskApi(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: (e: any) => {
      toast.error(`Couldn't create task — ${e?.message ?? 'unknown error'}`);
    },
  });
}

export function useUpdateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateTaskApi(id, data),
    onMutate: async ({ id, data }) => buildOptimisticUpdater(qc, id, (t) => ({ ...t, ...data })),
    onError: (e: any, _vars, ctx) => {
      ctx?.prevLists?.forEach(([key, value]) => qc.setQueryData(key, value));
      toast.error(`Couldn't update — ${e?.message ?? 'unknown error'}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.details() });
    },
  });
}

export function useChangeStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) =>
      changeTaskStatus(id, status, reason),
    onMutate: async ({ id, status }) => buildOptimisticUpdater(qc, id, (t) => ({ ...t, status })),
    onError: (e: any, _vars, ctx) => {
      ctx?.prevLists?.forEach(([key, value]) => qc.setQueryData(key, value));
      toast.error(`Status change failed — ${e?.message ?? 'unknown error'}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useAssignTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      assigneeId,
      reason,
    }: {
      id: number;
      assigneeId: number | null;
      reason?: string;
    }) => assignTask(id, assigneeId, reason),
    onMutate: async ({ id, assigneeId }) =>
      buildOptimisticUpdater(qc, id, (t) => ({ ...t, assigneeId })),
    onError: (e: any, _vars, ctx) => {
      ctx?.prevLists?.forEach(([key, value]) => qc.setQueryData(key, value));
      toast.error(`Assignment failed — ${e?.message ?? 'unknown error'}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useReorderTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      beforeTaskId,
      afterTaskId,
    }: {
      id: number;
      beforeTaskId?: number | null;
      afterTaskId?: number | null;
    }) => reorderTaskApi(id, { beforeTaskId, afterTaskId }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => deleteTaskApi(id),
    onMutate: async ({ id }) =>
      buildOptimisticUpdater(qc, id, (t) => ({ ...t, deletedAt: new Date().toISOString() })),
    onError: (e: any, _vars, ctx) => {
      ctx?.prevLists?.forEach(([key, value]) => qc.setQueryData(key, value));
      toast.error(`Delete failed — ${e?.message ?? 'unknown error'}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useRestoreTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => restoreTaskApi(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useSetTaskLabelsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, labelIds }: { id: number; labelIds: number[] }) =>
      setTaskLabelsApi(id, labelIds),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.details() });
    },
  });
}
