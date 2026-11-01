import type { OrderStatus } from '@/types/database';

export default function DeadlineBadge({ daysLeft, status }: { daysLeft: number; status: OrderStatus }) {
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
