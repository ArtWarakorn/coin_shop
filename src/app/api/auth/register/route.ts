import { NextResponse } from 'next/server';
import { createAuthClient, createClient } from '@/lib/supabase/server';

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const contentType = request.headers
    .get('content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
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
    return jsonResponse({ error: authError.message || 'ไม่สามารถลงทะเบียนได้' }, 400);
  }

  const newUser = authData.user;
  if (!newUser) {
    return jsonResponse({ error: 'ไม่สามารถสร้างผู้ใช้งานได้' }, 500);
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
