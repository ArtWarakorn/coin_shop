export default function ConfirmDialog({
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
