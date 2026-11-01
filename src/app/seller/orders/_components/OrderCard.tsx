import type { OrderStatus } from '@/types/database';
import type { SellerOrder } from '@/types/seller';
import { ADVANCE_LABEL, CANCELLABLE_STATUSES, STATUS_FLOW, STATUS_LABEL } from '@/types/seller';
import { STATUS_COLORS, formatDate } from '../../_lib/order-display';
import DeadlineBadge from './DeadlineBadge';

interface OrderCardProps {
  order: SellerOrder;
  onStatusUpdate: (id: number, next: OrderStatus, current: OrderStatus) => void;
  busy: boolean;
}

export default function OrderCard({ order, onStatusUpdate, busy }: OrderCardProps) {
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
