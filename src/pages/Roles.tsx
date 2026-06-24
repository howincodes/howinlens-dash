import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRoles,
  getPermissions,
  getRolePermissions,
  createRole,
  updateRoleApi,
  deleteRoleApi,
} from '../lib/api';
import PermissionMatrix from '../components/PermissionMatrix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  Lock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Roles & Permissions page — matches the standard admin dashboard look:
// compact header, Card/Button/Input primitives, lucide icons, semantic
// tokens. Functional improvements: per-role permission count + progress
// bar, expandable "view granted permissions" section grouped by category,
// and a revamped PermissionMatrix rendered under a secondary tab.

interface Permission {
  id: number;
  key: string;
  name: string;
  category: string;
}

interface Role {
  id: number;
  name: string;
  description?: string | null;
  isSystem?: boolean;
}

// Small role-color palette. Keeps per-role visual identity consistent
// without leaning on a separate badge component.
const ROLE_ACCENTS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  Admin: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-900',
    bar: 'bg-red-500',
  },
  'Team Lead': {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900',
    bar: 'bg-orange-500',
  },
  'Project Manager': {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900',
    bar: 'bg-blue-500',
  },
  'Project Coordinator': {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-900',
    bar: 'bg-cyan-500',
  },
  HR: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-900',
    bar: 'bg-pink-500',
  },
  Developer: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    bar: 'bg-emerald-500',
  },
  Viewer: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    bar: 'bg-slate-500',
  },
};

