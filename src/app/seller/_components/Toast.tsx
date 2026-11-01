import type { ToastType } from '../_lib/use-toast';

export default function Toast({ message, type }: { message: string; type: ToastType }) {
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
