import { createAuthClient, createClient } from '@/lib/supabase/server';
import { hasJsonContentType, isRecord, jsonResponse } from '@/app/api/_lib/http';

function describeSignUpError(error: { status?: number; code?: string; message: string }) {
  const message = error.message ?? '';
  if (error.code === 'user_already_exists' || /already registered/i.test(message)) {
    return { status: 409, message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น' };
  }
  // The profile trigger fails on a duplicate username (unique index on lower(username)).
  if (/database error saving new user/i.test(message)) {
    return { status: 409, message: 'user_name นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น' };
  }
  if (error.code === 'weak_password' || /password/i.test(message)) {
    return { status: 400, message: 'รหัสผ่านไม่ปลอดภัยเพียงพอ กรุณาใช้รหัสผ่านที่คาดเดายากขึ้น' };
  }
  if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
    return { status: 429, message: 'มีการสมัครถี่เกินไป กรุณารอสักครู่แล้วลองอีกครั้ง' };
  }
  console.error('Unexpected sign-up error:', { status: error.status, code: error.code, message });
  return { status: 400, message: 'ไม่สามารถลงทะเบียนได้ กรุณาลองอีกครั้ง' };
}

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return jsonResponse({ error: 'รูปแบบคำขอต้องเป็น application/json' }, 415);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'ข้อมูล JSON ไม่ถูกต้อง' }, 400);
  }

  if (!isRecord(payload)) {
    return jsonResponse({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, 400);
  }

  const username = typeof payload.user_name === 'string' 
    ? payload.user_name.trim() 
    : typeof payload.username === 'string' 
      ? payload.username.trim() 
      : '';
  const fullName = typeof payload.full_name === 'string' 
    ? payload.full_name.trim() 
    : typeof payload.fullName === 'string' 
      ? payload.fullName.trim() 
      : '';
  const phone = typeof payload.phone === 'string' 
    ? payload.phone.trim() 
    : '';
  const email = typeof payload.email === 'string' 
    ? payload.email.trim().toLowerCase() 
    : '';
  const password = typeof payload.password === 'string' 
    ? payload.password 
    : '';

  // Validation
  if (!username || username.length < 3 || username.length > 50) {
    return jsonResponse({ error: 'user_name ต้องมีความยาวระหว่าง 3 - 50 ตัวอักษร' }, 400);
  }

  if (!fullName || fullName.length < 2 || fullName.length > 100) {
    return jsonResponse({ error: 'ชื่อ-นามสกุล ต้องมีความยาวอย่างน้อย 2 ตัวอักษร' }, 400);
  }

  const phoneClean = phone.replace(/[-\s]/g, '');
  if (!phone || !/^[0-9]{9,10}$/.test(phoneClean)) {
    return jsonResponse({ error: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (9-10 หลัก)' }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length > 254 || !emailRegex.test(email)) {
    return jsonResponse({ error: 'กรุณาระบุอีเมลที่ถูกต้อง' }, 400);
  }

  if (!password || password.length < 6) {
    return jsonResponse({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }, 400);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'ระบบยังไม่พร้อมใช้งาน Supabase configuration missing' }, 503);
  }

  const authSupabase = await createAuthClient();

  // 1. Sign up user in Supabase Auth
  const { data: authData, error: authError } = await authSupabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: fullName,
        phone,
      },
    },
  });

  if (authError) {
    const { status, message } = describeSignUpError(authError);
    return jsonResponse({ error: message }, status);
  }

  const newUser = authData.user;
  if (!newUser) {
    return jsonResponse({ error: 'ไม่สามารถสร้างผู้ใช้งานได้' }, 500);
  }

  // With email confirmation on, Supabase answers "success" for an address that is
  // already registered but returns a user with no identities. Treat it as taken.
  if (Array.isArray(newUser.identities) && newUser.identities.length === 0) {
    return jsonResponse({ error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น' }, 409);
  }

  // 2. Ensure profile exists in coin_shop.profiles (in case DB trigger is not active)
  try {
    const shopSupabase = await createClient();
    await shopSupabase
      .from('profiles')
      .upsert({
        id: newUser.id,
        username,
        full_name: fullName,
        phone,
        role: 'customer',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
  } catch (profileErr) {
    console.error('Warning: Error upserting into coin_shop.profiles:', profileErr);
  }

  return jsonResponse({
    success: true,
    message: 'สมัครสมาชิกสำเร็จเรียบร้อย',
    user: {
      id: newUser.id,
      email: newUser.email,
      user_name: username,
      full_name: fullName,
      phone,
    },
  }, 201);
}
