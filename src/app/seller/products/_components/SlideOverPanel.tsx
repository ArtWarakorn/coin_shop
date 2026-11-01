export default function SlideOverPanel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full overflow-y-auto p-6 space-y-5"
        style={{ background: '#1a2540', borderLeft: '1px solid rgba(240,244,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: '#f0f4ff' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-xl"
            style={{ color: 'rgba(240,244,255,0.5)', border: '1px solid rgba(240,244,255,0.1)' }}
          >
            ปิด
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
