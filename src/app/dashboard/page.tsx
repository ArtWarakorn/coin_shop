import { redirect } from 'next/navigation';
import { getCurrentProfile, requireUser } from '@/lib/auth/session';
import { getAllOrders, getCustomerOrders } from '@/lib/data/orders';
import { getActiveProducts } from '@/lib/data/products';
import { createProfileFromAuth } from '@/lib/data/profiles';
import DashboardHeader from './_components/DashboardHeader';
import OrderCustomizer from './_components/OrderCustomizer';
import OrderHistory from './_components/OrderHistory';
import ProductGrid from './_components/ProductGrid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DashboardPageProps {
  searchParams: Promise<{ product?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const { product } = await searchParams;
  const requestedProductId = Number(product);
  const profile = (await getCurrentProfile()) ?? (await createProfileFromAuth(user));

  if (profile?.role === 'seller') {
    redirect('/seller');
  }

  // Admins see every order. Everyone else sees only their own.
  const isAdmin = profile?.role === 'admin';
  const [products, orders] = await Promise.all([
    getActiveProducts(),
    isAdmin ? getAllOrders() : getCustomerOrders(user.id),
  ]);

  const displayUsername =
    profile?.username ||
    (user.user_metadata.username as string) ||
    (user.user_metadata.user_name as string) ||
    user.email?.split('@')[0] ||
    'สมาชิก';
  const displayPhone = profile?.phone || (user.user_metadata.phone as string) || '-';
  const displayName = profile?.full_name || displayUsername || user.email;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <DashboardHeader role={profile?.role} displayName={displayName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">ข้อมูลผู้ใช้งาน coin shop</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              @{displayUsername} | เบอร์โทร: {displayPhone}
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Auth ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user.id}</code>
          </div>
        </div>

        {products.length > 0 && (
          <OrderCustomizer
            key={requestedProductId || 'default'}
            products={products}
            userId={user.id}
            initialProductId={Number.isInteger(requestedProductId) ? requestedProductId : undefined}
          />
        )}

        <ProductGrid products={products} />
        <OrderHistory orders={orders} isAdmin={isAdmin} />
      </main>
    </div>
  );
}
