import Link from 'next/link';
import type { SellerOrder } from '@/types/seller';
import { STATUS_LABEL } from '@/types/seller';
import { STATUS_COLORS, formatDate } from '../_lib/order-display';

export default function UrgentOrderList({ orders }: { orders: SellerOrder[] }) {
  return (
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

      {orders.length === 0 ? (
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
          {orders.map((order) => {
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
  );
}
