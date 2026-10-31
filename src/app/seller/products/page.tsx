import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { SellerProduct } from '@/types/seller';
import SellerProductsClient from './ProductsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SellerProductsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/seller/products');

  // RLS ensures only own products are returned
  const { data: productsData, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div
        className="p-6 rounded-2xl text-center"
        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
      >
        <p className="font-semibold">โหลดรายการสินค้าไม่สำเร็จ</p>
        <p className="text-sm mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  const products = (productsData as SellerProduct[]) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f0f4ff' }}>
          สินค้าของร้าน
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,255,0.4)' }}>
          จัดการลายเหรียญที่ร้านรับทำ · ซ่อนแทนการลบ
        </p>
      </div>

      <SellerProductsClient initialProducts={products} />
    </div>
  );
}
