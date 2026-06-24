import { useAuthStore } from '../store/authStore'

export const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = useAuthStore.getState().token
  const headers = new Headers(options.headers || {})

  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`/api/admin${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    let message = 'An error occurred'
    try {
      const err = await response.json()
      message = err.error || err.message || message
    } catch (_e) {
      // Ignore JSON parse error for plain text
    }
    if (response.status === 403) {
      message = `Permission denied: ${message}`
    } else if (response.status === 404) {
      message = message === 'An error occurred' ? 'Not found' : message
    } else if (response.status >= 500) {
      message = `Server error: ${message}`
    }
    throw new Error(message)
  }

  // Handle No Content
  if (response.status === 204) {
    return null
  }

  // Handle CSV/JSON export
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('text/csv')) {
    return response.text()
  }

  return response.json()
}

// ── Auth ──────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

export async function getMe() {
  return fetchClient('/auth/me')
}

// ── Developer (read-only) API ─────────────────────────────
async function fetchDevClient(endpoint: string, opts: RequestInit = {}) {
  const token = useAuthStore.getState().token
  const headers = new Headers(opts.headers as HeadersInit | undefined)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api/dev${endpoint}`, { ...opts, headers })
  if (response.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!response.ok) {
    let message = 'An error occurred'
    try {
      const err = await response.json()
      message = err.error || err.message || message
    } catch (_e) { /* ignore */ }
    throw new Error(message)
  }
  return response.json()
}

export const devGetMe = () => fetchDevClient('/me')
export const devGetMessages = (page = 1, limit = 50, provider?: string) => {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (provider) qs.set('provider', provider)
  return fetchDevClient(`/messages?${qs.toString()}`)
}

// Dev dashboard — own tasks, AI suggestions, active task, daily summary
export const devGetMyTasks = (status?: string) =>
  fetchDevClient(`/my-tasks${status ? `?status=${encodeURIComponent(status)}` : ''}`)
export const devGetSuggestions = () => fetchDevClient('/suggestions')
export const devRespondSuggestion = (id: number, body: any) =>
  fetchDevClient(`/suggestions/${id}/respond`, { method: 'POST', body: JSON.stringify(body) })
export const devSetActiveTask = (taskId: number | null) =>
  fetchDevClient('/active-task', { method: 'PUT', body: JSON.stringify({ taskId }) })
export const devGetMyDailySummary = (date?: string) =>
  fetchDevClient(`/my-daily-summary${date ? `?date=${date}` : ''}`)

// Helper: true when logged-in user is a developer (not admin)
function isDev(): boolean {
  return useAuthStore.getState().user?.kind === 'developer'
}

// ── Connected Watchers ───────────────────────────────────
export const getConnectedWatchers = () => fetchClient('/connected-watchers')

// ── Job Scheduler ────────────────────────────────────────
export const getJobs = () => fetchClient('/jobs')
export const runJob = (name: string) => fetchClient(`/jobs/${name}/run`, { method: 'POST' })
export const getJobHistory = (name: string, limit = 20) => fetchClient(`/jobs/${name}/history?limit=${limit}`)
export const updateJob = (name: string, data: Record<string, unknown>) =>
  fetchClient(`/jobs/${name}`, { method: 'PUT', body: JSON.stringify(data) })

// ── Team ──────────────────────────────────────────────────
export const getTeam = () => fetchClient('/team')
export const updateTeam = (data: Record<string, unknown>) =>
  fetchClient('/team', { method: 'PUT', body: JSON.stringify(data) })
// ── Users ─────────────────────────────────────────────────
// Server wraps the response as `{ data: [...] }`; unwrap here so callers
// can rely on `getUsers()` returning a flat array regardless of which
// endpoint shape happens to be in place.
export const getUsers = async (source?: string) => {
  const fetcher = isDev() ? fetchDevClient : fetchClient
  const res = await fetcher(`/users${source ? `?source=${source}` : ''}`)
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && Array.isArray((res as any).data)) {
    return (res as { data: unknown[] }).data
  }
  if (res && typeof res === 'object' && Array.isArray((res as any).users)) {
    return (res as { users: unknown[] }).users
  }
  return []
}
export const createUser = (name: string, slug: string, limits?: unknown[]) =>
  fetchClient('/users', { method: 'POST', body: JSON.stringify({ name, slug, limits }) })
