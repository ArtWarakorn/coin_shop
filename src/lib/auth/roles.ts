import type { UserRole } from '@/types/database';

/** Landing page for each role. Safe to import from client components. */
export function homePathForRole(role: UserRole | string | null | undefined): string {
  if (role === 'seller') return '/seller';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}
