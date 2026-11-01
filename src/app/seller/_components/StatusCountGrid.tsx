import Link from 'next/link';
import { ORDER_STATUSES } from '@/types/database';
import { STATUS_LABEL } from '@/types/seller';
import { STATUS_COLORS } from '../_lib/order-display';

export default function StatusCountGrid({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {ORDER_STATUSES.map((status) => {
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
  );
}
