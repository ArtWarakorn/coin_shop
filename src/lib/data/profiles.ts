import { createClient } from '@/lib/supabase/server';
import type { SessionUser } from '@/lib/auth/session';
import type { Profile } from '@/types/database';

export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as Profile[] | null) ?? [];
}

/** Self-heal: creates the coin_shop profile from auth metadata when it is missing. */
export async function createProfileFromAuth(user: SessionUser): Promise<Profile | null> {
  const metadata = user.user_metadata;
  const username =
    (metadata.username as string) ||
    (metadata.user_name as string) ||
    user.email?.split('@')[0] ||
    'user_' + user.id.slice(0, 6);
  const fullName =
    (metadata.full_name as string) || (metadata.fullName as string) || user.email || '';
  const phone = (metadata.phone as string) || '';

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      username,
      full_name: fullName,
      phone,
      role: 'customer',
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();
  return data as Profile | null;
}
