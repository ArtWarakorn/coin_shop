'use client';

import { useState, useTransition } from 'react';
import type { Order, Profile, OrderStatus, UserRole } from '@/types/database';
import { updateOrderStatusAction, updateUserRoleAction } from './actions';

interface AdminConsoleProps {
  orders: Order[];
  profiles: Profile[];
  currentAdminId: string;
}

const ORDER_STATUS_MAP: Record<
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

const USER_ROLES: { role: UserRole; title: string; badgeClass: string; desc: string }[] = [
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

export default function AdminConsole({ orders, profiles, currentAdminId }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'users'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  
  // Status update & Modal state
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Role Confirmation Dialog
  const [roleModalUser, setRoleModalUser] = useState<Profile | null>(null);
  const [targetNewRole, setTargetNewRole] = useState<UserRole | null>(null);

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchQuery =
      orderSearch.trim() === '' ||
      o.id.toString().includes(orderSearch) ||
      o.product?.name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.color.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer?.full_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer?.phone?.includes(orderSearch);
    return matchStatus && matchQuery;
  });

  // Filter Users
  const filteredProfiles = profiles.filter((p) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.username?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.role?.toLowerCase().includes(q)
    );
  });

  // Calculate summary metrics
  const inProductionCount = orders.filter((o) => o.status === 'in_production').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const sellerCount = profiles.filter((p) => p.role === 'seller').length;

  const handleStatusChange = (orderId: number, nextStatus: OrderStatus) => {
    startTransition(async () => {
      setActionMessage(null);
      const res = await updateOrderStatusAction(orderId, nextStatus);
      if (res.success) {
        setActionMessage({ text: `อัปเดตสถานะออเดอร์ #${orderId} เป็น "${ORDER_STATUS_MAP[nextStatus].label}" เรียบร้อยแล้ว`, type: 'success' });
      } else {
        setActionMessage({ text: res.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', type: 'error' });
      }
    });
  };

  const confirmRoleChange = () => {
    if (!roleModalUser || !targetNewRole) return;
    const userToUpdate = roleModalUser;
    const newRole = targetNewRole;
    setRoleModalUser(null);
    setTargetNewRole(null);

    startTransition(async () => {
      setActionMessage(null);
      const res = await updateUserRoleAction(userToUpdate.id, newRole);
      if (res.success) {
        setActionMessage({
          text: `เปลี่ยนบทบาทของ ${userToUpdate.full_name || userToUpdate.username} เป็น "${newRole.toUpperCase()}" เรียบร้อยแล้ว`,
          type: 'success',
        });
      } else {
        setActionMessage({ text: res.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์', type: 'error' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{actionMessage.type === 'success' ? '✓' : '⚠️'}</span>
            <span className="text-sm font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            ปิด
          </button>
        </div>
      )}

      {/* KPI Overview Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            รอยืนยันคิวงาน
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">
            {pendingCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">ลูกค้ารอรับงาน</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            กำลังพับเหรียญ
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {inProductionCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">อยู่ในกระบวนการช่างฝีมือ</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            พร้อมส่งมอบ
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {readyCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">แพ็กเรียบร้อยพร้อมจัดส่ง</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            ช่างพับ (Sellers)
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
            {sellerCount} <span className="text-sm font-normal text-gray-500">/ {profiles.length} คน</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">สิทธิ์รับงานและดูแลออเดอร์</div>
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 gap-3">
        <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-md">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📋 จัดการคำสั่งทำเหรียญ ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            👥 สิทธิ์สมาชิก & ผู้ขาย ({profiles.length})
          </button>
        </div>

        {isPending && (
          <div className="inline-flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            กำลังบันทึกข้อมูลไปยังฐานข้อมูล...
          </div>
        )}
      </div>

      {/* TAB 1: ORDERS CRAFT & STATUS TRACKER */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">กรองสถานะ:</span>
              <div className="flex flex-wrap gap-1">
                {['all', 'pending', 'confirmed', 'in_production', 'ready', 'completed', 'cancelled'].map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium border transition ${
                        statusFilter === st
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-400'
                      }`}
                    >
                      {st === 'all' ? 'ทั้งหมด' : ORDER_STATUS_MAP[st as OrderStatus]?.label || st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาเลขออเดอร์, ลายเหรียญ, สี, ลูกค้า..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full md:w-72 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">เลขออเดอร์</th>
                    <th className="px-4 py-3 font-semibold">ลูกค้า</th>
                    <th className="px-4 py-3 font-semibold">แบบและสีเหรียญ</th>
                    <th className="px-4 py-3 font-semibold text-right">จำนวน</th>
                    <th className="px-4 py-3 font-semibold text-right">ยอดรวม</th>
                    <th className="px-4 py-3 font-semibold text-center">สถานะการผลิต</th>
                    <th className="px-4 py-3 font-semibold text-right">เปลี่ยนสถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const statusInfo = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending;
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-gray-100">
                            #{order.id}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {order.customer?.full_name || order.customer?.username || 'ลูกค้าทั่วไป'}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {order.customer?.phone || 'ไม่ระบุเบอร์'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {order.product?.name || `รหัสลาย #${order.product_id}`}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600/30"></span>
                              <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                                ริบบิ้นสี: {order.color}
                              </span>
                            </div>
                            {order.customer_note && (
                              <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/50">
                                โน้ต: {order.customer_note}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                            {order.quantity} ดอก
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            ฿
                            {(
                              order.total_price ||
                              order.quantity * (order.product?.price || 3.5)
                            ).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <select
                              value={order.status}
                              disabled={isPending}
                              onChange={(e) =>
                                handleStatusChange(order.id, e.target.value as OrderStatus)
                              }
                              className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                            >
                              <option value="pending">รอตรวจสอบ</option>
                              <option value="confirmed">ยืนยันรับงาน</option>
                              <option value="in_production">กำลังพับเหรียญ</option>
                              <option value="ready">พร้อมส่งมอบ</option>
                              <option value="completed">สำเร็จเรียบร้อย</option>
                              <option value="cancelled">ยกเลิก</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        ไม่พบคิวคำสั่งทำที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ROLE & PERMISSION GOVERNANCE */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                ระบบจัดการสิทธิ์และเลื่อนระดับสมาชิก
              </h3>
              <p className="text-xs text-gray-500">
                คุณสามารถปรับสถานะผู้ใช้จาก Customer เป็น Seller (ช่างพับเหรียญ) หรือ Admin ได้
              </p>
            </div>
            <div>
              <input
                type="text"
                placeholder="ค้นหาชื่อ, username, เบอร์โทร..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ชื่อผู้ใช้ / Username</th>
                    <th className="px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 font-semibold">เบอร์โทรศัพท์</th>
                    <th className="px-4 py-3 font-semibold">บทบาทปัจจุบัน</th>
                    <th className="px-4 py-3 font-semibold text-right">การปรับสิทธิ์ (Role Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredProfiles.length > 0 ? (
                    filteredProfiles.map((user) => {
                      const isMe = user.id === currentAdminId;
                      const roleConfig = USER_ROLES.find((r) => r.role === user.role) || USER_ROLES[0];
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              {user.username || 'ไม่มี username'}
                              {isMe && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                  คุณ
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                            {user.full_name || '-'}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                            {user.phone || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-0.8 text-[11px] font-bold rounded-md border ${roleConfig.badgeClass}`}
                            >
                              {user.role?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isMe ? (
                              <span className="text-gray-400 text-xs italic">
                                บัญชีปัจจุบัน (Admin สูงสุด)
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                {user.role === 'customer' && (
                                  <button
                                    disabled={isPending}
                                    onClick={() => {
                                      setRoleModalUser(user);
                                      setTargetNewRole('seller');
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
                                  >
                                    ⬆️ เลื่อนเป็น Seller
                                  </button>
                                )}

                                {user.role === 'seller' && (
                                  <button
                                    disabled={isPending}
                                    onClick={() => {
                                      setRoleModalUser(user);
                                      setTargetNewRole('customer');
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition"
                                  >
                                    ⬇️ ปรับเป็น Customer
                                  </button>
                                )}

                                {user.role !== 'admin' && (
                                  <button
                                    disabled={isPending}
                                    onClick={() => {
                                      setRoleModalUser(user);
                                      setTargetNewRole('admin');
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition"
                                  >
                                    ตั้งเป็น Admin
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        ไม่พบข้อมูลผู้ใช้งานที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Role Changes */}
      {roleModalUser && targetNewRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-xl font-bold">
                ⚠️
              </span>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  ยืนยันการเปลี่ยนบทบาทผู้ใช้
                </h3>
                <p className="text-xs text-gray-500">โปรดตรวจสอบก่อนดำเนินการ</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">ผู้ใช้:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {roleModalUser.full_name || roleModalUser.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">สิทธิ์เดิม:</span>
                <span className="font-semibold">{roleModalUser.role.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-500">สิทธิ์ใหม่:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {targetNewRole.toUpperCase()}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              {targetNewRole === 'seller' &&
                '💡 เมื่อปรับเป็น Seller ผู้ใช้รายนี้จะเห็นรายการสั่งทำทั้งหมดและสามารถรับงานพับเหรียญได้'}
              {targetNewRole === 'customer' &&
                '💡 เมื่อปรับเป็น Customer ผู้ใช้รายนี้จะเห็นเฉพาะคำสั่งทำของตนเองเท่านั้น'}
              {targetNewRole === 'admin' &&
                '⚠️ ข้อควรระวัง: สิทธิ์ Admin สามารถเข้าถึงระบบจัดการผู้ใช้และปรับสถานะงานได้ทั้งหมด'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRoleModalUser(null);
                  setTargetNewRole(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
              >
                ยืนยันการเปลี่ยนสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