export const getUser = (id: string) => fetchClient(`/users/${id}`)
export const updateUser = (id: string, data: Record<string, unknown>) =>
  fetchClient(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteUser = (id: string) => fetchClient(`/users/${id}`, { method: 'DELETE' })
export const getUserMessages = (id: string, params?: Record<string, string>) =>
  fetchClient(`/users/${id}/messages${params ? '?' + new URLSearchParams(params).toString() : ''}`)
export const getUserSessions = (id: string, params?: Record<string, string>) =>
  fetchClient(`/users/${id}/sessions${params ? '?' + new URLSearchParams(params).toString() : ''}`)
export const rotateToken = (id: string) =>
  fetchClient(`/users/${id}/rotate-token`, { method: 'POST' })
export const adminResetUserPassword = (id: number, password: string) =>
  fetchClient(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
export const getUsersUsage = () => fetchClient('/users-usage')

// ── Subscriptions ─────────────────────────────────────────
export const getSubscriptions = (source?: string) =>
  fetchClient(`/subscriptions${source ? `?source=${source}` : ''}`)

// ── Analytics ─────────────────────────────────────────────
export const getAnalytics = (days: number, source?: string) =>
  fetchClient(`/analytics?days=${days}${source ? `&source=${source}` : ''}`)
export const getLeaderboard = (days: number, sortBy?: string, source?: string) =>
  fetchClient(`/analytics/users?days=${days}&sortBy=${sortBy || 'prompts'}${source ? `&source=${source}` : ''}`)
export const getProjectAnalytics = (days: number, source?: string) =>
  fetchClient(`/analytics/projects?days=${days}${source ? `&source=${source}` : ''}`)
export const getCosts = (days: number, source?: string) =>
  fetchClient(`/analytics/costs?days=${days}${source ? `&source=${source}` : ''}`)

// ── Messages (aggregate) ─────────────────────────────────
export const getAllMessages = (params?: Record<string, string>) =>
  fetchClient(`/messages${params ? '?' + new URLSearchParams(params).toString() : ''}`)

// ── Audit ─────────────────────────────────────────────────
export const getAuditLog = (params?: Record<string, string>) =>
  fetchClient(`/audit-log${params ? '?' + new URLSearchParams(params).toString() : ''}`)

// ── Events ───────────────────────────────────────────────
export const getRecentEvents = (since: string) => fetchClient(`/events/recent?since=${encodeURIComponent(since)}`)

// ── Watcher ───────────────────────────────────────────────
export const getWatcherStatus = (userId: string) => fetchClient(`/users/${userId}/watcher/status`)

// ── Live Debug ────────────────────────────────────────────
export const collectLogs = (userId: string, lines?: number) =>
  fetchClient(`/users/${userId}/collect-logs`, {
    method: 'POST',
    body: JSON.stringify({ lines: lines ?? 500 }),
  })

export const startLogStream = (userId: string) =>
  fetchClient(`/users/${userId}/start-log-stream`, { method: 'POST' })

export const stopLogStream = (userId: string) =>
  fetchClient(`/users/${userId}/stop-log-stream`, { method: 'POST' })

// ── Provider Quotas ──────────────────────────────────
export const getProviderQuotas = (userId: string, source?: string) =>
  fetchClient(`/provider-quotas/${userId}${source ? `?source=${source}` : ''}`)

// ── Model Aliases & Blocks ──────────────────────────
export const getModelAliases = () => fetchClient('/model-aliases')
export const updateModelAlias = (id: number, data: { weight?: number; displayName?: string }) =>
  fetchClient(`/model-aliases/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const getUserModelBlocks = (userId: string) => fetchClient(`/users/${userId}/model-blocks`)
export const blockModelForUser = (userId: string, modelAliasId: number, reason?: string) =>
  fetchClient(`/users/${userId}/model-blocks`, { method: 'POST', body: JSON.stringify({ modelAliasId, reason }) })
export const unblockModelForUser = (userId: string, modelAliasId: number) =>
  fetchClient(`/users/${userId}/model-blocks/${modelAliasId}`, { method: 'DELETE' })

// ── Roles ────────────────────────────────────────────
export async function getRoles() {
  return fetchClient('/roles')
}

export async function createRole(data: { name: string; description?: string }) {
  return fetchClient('/roles', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateRoleApi(id: number, data: { name?: string; description?: string }) {
  return fetchClient(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteRoleApi(id: number) {
  return fetchClient(`/roles/${id}`, { method: 'DELETE' })
}

export async function getPermissions() {
  return fetchClient('/permissions')
}

export async function getRolePermissions(roleId: number) {
  return fetchClient(`/roles/${roleId}/permissions`)
}

export async function setRolePermissions(roleId: number, permissionIds: number[]) {
  return fetchClient(`/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionIds }) })
}

// ── Projects ─────────────────────────────────────────
// Pass includeInbox=true to also receive per-user Inbox projects (used by
// TasksPage so the dropdown can switch to a user's personal task bucket).
export async function getProjects(opts?: { includeInbox?: boolean }) {
  return fetchClient(`/projects${opts?.includeInbox ? '?includeInbox=1' : ''}`)
}

export async function createProjectApi(data: { name: string; description?: string }) {
  return fetchClient('/projects', { method: 'POST', body: JSON.stringify(data) })
}

export async function getProject(id: number) {
  return fetchClient(`/projects/${id}`)
}

