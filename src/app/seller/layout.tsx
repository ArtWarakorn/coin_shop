import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handleSignOut() {
  'use server';
  const client = await createClient();
  await client.auth.signOut();
  redirect('/login');
}

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Server-side auth check (defense in depth — middleware also guards)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/seller');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const sellerProfile = profile as Profile | null;

  if (sellerProfile?.role !== 'seller') {
    redirect(sellerProfile?.role === 'admin' ? '/admin' : '/dashboard');
  }

  const displayName =
    sellerProfile?.full_name || sellerProfile?.username || user.email?.split('@')[0] || 'ผู้ขาย';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f1729', color: '#f0f4ff' }}>
      {/* Top Navbar */}
      <header
        style={{
          background: 'rgba(15, 23, 41, 0.95)',
          borderBottom: '1px solid rgba(251, 146, 60, 0.2)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between py-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)' }}
            >
              🪙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: '#f0f4ff' }}>
                  เหรียญโปรยทาน
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    background: 'rgba(251, 146, 60, 0.15)',
                    color: '#fb923c',
                    borderColor: 'rgba(251, 146, 60, 0.3)',
                  }}
                >
                  ร้านค้า
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(240, 244, 255, 0.4)' }}>
                ระบบจัดการออเดอร์ผู้ขาย
              </p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/seller"
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(240, 244, 255, 0.7)' }}
            >
              ภาพรวม
            </Link>
            <Link
              href="/seller/orders"
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(240, 244, 255, 0.7)' }}
            >
              ออเดอร์
            </Link>
            <Link
              href="/seller/products"
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(240, 244, 255, 0.7)' }}
            >
              สินค้า
            </Link>
          </nav>

          {/* User & Sign out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-semibold block" style={{ color: '#f0f4ff' }}>
                {displayName}
              </span>
              <span className="text-[10px]" style={{ color: '#fb923c' }}>
                ผู้ขาย
              </span>
            </div>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: 'rgba(240, 244, 255, 0.6)',
                  border: '1px solid rgba(240, 244, 255, 0.1)',
                }}
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex border-t px-4 py-2 gap-4" style={{ borderColor: 'rgba(251, 146, 60, 0.1)' }}>
          <Link href="/seller" className="text-xs font-medium" style={{ color: 'rgba(240, 244, 255, 0.7)' }}>
            ภาพรวม
          </Link>
          <Link href="/seller/orders" className="text-xs font-medium" style={{ color: 'rgba(240, 244, 255, 0.7)' }}>
            ออเดอร์
          </Link>
          <Link href="/seller/products" className="text-xs font-medium" style={{ color: 'rgba(240, 244, 255, 0.7)' }}>
            สินค้า
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
