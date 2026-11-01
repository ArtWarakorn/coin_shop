import type { Order, Profile } from '@/types/database';

export default function StatsStrip({ orders, profiles }: { orders: Order[]; profiles: Profile[] }) {
  const inProductionCount = orders.filter((o) => o.status === 'in_production').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const sellerCount = profiles.filter((p) => p.role === 'seller').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          รอยืนยันคิวงาน
        </div>
        <div className="text-2xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">
          {pendingCount}
        </div>
        <div className="text-xs text-gray-500 mt-1">ลูกค้ารอรับงาน</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          กำลังพับเหรียญ
        </div>
        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
          {inProductionCount}
        </div>
        <div className="text-xs text-gray-500 mt-1">อยู่ในกระบวนการช่างฝีมือ</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          พร้อมส่งมอบ
        </div>
        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
          {readyCount}
        </div>
        <div className="text-xs text-gray-500 mt-1">แพ็กเรียบร้อยพร้อมจัดส่ง</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
          ช่างพับ (Sellers)
        </div>
        <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
          {sellerCount} <span className="text-sm font-normal text-gray-500">/ {profiles.length} คน</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">สิทธิ์รับงานและดูแลออเดอร์</div>
      </div>
    </div>
  );
}