export async function updateProjectApi(id: number, data: any) {
  return fetchClient(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteProjectApi(id: number) {
  return fetchClient(`/projects/${id}`, { method: 'DELETE' })
}

export async function getProjectMembersApi(projectId: number) {
  return fetchClient(`/projects/${projectId}/members`)
}

export async function addProjectMemberApi(projectId: number, data: { userId: number; roleId?: number }) {
  return fetchClient(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) })
}

export async function removeProjectMemberApi(projectId: number, userId: number) {
  return fetchClient(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' })
}

// ── Project Repositories ──

export async function getProjectRepositories(projectId: number) {
  return fetchClient(`/projects/${projectId}/repositories`);
}

export async function addProjectRepositoryApi(projectId: number, data: { githubRepoUrl: string; label?: string }) {
  return fetchClient(`/projects/${projectId}/repositories`, { method: 'POST', body: JSON.stringify(data) });
}

export async function removeProjectRepositoryApi(id: number) {
  return fetchClient(`/repositories/${id}`, { method: 'DELETE' });
}

// ── Subscription Credentials ──

export async function getSubscriptionCredentials() {
  return fetchClient('/subscriptions/credentials');
}

export async function getSubscriptionCredentialDetail(id: number) {
  return fetchClient(`/subscriptions/credentials/${id}`);
}

export async function createSubscriptionCredential(data: { email: string; accessToken?: string; refreshToken?: string; orgId?: string; plan?: string }) {
  return fetchClient('/subscriptions/credentials', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteSubscriptionCredential(id: number) {
  return fetchClient(`/subscriptions/credentials/${id}`, { method: 'DELETE' });
}

export async function getSubscriptionUsage() {
  return fetchClient('/subscriptions/usage');
}

// OAuth Credential Vault
export async function startOAuthFlow(purpose: 'dev' | 'monitor' = 'dev') {
  return fetchClient('/subscriptions/oauth/start', {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });
}

export async function exchangeOAuthCode(flowId: string, code: string) {
  return fetchClient('/subscriptions/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ flowId, code }),
  });
}

export async function refreshCredential(id: number) {
  return fetchClient(`/subscriptions/credentials/${id}/refresh`, { method: 'POST' });
}

export async function killUserCredential(userId: number) {
  return fetchClient(`/subscriptions/kill/${userId}`, { method: 'POST' });
}

export async function rotateUserCredential(userId: number, credentialId?: number) {
  return fetchClient('/subscriptions/rotate', { method: 'POST', body: JSON.stringify({ userId, credentialId }) });
}

export async function getCredentials() {
  return fetchClient('/subscriptions/credentials');
}

// ── Codex Credentials ──
export const startCodexDeviceFlow = () =>
  fetchClient('/subscriptions/codex/start', { method: 'POST' })
export const pollCodexDeviceFlow = (flowId: string) =>
  fetchClient(`/subscriptions/codex/poll/${flowId}`)
export const cancelCodexDeviceFlow = (flowId: string) =>
  fetchClient(`/subscriptions/codex/cancel/${flowId}`, { method: 'POST' })
export const refreshCodexSlot = (slotId: number) =>
  fetchClient(`/subscriptions/codex/refresh/${slotId}`, { method: 'POST' })
export const addCodexSlot = (accountId: number, purpose = 'dev') =>
  fetchClient(`/subscriptions/codex/add-slot/${accountId}`, { method: 'POST', body: JSON.stringify({ purpose }) })
export const assignCodexToUser = (userId: number, accountId: number) =>
  fetchClient('/subscriptions/codex/assign', { method: 'POST', body: JSON.stringify({ userId, accountId }) })
export const revokeCodexFromUser = (userId: number) =>
  fetchClient(`/subscriptions/codex/revoke/${userId}`, { method: 'POST' })
export const rotateCodexAccount = (fromAccountId: number, toAccountId: number) =>
  fetchClient('/subscriptions/codex/rotate', { method: 'POST', body: JSON.stringify({ fromAccountId, toAccountId }) })

// ── Tasks ──

export interface TaskListFilters {
  status?: string;
  assigneeId?: number;
  milestoneId?: number;
  q?: string;
  labelIds?: number[];
  limit?: number;
  cursor?: string;
  orderBy?: 'rank' | 'created' | 'updated' | 'due';
  includeDeleted?: boolean;
}

/**
 * Unwraps { items, nextCursor } and returns just items — for legacy callers
 * that treat the task list as a flat array. Use getTasksPage when you need
 * the cursor.
 */
export async function getTasks(projectId: number, filters?: TaskListFilters) {
  const res = await getTasksPage(projectId, filters);
  return res.items;
}

export async function getTasksPage(
  projectId: number,
  filters: TaskListFilters = {},
): Promise<{ items: any[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ projectId: String(projectId) });
  if (filters.status) params.set('status', filters.status);
  if (filters.assigneeId) params.set('assigneeId', String(filters.assigneeId));
  if (filters.milestoneId) params.set('milestoneId', String(filters.milestoneId));
  if (filters.q) params.set('q', filters.q);
  if (filters.labelIds && filters.labelIds.length) params.set('labelIds', filters.labelIds.join(','));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.orderBy) params.set('orderBy', filters.orderBy);
  if (filters.includeDeleted) params.set('includeDeleted', '1');
  return fetchClient(`/tasks?${params}`);
}

