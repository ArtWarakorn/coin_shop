import { requireRole } from '@/lib/auth/session';
import { getCustomerOrders } from '@/lib/data/orders';
import { getActiveProducts } from '@/lib/data/products';
import OrderCustomizer from '@/app/dashboard/_components/OrderCustomizer';
import OrderHistory from '@/app/dashboard/_components/OrderHistory';
import ProductGrid from '@/app/dashboard/_components/ProductGrid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PATH = '/seller/place-order';

interface PlaceOrderPageProps {
  searchParams: Promise<{ product?: string }>;
}

/** Sellers buy here as a customer. /dashboard stays closed to them, so roles keep one home each. */
export default async function SellerPlaceOrderPage({ searchParams }: PlaceOrderPageProps) {
  const { user } = await requireRole('seller', PATH);
  const { product } = await searchParams;
  const requestedProductId = Number(product);

  const [products, orders] = await Promise.all([getActiveProducts(), getCustomerOrders(user.id)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f0f4ff' }}>
          สั่งทำเหรียญโปรยทาน
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,255,0.45)' }}>
          สั่งในนามบัญชีของคุณ ออเดอร์จะส่งไปยังร้านเจ้าของลายที่เลือก
        </p>
      </div>

      {/* These components are themed for the customer pages, not the seller navy. */}
      <div className="rounded-2xl p-4 sm:p-6 space-y-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {products.length > 0 && (
          <OrderCustomizer
            key={requestedProductId || 'default'}
            products={products}
            userId={user.id}
            initialProductId={Number.isInteger(requestedProductId) ? requestedProductId : undefined}
          />
        )}

        <ProductGrid products={products} orderPath={PATH} />
        <OrderHistory orders={orders} isAdmin={false} />
      </div>
    </div>
  );
}
