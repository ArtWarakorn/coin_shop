import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createClientWithSchema(schema: string) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: schema as 'public',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

export async function createClient() {
  return createClientWithSchema(process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'coin_shop');
}

export async function createAuthClient() {
  return createClientWithSchema('public');
}
