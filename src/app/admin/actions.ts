'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { OrderStatus, UserRole } from '@/types/database';

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('กรุณาเข้าสู่ระบบก่อนทำรายการ');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
  }

  return { supabase, currentUserId: user.id };
}

export async function updateOrderStatusAction(orderId: number, nextStatus: OrderStatus) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำสั่งทำ' };
  }
}

export async function updateUserRoleAction(targetUserId: string, nextRole: UserRole) {
  try {
    const { supabase, currentUserId } = await verifyAdmin();

    // Prevent admin from demoting themselves directly to avoid lockout
    if (targetUserId === currentUserId && nextRole !== 'admin') {
      return { success: false, error: 'ไม่สามารถลดสิทธิ์บัญชี Admin ของคุณเองได้โดยตรง' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role: nextRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์ผู้ใช้' };
  }
}
