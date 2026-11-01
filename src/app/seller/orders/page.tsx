import { requireRole } from '@/lib/auth/session';
import { getSellerOrders } from '@/lib/data/orders';
import { ORDER_STATUSES } from '@/types/database';
import type { OrderStatus } from '@/types/database';
import ErrorPanel from '../_components/ErrorPanel';
import SellerOrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function SellerOrdersPage({ searchParams }: Props) {
  await requireRole('seller', '/seller/orders');

  const { orders, error } = await getSellerOrders();
  if (error) {
    return <ErrorPanel title="โหลดรายการออเดอร์ไม่สำเร็จ" message={error.message} />;
  }

  // Resolve searchParams
  const sp = await searchParams;
  const statusParam = sp?.status ?? '';
  const initialFilter: OrderStatus | 'all' = ORDER_STATUSES.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : 'all';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f0f4ff' }}>
          ออเดอร์ทั้งหมด
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,255,0.4)' }}>
          เรียงตามกำหนดส่ง — ใกล้ที่สุดก่อน · งานเสร็จ/ยกเลิกอยู่ท้ายสุด
        </p>
      </div>

      <SellerOrdersClient
        initialOrders={orders}
        initialStatusFilter={initialFilter}
      />
    </div>
  );
}
