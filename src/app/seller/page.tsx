import { requireRole } from '@/lib/auth/session';
import { getSellerOrders } from '@/lib/data/orders';
import { ORDER_STATUSES } from '@/types/database';
import type { OrderStatus } from '@/types/database';
import ErrorPanel from './_components/ErrorPanel';
import QuickNav from './_components/QuickNav';
import StatusCountGrid from './_components/StatusCountGrid';
import UrgentOrderList from './_components/UrgentOrderList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'in_production', 'ready'];

export default async function SellerDashboardPage() {
  await requireRole('seller', '/seller');

  const { orders, error } = await getSellerOrders();
  if (error) {
    return <ErrorPanel title="โหลดข้อมูลออเดอร์ไม่สำเร็จ" message={error.message} />;
  }

  const counts = ORDER_STATUSES.reduce<Record<string, number>>((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status).length;
    return acc;
  }, {});

  // Due within 2 days and still in progress
  const urgentOrders = orders.filter(
    (o) => o.days_left <= 2 && o.status !== 'completed' && o.status !== 'cancelled'
  );

  const activeCount = ACTIVE_STATUSES.reduce((sum, status) => sum + counts[status], 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f0f4ff' }}>
          ภาพรวมร้านค้า
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,255,0.45)' }}>
          วันนี้มีออเดอร์ที่ต้องดำเนินการ {activeCount} รายการ
        </p>
      </div>

      {/* Sellers who open /dashboard land here, so this is where they learn their status. */}
      <p
        role="status"
        className="rounded-xl px-4 py-3 text-sm font-medium"
        style={{
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.2)',
          color: '#6ee7b7',
        }}
      >
        ✓ คุณสมัครร้านค้าเรียบร้อยแล้ว
      </p>

      <StatusCountGrid counts={counts} />
      <UrgentOrderList orders={urgentOrders} />
      <QuickNav />
    </div>
  );
}