export async function createTaskApi(data: {
  // Optional — when omitted server routes the task to the assignee's Inbox
  // (or the caller's own Inbox if no assignee). Used by the global "New Task"
  // modal that lets users assign without picking a project.
  projectId?: number;
  title: string;
  description?: string;
  priority?: string;
  effort?: string;
  assigneeId?: number;
  milestoneId?: number;
  parentTaskId?: number;
  dueAt?: string | null;
  startAt?: string | null;
  labelIds?: number[];
}) {
  return fetchClient('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export async function getTask(id: number) {
  if (isDev()) return fetchDevClient(`/my-tasks/${id}`);
  return fetchClient(`/tasks/${id}`);
}

export async function updateTaskApi(id: number, data: any) {
  if (isDev()) return fetchDevClient(`/my-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return fetchClient(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteTaskApi(id: number) {
  return fetchClient(`/tasks/${id}`, { method: 'DELETE' });
}

export async function restoreTaskApi(id: number) {
  return fetchClient(`/tasks/${id}/restore`, { method: 'POST' });
}

export async function addTaskComment(taskId: number, content: string) {
  if (isDev()) return fetchDevClient(`/my-tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
  return fetchClient(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
}

export async function assignTask(taskId: number, assigneeId: number | null, reason?: string) {
  if (isDev()) throw new Error('Developers cannot reassign tasks');
  return fetchClient(`/tasks/${taskId}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ assigneeId, reason }),
  });
}

export async function changeTaskStatus(taskId: number, status: string, reason?: string) {
  if (isDev()) {
    return fetchDevClient(`/my-tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  }
  return fetchClient(`/tasks/${taskId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, reason }),
  });
}

export async function reorderTaskApi(
  taskId: number,
  opts: { beforeTaskId?: number | null; afterTaskId?: number | null },
) {
  return fetchClient(`/tasks/${taskId}/rank`, { method: 'PUT', body: JSON.stringify(opts) });
}

export async function setTaskLabelsApi(taskId: number, labelIds: number[]) {
  if (isDev()) return fetchDevClient(`/my-tasks/${taskId}/labels`, { method: 'PUT', body: JSON.stringify({ labelIds }) });
  return fetchClient(`/tasks/${taskId}/labels`, { method: 'PUT', body: JSON.stringify({ labelIds }) });
}

// ── Bulk task ops ──

export async function bulkTaskOp(data: {
  ids: number[];
  action: 'assign' | 'status' | 'priority' | 'labels' | 'delete' | 'restore';
  value?: any;
  reason?: string;
  labelIds?: number[];
}) {
  return fetchClient('/tasks/bulk', { method: 'POST', body: JSON.stringify(data) });
}

// ── Saved views ──

export async function listSavedViewsApi(projectId?: number) {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return fetchClient(`/saved-views${qs}`);
}

export async function createSavedViewApi(data: any) {
  return fetchClient('/saved-views', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSavedViewApi(id: number, data: any) {
  return fetchClient(`/saved-views/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteSavedViewApi(id: number) {
  return fetchClient(`/saved-views/${id}`, { method: 'DELETE' });
}

// ── Labels ──

export async function listLabelsApi(projectId: number) {
  if (isDev()) return fetchDevClient(`/projects/${projectId}/labels`);
  return fetchClient(`/projects/${projectId}/labels`);
}

export async function createLabelApi(projectId: number, data: { name: string; color?: string }) {
  return fetchClient(`/projects/${projectId}/labels`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateLabelApi(id: number, data: { name?: string; color?: string }) {
  return fetchClient(`/labels/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteLabelApi(id: number) {
  return fetchClient(`/labels/${id}`, { method: 'DELETE' });
}

// ── Milestones ──

export async function getMilestones(projectId: number) {
  return fetchClient(`/projects/${projectId}/milestones`);
}

export async function createMilestoneApi(projectId: number, data: { name: string; description?: string; dueDate?: string }) {
  return fetchClient(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMilestoneApi(id: number, data: any) {
  return fetchClient(`/milestones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteMilestoneApi(id: number) {
  return fetchClient(`/milestones/${id}`, { method: 'DELETE' });
}

// ── Requirements & AI Task Generation ──

export async function submitRequirement(data: {
  projectId: number;
  inputType?: string;
  content: string;
  targetAssigneeIds?: number[];
}) {
  return fetchClient('/requirements', { method: 'POST', body: JSON.stringify(data) });
}

export async function getRequirement(id: number) {
  return fetchClient(`/requirements/${id}`);
}

export async function getRequirementSuggestions(requirementId: number) {
  return fetchClient(`/requirements/${requirementId}/suggestions`);
}

export async function listProjectRequirementsApi(projectId: number) {
  return fetchClient(`/projects/${projectId}/requirements`);
}

export async function approveRequirementSuggestions(
  requirementId: number,
  body?: { selectedIds?: number[]; edits?: Record<number, any> },
) {
  return fetchClient(`/requirements/${requirementId}/approve`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export async function rejectRequirementSuggestions(requirementId: number, reason?: string) {
  return fetchClient(`/requirements/${requirementId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ── Activity ──

export async function getUserActivity(userId: number, since?: string) {
  const params = since ? `?since=${since}` : '';
  return fetchClient(`/activity/${userId}${params}`);
}

export async function getUserActivityWindows(userId: number, date?: string) {
  const params = date ? `?date=${date}` : '';
  return fetchClient(`/activity/windows/${userId}${params}`);
}

// ── Task Status Configs ──

export async function getTaskStatuses(projectId: number) {
  return fetchClient(`/projects/${projectId}/statuses`);
}

export async function createTaskStatusApi(projectId: number, data: { name: string; color?: string; position?: number; isDoneState?: boolean }) {
  return fetchClient(`/projects/${projectId}/statuses`, { method: 'POST', body: JSON.stringify(data) });
}

// ── Admin Approval Protocol ─────────────────────────────

export interface StopRequest {
  id: number
  userId: number
  action: string
  requestId: string
  status: string
  createdAt: string
  expiresAt: string
}

export async function generateStopCode(userId: number, action: 'stop' | 'uninstall') {
  return fetchClient('/approvals/generate-code', {
    method: 'POST',
    body: JSON.stringify({ userId, action }),
  }) as Promise<{ code: string; expiresAt: string }>
}

// Antigravity override
export async function setAntigravityOverride(userId: number, override: 'on' | 'off' | null) {
  return fetchClient(`/users/${userId}/antigravity-override`, {
    method: 'POST',
    body: JSON.stringify({ override }),
  })
}

export async function approveStopRequest(requestId: string) {
  return fetchClient(`/approvals/${requestId}/approve`, { method: 'POST' }) as Promise<{ ok: boolean }>
}

export async function denyStopRequest(requestId: string) {
  return fetchClient(`/approvals/${requestId}/deny`, { method: 'POST' }) as Promise<{ ok: boolean }>
}

export async function getPendingStopRequests() {
  return fetchClient('/approvals/pending') as Promise<StopRequest[]>
}

// ── AI Insights ──────────────────────────────────────────

export const getAiSettings = () => fetchClient('/ai/settings')
export const updateAiSetting = (key: string, value: string) =>
  fetchClient('/ai/settings', { method: 'PUT', body: JSON.stringify({ key, value }) })
export const getAiEngineStatus = () => fetchClient('/ai/engine/status')
export const getAiQueueStats = () => fetchClient('/ai/queue/stats') as Promise<{
  depth: number
  running: number
  currentBackoffMs: number
  maxConcurrent: number
  minSpacingMs: number
  maxJitterMs: number
  byPriority: Record<string, number>
  byEngine: { codex: number; claude: number }
  totals: {
    dispatched: number
    succeeded: number
    failed: number
    retried: number
    rateLimited: number
    timedOut: number
  }
  oldestTaskAgeMs: number
}>
export async function runAiPlayground(body: {
  engine: 'claude' | 'codex'
  prompt: string
  systemPrompt?: string
  model?: string
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh'
  timeout?: number
}): Promise<{
  ok: boolean
  engine: string
  raw?: string
  durationMs?: number
  usage?: { inputTokens: number; cachedInputTokens: number; outputTokens: number }
  error?: string
  stderr?: string
  stdout?: string
}> {
  const token = useAuthStore.getState().token
  const res = await fetch('/api/admin/ai/playground', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  // Both 200 and 502 return a structured JSON body.
  return res.json()
}
export const triggerAiRunNow = () => fetchClient('/ai/run-now', { method: 'POST' })
export const generateInsight = (body: { userId?: number; date?: string }) =>
  fetchClient('/ai/insights/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as Promise<{
    ok: boolean
    userId: number | null
    date: string | null
    rollup: { usersProcessed: number; errors: string[] }
    narrative: { usersProcessed: number; errors: string[] }
    durationMs: number
  }>
export const triggerAiBackfill = () => fetchClient('/ai/backfill', { method: 'POST' })
export const getAiBackfillProgress = () => fetchClient('/ai/backfill/progress')
export const triggerAiReset = (rerun: boolean) =>
  fetchClient('/ai/reset', { method: 'POST', body: JSON.stringify({ rerun }) })

export const getAiDailySummaries = (date: string) => fetchClient(`/ai/daily?date=${date}`)
export const getAiDailyRange = (start: string, end: string) =>
  fetchClient(`/ai/daily/range?start=${start}&end=${end}`)
export const getAiWeeklySummaries = (weekStart: string) =>
  fetchClient(`/ai/weekly?weekStart=${weekStart}`)
export const getAiSessionDetail = (sessionId: string) => fetchClient(`/ai/sessions/${sessionId}`)
export const getAiUserSessions = (userId: number, date: string) =>
  fetchClient(`/ai/users/${userId}/sessions?date=${date}`)

export const getAiProfiles = () => fetchClient('/ai/profiles')
export const getAiProfile = (userId: number) => fetchClient(`/ai/profiles/${userId}`)
export const getAiProfileHistory = (userId: number) => fetchClient(`/ai/profiles/${userId}/history`)
export const regenerateAiProfile = (userId: number) =>
  fetchClient(`/ai/profiles/${userId}/regenerate`, { method: 'POST' }) as Promise<{
    ok: boolean
    userId: number
    engine: string
    durationMs: number
    profile: unknown
  }>

export const getAiLogs = (params: { jobType?: string; status?: string; userId?: number; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams()
  if (params.jobType) qs.set('jobType', params.jobType)
  if (params.status) qs.set('status', params.status)
  if (params.userId) qs.set('userId', String(params.userId))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.offset) qs.set('offset', String(params.offset))
  return fetchClient(`/ai/logs?${qs.toString()}`)
}
export const getAiLogStats = () => fetchClient('/ai/logs/stats')

// ── Linked Directories ───────────────────────────────────
export const getLinkedDirectories = (userId?: number) =>
  fetchClient(`/linked-directories${userId ? `?userId=${userId}` : ''}`)

export const setLinkedDirectoryState = (id: number, state: string) =>
  fetchClient(`/linked-directories/${id}/state`, {
    method: 'POST',
    body: JSON.stringify({ state }),
  })

export const deleteLinkedDirectory = (id: number) =>
  fetchClient(`/linked-directories/${id}`, { method: 'DELETE' })

// ── Git Commits ──────────────────────────────────────────
export const getGitCommits = (params: { userId?: number; repoId?: number }) => {
  const qs = new URLSearchParams()
  if (params.userId !== undefined) qs.set('userId', String(params.userId))
  if (params.repoId !== undefined) qs.set('repoId', String(params.repoId))
  const query = qs.toString()
  return fetchClient(`/git-commits${query ? `?${query}` : ''}`)
}

export const getUnmappedCommits = () => fetchClient('/git-commits/unmapped')

export const assignCommitToUser = (commitId: number, userId: number) =>
  fetchClient(`/git-commits/${commitId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })

// ── Git Summaries ────────────────────────────────────────
export const getGitSummaries = (userId: number, date?: string) =>
  fetchClient(`/git-summaries?userId=${userId}${date ? `&date=${date}` : ''}`)

// ── GitHub Integration ───────────────────────────────────
export const getGithubStatus = () => fetchClient('/integrations/github/status')

export const saveGithubToken = (token: string | null, useGhCli = false) =>
  fetchClient('/integrations/github/token', {
    method: 'POST',
    body: JSON.stringify(useGhCli ? { useGhCli: true } : { token }),
  })

export const testGithubToken = () =>
  fetchClient('/integrations/github/test', { method: 'POST' })

// ── System Settings ──────────────────────────────────────
export const getSystemSettings = (category?: string) =>
  fetchClient(`/system-settings${category ? `?category=${category}` : ''}`)

export const updateSystemSetting = (key: string, value: unknown) =>
  fetchClient(`/system-settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })

// ── Activity events ────────────────────────────────────────────────────────
export const getActivityEvents = (params: { userId: number; date?: string; source?: string; limit?: number }) => {
  const qs = new URLSearchParams();
  qs.set('userId', String(params.userId));
  if (params.date) qs.set('date', params.date);
  if (params.source) qs.set('source', params.source);
  if (params.limit != null) qs.set('limit', String(params.limit));
  return fetchClient(`/activity-events?${qs.toString()}`);
};

export const getActivityEventDetail = (id: number) =>
  fetchClient(`/activity-events/${id}`);

export const getTeamActivity = (date?: string) =>
  fetchClient(`/team-activity${date ? `?date=${date}` : ''}`);

export const getLiveActivity = (windowMin = 5) =>
  fetchClient(`/live-activity?windowMin=${windowMin}`);

export const getWorkWindows = (userId: number, date: string) =>
  fetchClient(`/work-windows?userId=${userId}&date=${date}`);

export const getHourlyHistogram = (userId: number, date: string) =>
  fetchClient(`/hourly-histogram?userId=${userId}&date=${date}`);

// ── Job triggers ───────────────────────────────────────────────────────────
export const runDailyRollupNow = (opts?: { userId?: number; date?: string }) =>
  fetchClient('/jobs/daily-rollup/run', { method: 'POST', body: JSON.stringify(opts ?? {}) });

// runDailyNarrativeNow removed — the narrative is now produced as the
// final step of ai-summarize (Layer 3 merged pipeline). Use
// `generateInsight` above to force regeneration for a single user.

export const runWeeklyRollupNow = (opts?: { userId?: number; weekStart?: string }) =>
  fetchClient('/jobs/weekly-rollup/run', { method: 'POST', body: JSON.stringify(opts ?? {}) });

export const runProfileRebuildNow = (opts?: { userId?: number }) =>
  fetchClient('/jobs/profile-rebuild/run', { method: 'POST', body: JSON.stringify(opts ?? {}) });

export const runRetentionPurgeNow = () =>
  fetchClient('/jobs/retention-purge/run', { method: 'POST' });

export const getJobsStatus = () =>
  fetchClient('/jobs/status');

// ── Retention ──────────────────────────────────────────────────────────────
export const getRetentionStats = () => fetchClient('/retention/stats');
export const getRetentionHistory = (limit = 30) => fetchClient(`/retention/purge-history?limit=${limit}`);

// ── Timezone ───────────────────────────────────────────────────────────────
export const updateUserTimezone = (userId: number, timezone: string) =>
  fetchClient(`/users/${userId}/timezone`, { method: 'PUT', body: JSON.stringify({ timezone }) });

// ── Daily summaries (repointed for Phase 1.5) ──────────────────────────────
export const getDailySummaries = (userId: number, from?: string, to?: string) => {
  const qs = new URLSearchParams();
  qs.set('userId', String(userId));
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  return fetchClient(`/daily-summaries?${qs.toString()}`);
};

export const getDailySummary = (userId: number, date: string) =>
  fetchClient(`/daily-summaries/${userId}/${date}`);
export const getActivityWindowSummaries = (userId: number, date: string, tz = 'UTC') =>
  fetchClient(`/activity-windows/${userId}/${date}?tz=${encodeURIComponent(tz)}`);

// ── Server Machines ──────────────────────────────────────
export const getServerMachines = () => fetchClient('/server-machines');
export const getServerMachine = (id: number) => fetchClient(`/server-machines/${id}`);
export const decommissionServerMachine = (id: number) =>
  fetchClient(`/server-machines/${id}/decommission`, { method: 'POST' });
export const reissueMachineJwt = (id: number) =>
  fetchClient(`/server-machines/${id}/reissue-jwt`, { method: 'POST' });

// ── Server Leases ────────────────────────────────────────
export const getServerLeases = (params: { machineId?: number; userId?: number; status?: string; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  if (params.machineId != null) qs.set('machineId', String(params.machineId));
  if (params.userId != null) qs.set('userId', String(params.userId));
  if (params.status) qs.set('status', params.status);
  if (params.limit != null) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return fetchClient(`/leases${q ? `?${q}` : ''}`);
};
export const revokeServerLease = (id: number) =>
  fetchClient(`/leases/${id}/revoke`, { method: 'POST' });
export const adminExtendServerLease = (id: number, minutes: number) =>
  fetchClient(`/leases/${id}/extend`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  });

// ── Focus Sessions ───────────────────────────────────────
export const getPendingFocusSessionReview = () =>
  fetchClient('/focus-sessions/pending-review');

export const getFocusSessions = (params: { userId?: number; reviewed?: 'yes' | 'no' | 'all'; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  if (params.userId != null) qs.set('userId', String(params.userId));
  if (params.reviewed) qs.set('reviewed', params.reviewed);
  if (params.limit != null) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return fetchClient(`/focus-sessions${q ? `?${q}` : ''}`);
};

export const reviewFocusSession = (id: number, outcome: 'approved' | 'flagged' | 'rejected', linkedTaskId?: number | null) =>
  fetchClient(`/focus-sessions/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ outcome, linkedTaskId }),
  });

// ── AI Engine (provider-agnostic pipeline) ─────────────────────────────────

export interface AiProviderModel {
  id: string
  fqId: string
  displayName?: string
  capabilities: string[]
  contextWindow: number
  maxOutput: number
  pricing: { inputPerM: number; outputPerM: number; cacheReadPerM?: number; cacheWritePerM?: number }
  speed?: 'fast' | 'standard' | 'slow'
  free?: boolean
}

export interface AiProvider {
  name: string
  models: AiProviderModel[]
}

export interface AiProvidersResponse {
  providers: AiProvider[]
  keys: Record<string, boolean>
  langfuse: { configured: boolean; host: string }
}

export interface AiRuntimeConfig {
  routing: { chains: Record<string, string[]> }
  compaction: {
    enabled: boolean
    threshold: { type: 'messages' | 'tokens'; value: number }
    lastKTurnsVerbatim: number
    summaryMaxTokens: number
    summaryModelOverride?: string
    systemPrompt?: string
  }
  features: Record<string, { enabled: boolean }>
}

export interface AiSettingsResponse {
  config: AiRuntimeConfig
  knownFeatures: string[]
  featureNames: string[]
}

export const getAiProviders = (): Promise<AiProvidersResponse> =>
  fetchClient('/ai/providers')

export const getAiPipelineSettings = (): Promise<AiSettingsResponse> =>
  fetchClient('/ai/settings')

export const saveAiPipelineSettings = (config: AiRuntimeConfig): Promise<{ config: AiRuntimeConfig }> =>
  fetchClient('/ai/settings', {
    method: 'PUT',
    body: JSON.stringify(config),
  })

export const testAiFeature = (
  feature: string,
): Promise<{
  ok: boolean
  feature: string
  provider?: string
  model?: string
  fallbackHops?: number
  durationMs?: number
  cost?: number
  traceId?: string
  usage?: { inputTokens: number; outputTokens: number }
  echo?: string
  error?: string
}> =>
  fetchClient(`/ai/features/${feature}/test`, { method: 'POST' })

// ── Lens prompt tracking ─────────────────────────────────────────────────────
// Admin/team views go through fetchClient (/api/admin/*); self-service goes
// through fetchMe (/api/v1/me/*), which accepts developer-kind tokens too.

async function fetchMe(endpoint: string, opts: RequestInit = {}) {
  const token = useAuthStore.getState().token
  const headers = new Headers(opts.headers as HeadersInit | undefined)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`/api/v1/me${endpoint}`, { ...opts, headers })
  if (response.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (response.status === 204) return null
  if (!response.ok) {
    let message = 'An error occurred'
    try { const err = await response.json(); message = err.error || err.message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  return response.json()
}

export interface PromptRow {
  id: number
  userId: number
  userName?: string
  deviceId: number | null
  deviceName?: string | null
  sessionId: string | null
  model: string | null
  promptChars: number | null
  cwd: string | null
  occurredAt: string
  createdAt: string
  preview?: string        // present on list responses
  promptText?: string     // present on detail responses
}

export interface DeviceRow {
  id: number
  userId?: number
  userName?: string
  name: string
  platform: string | null
  osVersion: string | null
  hostname: string | null
  status: string
  clientVersion: string | null
  firstSeenAt: string
  lastSeenAt: string
  createdAt: string
}

export interface PromptListResponse {
  data: PromptRow[]
  total: number
  limit: number
  offset: number
}

export interface PromptFilters {
  limit?: number
  offset?: number
  model?: string
  q?: string
  session?: string
  device?: number
  user?: number
  from?: string
  to?: string
}

function promptQS(f: PromptFilters = {}): string {
  const qs = new URLSearchParams()
  if (f.limit != null) qs.set('limit', String(f.limit))
  if (f.offset != null) qs.set('offset', String(f.offset))
  if (f.model) qs.set('model', f.model)
  if (f.q) qs.set('q', f.q)
  if (f.session) qs.set('session', f.session)
  if (f.device != null) qs.set('device', String(f.device))
  if (f.user != null) qs.set('user', String(f.user))
  if (f.from) qs.set('from', f.from)
  if (f.to) qs.set('to', f.to)
  const s = qs.toString()
  return s ? `?${s}` : ''
}

// Admin / team-wide (requires prompts.view.all)
export const lensGetPrompts = (f?: PromptFilters): Promise<PromptListResponse> =>
  fetchClient(`/prompts${promptQS(f)}`)
export const lensGetPrompt = (id: number): Promise<{ data: PromptRow }> =>
  fetchClient(`/prompts/${id}`)
export const lensGetUserPrompts = (userId: number | string, f?: PromptFilters): Promise<PromptListResponse> =>
  fetchClient(`/users/${userId}/prompts${promptQS(f)}`)
export const lensGetDevices = (): Promise<{ data: DeviceRow[] }> =>
  fetchClient('/devices')
export const lensRevokeDevice = (id: number): Promise<{ ok: boolean }> =>
  fetchClient(`/devices/${id}`, { method: 'DELETE' })

// Self-service (requires prompts.view.own / devices.manage.own)
export const meGetPrompts = (f?: PromptFilters): Promise<PromptListResponse> =>
  fetchMe(`/prompts${promptQS(f)}`)
export const meGetPrompt = (id: number): Promise<{ data: PromptRow }> =>
  fetchMe(`/prompts/${id}`)
export const meGetPromptStats = (): Promise<{ today: number; week: number; month: number }> =>
  fetchMe('/prompts/stats')
export const meGetDevices = (): Promise<{ data: DeviceRow[] }> =>
  fetchMe('/devices')
export const meCreateDevice = (data: { name?: string; platform?: string }): Promise<{ id: number; name: string; token: string; status: string; createdAt: string }> =>
  fetchMe('/devices', { method: 'POST', body: JSON.stringify(data) })
export const meRevokeDevice = (id: number): Promise<{ ok: boolean }> =>
  fetchMe(`/devices/${id}`, { method: 'DELETE' })
