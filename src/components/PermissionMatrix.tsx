import { useState, useEffect, useMemo } from 'react';
import { getRoles, getPermissions, getRolePermissions, setRolePermissions } from '../lib/api';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Compact permission matrix. Category rows as band headers, permission rows
// with name + mono key, role columns as sticky headers. Toggles are rendered
// as filled-square check cells that highlight row/column on hover.
export default function PermissionMatrix() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<number, Set<number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([getRoles(), getPermissions()]);
      setRoles(r);
      setPermissions(p);

      const m: Record<number, Set<number>> = {};
      await Promise.all(
        r.map(async (role: any) => {
          const perms = await getRolePermissions(role.id);
          // Server returns a flat `{ permissionId, key, name, category }` shape.
          // Fall back to the nested join shape just in case an older build is live.
          m[role.id] = new Set(
            perms
              .map((rp: any) => rp.permissionId ?? rp.permissions?.id)
              .filter((id: any) => Number.isInteger(id)),
          );
        }),
      );
      setMatrix(m);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (roleId: number, permId: number) => {
    const current = matrix[roleId] || new Set<number>();
    const previous = new Set(current); // snapshot for rollback
    const updated = new Set(current);
    if (updated.has(permId)) updated.delete(permId);
    else updated.add(permId);
    setMatrix((m) => ({ ...m, [roleId]: updated }));

    setSaving(roleId);
    try {
      // Guard against undefined leaking into the payload — that's what wiped
      // roles to zero permissions before.
      const ids = Array.from(updated).filter((id) => Number.isInteger(id));
      await setRolePermissions(roleId, ids);
    } catch (err) {
      // Roll the cell back so the UI never claims a change that didn't persist.
      setMatrix((m) => ({ ...m, [roleId]: previous }));
      // eslint-disable-next-line no-console
      console.error('[PermissionMatrix] save failed, rolled back:', err);
      alert('Could not save that permission change. It has been reverted.');
    } finally {
      setSaving(null);
    }
  };

  const categories = useMemo(() => {
    const out: Record<string, any[]> = {};
    for (const p of permissions) (out[p.category] ??= []).push(p);
    for (const k of Object.keys(out)) out[k]!.sort((a, b) => a.name.localeCompare(b.name));
    return Object.entries(out).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        {/* Sticky role header */}
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="sticky left-0 z-10 bg-muted/30 text-left py-3 px-6 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[320px] min-w-[240px]">
              Permission
            </th>
            {roles.map((r, colIdx) => (
              <th
                key={r.id}
                className={cn(
                  'py-3 px-3 min-w-[110px] text-center align-bottom transition-colors',
                  hoverCol === colIdx && 'bg-muted/60',
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-semibold text-sm text-foreground">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {(matrix[r.id]?.size ?? 0)} / {permissions.length}
                  </span>
                  {saving === r.id && (
                    <span className="text-[9px] text-blue-600 animate-pulse">saving…</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {categories.map(([category, perms]) => (
            <CategoryBlock
              key={category}
              category={category}
              perms={perms}
              roles={roles}
              matrix={matrix}
              hoverRow={hoverRow}
              hoverCol={hoverCol}
              setHoverRow={setHoverRow}
              setHoverCol={setHoverCol}
              onToggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryBlock({
  category,
  perms,
  roles,
  matrix,
  hoverRow,
  hoverCol,
  setHoverRow,
  setHoverCol,
  onToggle,
}: {
  category: string;
  perms: any[];
  roles: any[];
  matrix: Record<number, Set<number>>;
  hoverRow: number | null;
  hoverCol: number | null;
  setHoverRow: (i: number | null) => void;
  setHoverCol: (i: number | null) => void;
  onToggle: (roleId: number, permId: number) => void;
}) {
  return (
    <>
      {/* Category band */}
      <tr>
        <td
          colSpan={roles.length + 1}
          className="sticky left-0 bg-muted/20 border-y border-border py-2 px-6"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {category}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {perms.length} {perms.length === 1 ? 'permission' : 'permissions'}
            </span>
          </div>
        </td>
      </tr>

      {perms.map((p) => (
        <tr
          key={p.id}
          onMouseEnter={() => setHoverRow(p.id)}
          onMouseLeave={() => setHoverRow(null)}
          className={cn(
            'border-b border-border/50 transition-colors',
            hoverRow === p.id && 'bg-muted/30',
          )}
        >
          <td className="sticky left-0 z-[5] bg-card py-2.5 px-6">
            <div className="flex flex-col">
              <span className="text-sm text-foreground">{p.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                {p.key}
              </span>
            </div>
          </td>
          {roles.map((r, colIdx) => {
            const granted = matrix[r.id]?.has(p.id) ?? false;
            const isHovered = hoverRow === p.id && hoverCol === colIdx;
            return (
              <td
                key={r.id}
                className={cn(
                  'text-center py-2.5 px-3 transition-colors',
                  hoverCol === colIdx && 'bg-muted/20',
                  isHovered && 'bg-muted/40',
                )}
                onMouseEnter={() => setHoverCol(colIdx)}
                onMouseLeave={() => setHoverCol(null)}
              >
                <button
                  onClick={() => onToggle(r.id, p.id)}
                  className={cn(
                    'group relative h-5 w-5 rounded inline-flex items-center justify-center transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    granted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border bg-card hover:border-primary/50',
                  )}
                  aria-label={granted ? 'revoke' : 'grant'}
                >
                  {granted && <Check className="w-3 h-3" strokeWidth={3} />}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
