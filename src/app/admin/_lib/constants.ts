import type { OrderStatus, UserRole } from '@/types/database';

export const ORDER_STATUS_MAP: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  pending: {
    label: 'รอตรวจสอบ',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    desc: 'ลูกค้าส่งคำสั่งทำ รอแอดมินยืนยันคิว',
  },
  confirmed: {
    label: 'ยืนยันรับงาน',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    desc: 'ยืนยันแบบและจำนวนแล้ว รอจัดช่างพับ',
  },
  in_production: {
    label: 'กำลังพับเหรียญ',
    bg: 'bg-amber-100/80 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-700',
    desc: 'ช่างฝีมือกำลังพับริบบิ้นและบรรจุเหรียญ',
  },
  ready: {
    label: 'พร้อมส่งมอบ',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    desc: 'ตรวจนับครบถ้วน บรรจุกล่องพร้อมจัดส่ง',
  },
  completed: {
    label: 'สำเร็จเรียบร้อย',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-700',
    desc: 'ส่งมอบถึงมือลูกค้าเรียบร้อยแล้ว',
  },
  cancelled: {
    label: 'ยกเลิก',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    desc: 'ยกเลิกคำสั่งทำ',
  },
};

export const USER_ROLES: { role: UserRole; title: string; badgeClass: string; desc: string }[] = [
  {
    role: 'customer',
    title: 'Customer (ลูกค้าทั่วไป)',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300',
    desc: 'สั่งทำเหรียญ ติดตามสถานะของตนเอง',
  },
  {
    role: 'seller',
    title: 'Seller (ช่างพับ / ผู้รับงาน)',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300',
    desc: 'รับงานพับ ดูรายการสั่งทำทั้งหมด อัปเดตงาน',
  },
  {
    role: 'admin',
    title: 'Admin (ผู้ดูแลระบบสูงสุด)',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300',
    desc: 'จัดการสถานะงาน เปลี่ยนสิทธิ์ผู้ใช้ และดูแลระบบ',
  },
];
