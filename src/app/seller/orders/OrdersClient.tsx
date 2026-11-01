'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ORDER_STATUSES } from '@/types/database';
import type { OrderStatus } from '@/types/database';
import type { SellerOrder } from '@/types/seller';
import { STATUS_LABEL } from '@/types/seller';
import Toast from '../_components/Toast';
import { STATUS_COLORS } from '../_lib/order-display';
import { useToast } from '../_lib/use-toast';
import ConfirmDialog from './_components/ConfirmDialog';
import OrderCard from './_components/OrderCard';

interface SellerOrdersClientProps {
  initialOrders: SellerOrder[];
  initialStatusFilter: OrderStatus | 'all';
}

export default function SellerOrdersClient({
  initialOrders,
  initialStatusFilter,
}: SellerOrdersClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<SellerOrder[]>(initialOrders);
  // Re-sync when the server sends a fresh list (refresh button, stale-status retry).
  const [syncedFrom, setSyncedFrom] = useState(initialOrders);
  if (initialOrders !== syncedFrom) {
    setSyncedFrom(initialOrders);
    setOrders(initialOrders);
  }
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(initialStatusFilter);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();
  const [confirm, setConfirm] = useState<{
    orderId: number;
    next: OrderStatus;
    current: OrderStatus;
    msg: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const executeStatusUpdate = async (id: number, next: OrderStatus, current: OrderStatus) => {
    setConfirm(null);
    setBusyId(id);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .update({ status: next })
      .eq('id', id)
      .eq('status', current) // optimistic concurrency check
      .select('id');

    setBusyId(null);

    if (error) {
      showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      return;
    }

    if (!data || data.length === 0) {
      // Row was not matched — stale status
      showToast('สถานะถูกเปลี่ยนแล้ว กรุณารีเฟรช', 'error');
      handleRefresh();
      return;
    }

    // Optimistic local update
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)));
    showToast(`อัปเดตสถานะออเดอร์ #${id} เรียบร้อย`, 'success');
  };

  // Cancelling or completing an order asks for confirmation first
  const requestStatusUpdate = (id: number, next: OrderStatus, current: OrderStatus) => {
    if (next === 'cancelled') {
      setConfirm({ orderId: id, next, current, msg: `ยืนยันการยกเลิกออเดอร์ #${id}?` });
    } else if (next === 'completed') {
      setConfirm({ orderId: id, next, current, msg: `ยืนยันว่าออเดอร์ #${id} ส่งมอบเรียบร้อยแล้ว?` });
    } else {
      executeStatusUpdate(id, next, current);
    }
  };

  // Filtered & searched orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    if (!matchesStatus) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(o.id).includes(q) ||
      (o.customer_name?.toLowerCase().includes(q) ?? false) ||
      o.product_name.toLowerCase().includes(q)
    );
  });

  // Count per status tab
  const countByStatus = ORDER_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} />}
      {confirm && (
        <ConfirmDialog
          message={confirm.msg}
          isPending={busyId === confirm.orderId}
          onConfirm={() => executeStatusUpdate(confirm.orderId, confirm.next, confirm.current)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="space-y-4">
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="ค้นหาเลขออเดอร์ หรือชื่อลูกค้า"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
            style={{
              background: 'rgba(240,244,255,0.06)',
              border: '1px solid rgba(240,244,255,0.12)',
              color: '#f0f4ff',
            }}
          />
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
            style={{
              background: 'rgba(251,146,60,0.1)',
              color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.25)',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
            style={
              statusFilter === 'all'
                ? { background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)' }
                : { background: 'rgba(240,244,255,0.05)', color: 'rgba(240,244,255,0.5)', border: '1px solid rgba(240,244,255,0.1)' }
            }
          >
            ทั้งหมด ({orders.length})
          </button>
          {ORDER_STATUSES.map((s) => {
            const col = STATUS_COLORS[s];
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                style={
                  active
                    ? { background: col.bg, color: col.text, border: `1px solid ${col.border}` }
                    : { background: 'rgba(240,244,255,0.05)', color: 'rgba(240,244,255,0.4)', border: '1px solid rgba(240,244,255,0.08)' }
                }
              >
                {STATUS_LABEL[s]} ({countByStatus[s] ?? 0})
              </button>
            );
          })}
        </div>

        {/* Order list */}
        {filteredOrders.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: 'rgba(240,244,255,0.03)', border: '1px dashed rgba(240,244,255,0.08)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(240,244,255,0.3)' }}>
              {search ? 'ไม่พบออเดอร์ที่ตรงกับคำค้นหา' : 'ยังไม่มีออเดอร์ในสถานะนี้'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={requestStatusUpdate}
                busy={busyId === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
