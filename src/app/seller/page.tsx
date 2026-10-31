import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { SellerOrder } from '@/types/seller';
import { STATUS_LABEL } from '@/types/seller';
import type { OrderStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  pending:      { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  confirmed:    { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
  in_production:{ bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  ready:        { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  completed:    { bg: 'rgba(52,211,153,0.18)',  text: '#6ee7b7', border: 'rgba(52,211,153,0.2)' },
  cancelled:    { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.3)' },
};

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'in_production', 'ready', 'completed', 'cancelled'];

export default async function SellerDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/seller');

  // Fetch seller orders via RPC
  const { data: ordersData, error } = await supabase.rpc('seller_orders');

  if (error) {
    return (
      <div
        className="p-6 rounded-2xl text-center"
        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
      >
        <p className="font-semibold">โหลดข้อมูลออเดอร์ไม่สำเร็จ</p>
        <p className="text-sm mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  const orders = (ordersData as SellerOrder[]) ?? [];

  // Count by status
  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  // Urgent orders: days_left <= 2 AND not completed/cancelled
  const urgentOrders = orders.filter(
    (o) => o.days_left <= 2 && o.status !== 'completed' && o.status !== 'cancelled'
  );

  // Active orders (pending, confirmed, in_production, ready)
  const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'in_production', 'ready'];
  const activeCount = activeStatuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f0f4ff' }}>
          ภาพรวมร้านค้า
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,255,0.45)' }}>
          วันนี้มีออเดอร์ที่ต้องดำเนินการ {activeCount} รายการ
        </p>
      </div>

      {/* Status count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_ORDER.map((status) => {
          const col = STATUS_COLORS[status];
          return (
            <Link
              key={status}
              href={`/seller/orders?status=${status}`}
              className="rounded-2xl p-4 flex flex-col gap-1 transition-transform hover:-translate-y-0.5"
              style={{ background: col.bg, border: `1px solid ${col.border}` }}
            >
              <span className="text-3xl font-bold leading-none" style={{ color: col.text }}>
                {counts[status] ?? 0}
              </span>
              <span className="text-xs font-medium" style={{ color: col.text, opacity: 0.85 }}>
                {STATUS_LABEL[status]}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Urgent orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: '#f0f4ff' }}>
            ใกล้ครบกำหนด
          </h2>
          <Link
            href="/seller/orders"
            className="text-xs font-medium"
            style={{ color: '#fb923c' }}
          >
            ดูทั้งหมด
          </Link>
        </div>

        {urgentOrders.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'rgba(240,244,255,0.04)', border: '1px dashed rgba(240,244,255,0.1)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(240,244,255,0.35)' }}>
              ไม่มีออเดอร์ที่ใกล้ครบกำหนดในขณะนี้
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {urgentOrders.map((order) => {
              const isOverdue = order.days_left < 0;
              const isToday = order.days_left === 0;
              const isTomorrow = order.days_left === 1;
              const urgencyColor = isOverdue || isToday || isTomorrow
                ? '#f87171'
                : order.days_left <= 2
                ? '#fb923c'
                : '#fbbf24';

              const deadlineLabel = isOverdue
                ? `เลยกำหนด ${Math.abs(order.days_left)} วัน`
                : isToday
                ? 'วันนี้'
                : isTomorrow
                ? 'พรุ่งนี้'
                : `อีก ${order.days_left} วัน`;

              const statusCol = STATUS_COLORS[order.status];

              return (
                <Link
                  key={order.id}
                  href="/seller/orders"
                  className="flex items-center gap-4 rounded-2xl px-5 py-3.5 transition-colors"
                  style={{
                    background: 'rgba(240,244,255,0.04)',
                    border: '1px solid rgba(240,244,255,0.08)',
                  }}
                >
                  {/* Product image */}
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
                    style={{ background: 'rgba(240,244,255,0.08)' }}
                  >
                    {order.product_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={order.product_image}
                        alt={order.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-lg">🪙</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: '#f0f4ff' }}>
                        #{order.id}
                      </span>
                      <span className="text-xs" style={{ color: 'rgba(240,244,255,0.5)' }}>
                        {order.product_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: statusCol.bg, color: statusCol.text, border: `1px solid ${statusCol.border}` }}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                      <span className="text-xs" style={{ color: 'rgba(240,244,255,0.4)' }}>
                        กำหนด {formatDate(order.due_date)}
                      </span>
                    </div>
                  </div>

                  {/* Deadline badge */}
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: `${urgencyColor}20`, color: urgencyColor, border: `1px solid ${urgencyColor}40` }}
                  >
                    {deadlineLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Link
          href="/seller/orders"
          className="rounded-2xl p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(251,146,60,0.15)' }}
          >
            📋
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#f0f4ff' }}>
              จัดการออเดอร์
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.4)' }}>
              อัปเดตสถานะงานทั้งหมด
            </p>
          </div>
        </Link>

        <Link
          href="/seller/products"
          className="rounded-2xl p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(168,85,247,0.15)' }}
          >
            🎖️
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#f0f4ff' }}>
              จัดการสินค้า
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.4)' }}>
              เพิ่ม แก้ไข หรือซ่อนลายเหรียญ
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
