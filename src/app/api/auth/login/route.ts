import { createAuthClient, createClient } from '@/lib/supabase/server';
import { hasJsonContentType, isRecord, jsonResponse } from '@/app/api/_lib/http';

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return jsonResponse({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, 415);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' }, 400);
  }

  if (!isRecord(payload)) {
    return jsonResponse({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length > 1024
  ) {
    return jsonResponse({ error: 'กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง' }, 400);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Login is unavailable because Supabase environment variables are missing.');
    return jsonResponse({ error: 'ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน' }, 503);
  }

  const authClient = await createAuthClient();
  const { data: authData, error } = await authClient.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 500 || error.message === 'Database error querying schema') {
      console.error('Supabase Auth database error during signInWithPassword:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      return jsonResponse(
        { error: 'ระบบยืนยันตัวตนของ Supabase เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจการตั้งค่า Auth/Database' },
        503
      );
    }

    if (error.status !== 400 && error.status !== 401 && error.status !== 422) {
      console.error('Supabase login request failed unexpectedly:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      return jsonResponse({ error: 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้' }, 502);
    }

    return jsonResponse({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401);
  }

  // After successful sign-in, read the user's role so the client can redirect correctly
  let role: string = 'customer';
  if (authData?.user?.id) {
    const coinClient = await createClient();
    const { data: profile } = await coinClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();
    role = (profile as { role?: string } | null)?.role ?? 'customer';
  }

  return jsonResponse({ success: true, role }, 200);
}
