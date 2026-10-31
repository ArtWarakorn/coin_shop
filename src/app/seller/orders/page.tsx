import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { SellerOrder } from '@/types/seller';
import type { OrderStatus } from '@/types/database';
import SellerOrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'in_production', 'ready', 'completed', 'cancelled',
];

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function SellerOrdersPage({ searchParams }: Props) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/seller/orders');

  const { data: ordersData, error } = await supabase.rpc('seller_orders');

  if (error) {
    return (
      <div
        className="p-6 rounded-2xl text-center"
        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
      >
        <p className="font-semibold">โหลดรายการออเดอร์ไม่สำเร็จ</p>
        <p className="text-sm mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  const orders = (ordersData as SellerOrder[]) ?? [];

  // Resolve searchParams
  const sp = await searchParams;
  const statusParam = sp?.status ?? '';
  const initialFilter: OrderStatus | 'all' = VALID_STATUSES.includes(statusParam as OrderStatus)
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