function getRoleAccent(name: string) {
  return (
    ROLE_ACCENTS[name] ?? {
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      text: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-200 dark:border-violet-900',
      bar: 'bg-violet-500',
    }
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function Roles() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [activeView, setActiveView] = useState<'list' | 'matrix'>('list');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  });
  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: () => getPermissions(),
    staleTime: 5 * 60_000,
  });

  const rolePermsQueries = useRolePermissionsMap(roles);
  const rolePermsLoaded = !rolesLoading && rolePermsQueries.isReady;

  const totalPerms = permissions.length;

  const permsByCategory = useMemo(() => {
    const out: Record<string, Permission[]> = {};
    for (const p of permissions) {
      (out[p.category] ??= []).push(p);
    }
    for (const k of Object.keys(out)) out[k]!.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [permissions]);

  const handleCreate = async () => {
    if (!newRole.name.trim()) return;
    try {
      await createRole(newRole);
      toast.success(`Created "${newRole.name}"`);
      setNewRole({ name: '', description: '' });
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['roles'] });
    } catch (e: any) {
      toast.error(`Couldn't create — ${e?.message ?? 'unknown'}`);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await updateRoleApi(id, editData);
      toast.success('Role updated');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['roles'] });
    } catch (e: any) {
      toast.error(`Update failed — ${e?.message ?? 'unknown'}`);
    }
  };

  const handleDelete = async (role: Role) => {
    if (
      !confirm(
        `Delete the role "${role.name}"?\n\nUsers currently assigned this role will lose its permissions.`,
      )
    )
      return;
    try {
      await deleteRoleApi(role.id);
      toast.success('Role deleted');
      qc.invalidateQueries({ queryKey: ['roles'] });
    } catch (e: any) {
      toast.error(`Delete failed — ${e?.message ?? 'unknown'}`);
    }
  };

  const systemRoleCount = roles.filter((r) => r.isSystem).length;
  const customRoleCount = roles.length - systemRoleCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Roles &amp; Permissions</h1>
        <p className="text-muted-foreground">
          Define who can do what. Each role is a named bundle of permissions; users inherit a role's
          abilities the moment they're assigned.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Roles" value={roles.length} icon={<Shield className="w-4 h-4" />} />
        <StatCard
          label="System roles"
          value={systemRoleCount}
          icon={<Lock className="w-4 h-4 text-muted-foreground" />}
        />
        <StatCard
          label="Custom roles"
          value={customRoleCount}
          icon={<Edit2 className="w-4 h-4 text-muted-foreground" />}
        />
        <StatCard
          label="Permissions"
          value={totalPerms}
          icon={<CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      {/* Tab bar + action */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/30">
          <button
            onClick={() => setActiveView('list')}
            className={cn(
              'text-xs px-3 py-1.5 rounded transition-colors',
              activeView === 'list'
                ? 'bg-card shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Roles
          </button>
          <button
            onClick={() => setActiveView('matrix')}
            className={cn(
              'text-xs px-3 py-1.5 rounded transition-colors',
              activeView === 'matrix'
                ? 'bg-card shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Permission Matrix
          </button>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          New role
        </Button>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create a new role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Role name
                </label>
                <Input
                  placeholder="e.g. Design Lead"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Description
                </label>
                <Input
                  placeholder="What this role is responsible for"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={!newRole.name.trim()}>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Create role
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCreate(false);
                  setNewRole({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {activeView === 'list' ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{roles.length} Roles</CardTitle>
              {rolePermsLoaded && (
                <span className="text-xs text-muted-foreground">
                  Click a row to view its granted permissions
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {rolesLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : roles.length === 0 ? (
              <div className="m-4 p-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <Shield className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No roles yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seed system roles or create your first custom role.
                </p>
                <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> New role
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {roles.map((role) => {
                  const grantedIds = rolePermsQueries.byRole.get(role.id) ?? new Set<number>();
                  const grantCount = grantedIds.size;
                  const pctGranted =
                    totalPerms > 0 ? Math.round((grantCount / totalPerms) * 100) : 0;
                  const expanded = expandedId === role.id;
                  const isEditing = editingId === role.id;

                  return (
                    <RoleRow
                      key={role.id}
                      role={role}
                      grantCount={grantCount}
                      totalPerms={totalPerms}
                      pctGranted={pctGranted}
                      rolePermsLoaded={rolePermsLoaded}
                      grantedIds={grantedIds}
                      permsByCategory={permsByCategory}
                      expanded={expanded}
                      onToggle={() => setExpandedId(expanded ? null : role.id)}
                      isEditing={isEditing}
                      editData={editData}
                      setEditData={setEditData}
                      onStartEdit={() => {
                        setEditingId(role.id);
                        setEditData({ name: role.name, description: role.description ?? '' });
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={() => handleUpdate(role.id)}
                      onDelete={() => handleDelete(role)}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Permission Matrix</CardTitle>
            <p className="text-xs text-muted-foreground">
              Toggle any cell to grant or revoke a permission. Changes save automatically.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <PermissionMatrix />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{value.toLocaleString()}</div>
          </div>
          <div className="h-9 w-9 rounded-md bg-muted/50 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleRow({
  role,
  grantCount,
  totalPerms,
  pctGranted,
  rolePermsLoaded,
  grantedIds,
  permsByCategory,
  expanded,
  onToggle,
  isEditing,
  editData,
  setEditData,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  role: Role;
  grantCount: number;
  totalPerms: number;
  pctGranted: number;
  rolePermsLoaded: boolean;
  grantedIds: Set<number>;
  permsByCategory: Record<string, Permission[]>;
  expanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  editData: { name: string; description: string };
  setEditData: (d: { name: string; description: string }) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}) {
  const accent = getRoleAccent(role.name);
  const hasFullAccess = totalPerms > 0 && grantCount === totalPerms;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-4 px-6 py-4 transition-colors',
          !isEditing && 'hover:bg-muted/20 cursor-pointer',
        )}
        onClick={() => {
          if (!isEditing) onToggle();
        }}
      >
        {/* Avatar */}
        <div
          className={cn(
            'h-10 w-10 rounded-md border flex items-center justify-center flex-shrink-0 font-semibold text-sm',
            accent.bg,
            accent.border,
            accent.text,
          )}
        >
          {initials(role.name)}
        </div>

        {/* Main body */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Role name"
                autoFocus
              />
              <Input
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Description"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveEdit}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{role.name}</span>
                {role.isSystem && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    System
                  </Badge>
                )}
                {hasFullAccess && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                  >
                    Full access
                  </Badge>
                )}
              </div>
              {role.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {role.description}
                </p>
              )}

              {/* Permission meter */}
              <div className="mt-2 flex items-center gap-3 max-w-md">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all duration-500', accent.bar)}
                    style={{ width: `${pctGranted}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                  {rolePermsLoaded ? (
                    <>
                      <span className="text-foreground font-semibold">{grantCount}</span>
                      {' / '}
                      {totalPerms}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Actions + expand */}
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={onStartEdit} title="Edit">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            {!role.isSystem && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                title="Delete"
                className="text-muted-foreground hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </div>
        )}
      </div>

      {/* Expanded permission detail */}
      {expanded && !isEditing && (
        <div className="bg-muted/20 border-t border-border px-6 py-4">
          {Object.keys(permsByCategory).length === 0 ? (
            <div className="text-xs text-muted-foreground italic text-center py-2">
              No permissions defined
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(permsByCategory).map(([category, perms]) => {
                const granted = perms.filter((p) => grantedIds.has(p.id));
                return (
                  <div key={category}>
                    <div className="flex items-baseline justify-between mb-2 pb-1 border-b border-border">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        {category}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {granted.length}/{perms.length}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {perms.map((p) => {
                        const ok = grantedIds.has(p.id);
                        return (
                          <li key={p.id} className="flex items-center gap-2 text-xs">
                            {ok ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span
                              className={cn(
                                'truncate',
                                ok ? 'text-foreground' : 'text-muted-foreground/60',
                              )}
                            >
                              {p.name}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role → permission-set loader. Fires N parallel requests and exposes a
// single Map<roleId, Set<permissionId>> for the list view.
// ─────────────────────────────────────────────────────────────────────────────
function useRolePermissionsMap(roles: Role[]) {
  const [byRole, setByRole] = useState<Map<number, Set<number>>>(new Map());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (roles.length === 0) {
      setByRole(new Map());
      setIsReady(true);
      return;
    }
    let cancelled = false;
    setIsReady(false);
    Promise.all(
      roles.map(async (r) => {
        try {
          const rows = await getRolePermissions(r.id);
          const ids = new Set<number>(rows.map((rp: any) => rp.permissionId));
          return [r.id, ids] as const;
        } catch {
          return [r.id, new Set<number>()] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const m = new Map<number, Set<number>>();
      for (const [id, set] of pairs) m.set(id, set);
      setByRole(m);
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [roles]);

  return { byRole, isReady };
}
