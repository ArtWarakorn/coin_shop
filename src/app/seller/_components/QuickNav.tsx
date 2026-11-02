import Link from 'next/link';

export default function QuickNav() {
  return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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

        <Link
          href="/seller/place-order"
          className="rounded-2xl p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(52,211,153,0.15)' }}
          >
            🛒
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#f0f4ff' }}>
              สั่งทำเหรียญ
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,255,0.4)' }}>
              สั่งทำและดูประวัติการสั่งของคุณ
            </p>
          </div>
        </Link>
      </div>
  );
}
