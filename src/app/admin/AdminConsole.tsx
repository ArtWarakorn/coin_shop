'use client';

import { useState, useTransition } from 'react';
import type { Order, Profile, OrderStatus, UserRole } from '@/types/database';
import OrdersTab from './_components/OrdersTab';
import RoleChangeModal from './_components/RoleChangeModal';
import StatsStrip from './_components/StatsStrip';
import UsersTab from './_components/UsersTab';
import { ORDER_STATUS_MAP } from './_lib/constants';
import { updateOrderStatusAction, updateUserRoleAction } from './actions';

interface AdminConsoleProps {
  orders: Order[];
  profiles: Profile[];
  currentAdminId: string;
}

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

      <StatsStrip orders={orders} profiles={profiles} />

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

      {activeTab === 'orders' && (
        <OrdersTab
          orders={filteredOrders}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          search={orderSearch}
          onSearchChange={setOrderSearch}
          isPending={isPending}
          onOrderStatusChange={handleStatusChange}
        />
      )}

      {activeTab === 'users' && (
        <UsersTab
          profiles={filteredProfiles}
          search={userSearch}
          onSearchChange={setUserSearch}
          currentAdminId={currentAdminId}
          isPending={isPending}
          onRequestRoleChange={(user, newRole) => {
            setRoleModalUser(user);
            setTargetNewRole(newRole);
          }}
        />
      )}

      {roleModalUser && targetNewRole && (
        <RoleChangeModal
          user={roleModalUser}
          newRole={targetNewRole}
          onCancel={() => {
            setRoleModalUser(null);
            setTargetNewRole(null);
          }}
          onConfirm={confirmRoleChange}
        />
      )}
    </div>
  );
}
