import { requireRole } from '@/lib/auth/session';
import { getSellerProducts } from '@/lib/data/products';
import ErrorPanel from '../_components/ErrorPanel';
import SellerProductsClient from './ProductsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SellerProductsPage() {
  const { user } = await requireRole('seller', '/seller/products');

  const { products, error } = await getSellerProducts(user.id);
  if (error) {
    return <ErrorPanel title="โหลดรายการสินค้าไม่สำเร็จ" message={error.message} />;
  }

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
