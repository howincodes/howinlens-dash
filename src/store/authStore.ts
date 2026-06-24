import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  name: string
  email: string
  role: string
  kind?: 'admin' | 'developer'
  permissions?: string[]
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setPermissions: (permissions: string[]) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setPermissions: (permissions) =>
        set((state) =>
          state.user ? { user: { ...state.user, permissions } } : state,
        ),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'howinlens-auth',
    },
  ),
)

/**
 * Hook: does the current user have an exact permission key?
 * Admin role always returns true (matches server-side requirePerm bypass).
 */
export function useHasPermission(key: string): boolean {
  const perms = useAuthStore((s) => s.user?.permissions ?? [])
  const role = useAuthStore((s) => s.user?.role)
  if (role === 'Admin') return true
  return perms.includes(key)
}

/**
 * Hook: does the current user have any permission whose key starts
 * with the given prefix? (e.g. `hasAnyPermission('hr.')`)
 */
export function useHasAnyPermission(prefix: string): boolean {
  const perms = useAuthStore((s) => s.user?.permissions ?? [])
  const role = useAuthStore((s) => s.user?.role)
  if (role === 'Admin') return true
  return perms.some((p) => p.startsWith(prefix))
}
