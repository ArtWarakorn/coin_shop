'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SellerOrder } from '@/types/seller';
import type { OrderStatus } from '@/types/database';
import {
  STATUS_LABEL,
  STATUS_FLOW,
  ADVANCE_LABEL,
  CANCELLABLE_STATUSES,
} from '@/types/seller';
import { createClient } from '@/lib/supabase/client';

// ─── Design tokens ──────────────────────────────────────────────
const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  pending:       { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  confirmed:     { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
  in_production: { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  ready:         { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  completed:     { bg: 'rgba(52,211,153,0.18)',  text: '#6ee7b7', border: 'rgba(52,211,153,0.2)' },
  cancelled:     { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.3)' },
};

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'in_production', 'ready', 'completed', 'cancelled',
];

// ─── Helpers ─────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
}

function DeadlineBadge({ daysLeft, status }: { daysLeft: number; status: OrderStatus }) {
  if (status === 'completed' || status === 'cancelled') return null;

  let label = '';
  let color = '';

  if (daysLeft < 0) {
    label = `เลยกำหนด ${Math.abs(daysLeft)} วัน`;
    color = '#f87171';
  } else if (daysLeft === 0) {
    label = 'วันนี้';
    color = '#fb923c';
  } else if (daysLeft === 1) {
    label = 'พรุ่งนี้';
    color = '#fb923c';
  } else if (daysLeft <= 5) {
    label = `อีก ${daysLeft} วัน`;
    color = daysLeft <= 2 ? '#fbbf24' : '#34d399';
  } else {
    label = `อีก ${daysLeft} วัน`;
    color = '#34d399';
  }

  return (
    <span
      className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className="fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl max-w-xs"
      style={{
        background: type === 'success' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
        border: `1px solid ${type === 'success' ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
        color: type === 'success' ? '#34d399' : '#f87171',
        backdropFilter: 'blur(8px)',
      }}
    >
      {message}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  isPending,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: '#1a2540', border: '1px solid rgba(240,244,255,0.1)' }}
      >
        <p className="text-sm leading-relaxed" style={{ color: '#f0f4ff' }}>
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'rgba(240,244,255,0.06)',
              color: 'rgba(240,244,255,0.6)',
              border: '1px solid rgba(240,244,255,0.1)',
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
              color: '#fff',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────
interface OrderCardProps {
  order: SellerOrder;
  onStatusUpdate: (id: number, next: OrderStatus, current: OrderStatus) => void;
  busy: boolean;
}

function OrderCard({ order, onStatusUpdate, busy }: OrderCardProps) {
  const nextStatus = STATUS_FLOW[order.status];
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const statusCol = STATUS_COLORS[order.status];
  const advanceLabel = ADVANCE_LABEL[order.status];

  const phoneHref = order.customer_phone
    ? `tel:${order.customer_phone.replace(/\s+/g, '')}`
    : undefined;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(240,244,255,0.035)', border: '1px solid rgba(240,244,255,0.08)' }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(240,244,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold" style={{ color: '#f0f4ff' }}>
            #{order.id}
          </span>
          <DeadlineBadge daysLeft={order.days_left} status={order.status} />
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ background: statusCol.bg, color: statusCol.text, border: `1px solid ${statusCol.border}` }}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left: product + order info */}
        <div className="flex gap-3">
          <div
            className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(240,244,255,0.06)' }}
          >
            {order.product_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.product_image}
                alt={order.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-2xl">🪙</span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-sm" style={{ color: '#f0f4ff' }}>
              {order.product_name}
            </p>
            <p className="text-xs" style={{ color: 'rgba(240,244,255,0.5)' }}>
              สี {order.color} · {order.quantity} ดอก
            </p>
            <p className="text-sm font-bold" style={{ color: '#fb923c' }}>
              ฿{order.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            {order.customer_note && (
              <p
                className="text-xs mt-1 leading-relaxed max-w-[18rem]"
                style={{ color: 'rgba(240,244,255,0.45)' }}
              >
                หมายเหตุ: {order.customer_note}
              </p>
            )}
          </div>
        </div>

        {/* Right: customer + dates */}
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'rgba(240,244,255,0.35)' }}>
              ลูกค้า
            </p>
            <p className="text-sm" style={{ color: '#f0f4ff' }}>
              {order.customer_name || '—'}
            </p>
            {order.customer_phone && (
              <a
                href={phoneHref}
                className="text-xs font-medium hover:underline"
                style={{ color: '#38bdf8' }}
              >
                {order.customer_phone}
              </a>
            )}
          </div>
          <div className="flex gap-4">
            <div>
              <p className="text-xs" style={{ color: 'rgba(240,244,255,0.35)' }}>สั่งเมื่อ</p>
              <p className="text-xs font-medium" style={{ color: 'rgba(240,244,255,0.7)' }}>
                {formatDate(order.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(240,244,255,0.35)' }}>กำหนดส่ง</p>
              <p className="text-xs font-medium" style={{ color: order.days_left <= 1 && order.status !== 'completed' && order.status !== 'cancelled' ? '#f87171' : 'rgba(240,244,255,0.7)' }}>
                {formatDate(order.due_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card actions */}
      {(nextStatus || canCancel) && (
        <div
          className="px-5 py-3 flex gap-2 justify-end"
          style={{ borderTop: '1px solid rgba(240,244,255,0.06)' }}
        >
          {canCancel && (
            <button
              disabled={busy}
              onClick={() => onStatusUpdate(order.id, 'cancelled', order.status)}
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{
                background: 'rgba(248,113,113,0.1)',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.25)',
                opacity: busy ? 0.5 : 1,
              }}
            >
              ยกเลิก
            </button>
          )}
          {nextStatus && advanceLabel && (
            <button
              disabled={busy}
              onClick={() => onStatusUpdate(order.id, nextStatus, order.status)}
              className="text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              style={{
                background: busy ? 'rgba(251,146,60,0.3)' : 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
                color: '#fff',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'กำลังบันทึก...' : advanceLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
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
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(initialStatusFilter);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirm, setConfirm] = useState<{
    orderId: number;
    next: OrderStatus;
    current: OrderStatus;
    msg: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  // Request status update (show confirm for cancel or final step)
  const requestStatusUpdate = useCallback(
    (id: number, next: OrderStatus, current: OrderStatus) => {
      const needsConfirm = next === 'cancelled' || next === 'completed';
      if (needsConfirm) {
        const msg =
          next === 'cancelled'
            ? `ยืนยันการยกเลิกออเดอร์ #${id}?`
            : `ยืนยันว่าออเดอร์ #${id} ส่งมอบเรียบร้อยแล้ว?`;
        setConfirm({ orderId: id, next, current, msg });
      } else {
        executeStatusUpdate(id, next, current);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const executeStatusUpdate = useCallback(
    async (id: number, next: OrderStatus, current: OrderStatus) => {
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
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: next } : o))
      );
      showToast(`อัปเดตสถานะออเดอร์ #${id} เรียบร้อย`, 'success');
    },
    [showToast, handleRefresh]
  );

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
  const countByStatus = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
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
          {ALL_STATUSES.map((s) => {
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
