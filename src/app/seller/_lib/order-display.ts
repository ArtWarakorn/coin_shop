import type { OrderStatus } from '@/types/database';

export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  pending:       { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  confirmed:     { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
  in_production: { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  ready:         { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  completed:     { bg: 'rgba(52,211,153,0.18)',  text: '#6ee7b7', border: 'rgba(52,211,153,0.2)' },
  cancelled:     { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.3)' },
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
}
