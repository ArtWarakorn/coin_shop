import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { homePathForRole } from '@/lib/auth/roles';
import type { Profile, UserRole } from '@/types/database';

/**
 * Data Access Layer for auth. Every protected page calls requireUser() or
 * requireRole() itself, because a layout does not stop its child page from
 * running. React cache() makes repeat calls within one request free, so a
 * layout and page can both check without extra Supabase round trips.
 */

export interface SessionUser {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
}

/** Verifies the JWT locally (getClaims), so no call to Supabase Auth per page. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata ?? {},
  };
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data as Profile | null;
});

/** Redirects to login when signed out. Pass the path to return to after login. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/login?redirectTo=${returnTo}` : '/login');
  }
  return user;
}

/** Redirects to login when signed out, or to the user's own area on a role mismatch. */
export async function requireRole(role: UserRole, returnTo: string) {
  const user = await requireUser(returnTo);
  const profile = await getCurrentProfile();

  if (profile?.role !== role) {
    redirect(homePathForRole(profile?.role));
  }

  return { user, profile };
}
