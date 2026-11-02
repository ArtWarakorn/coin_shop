import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';
import { requireRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NAV_LINKS = [
  { href: '/seller', label: 'ภาพรวม' },
  { href: '/seller/orders', label: 'ออเดอร์' },
  { href: '/seller/products', label: 'สินค้า' },
  { href: '/seller/place-order', label: 'สั่งทำ' },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole('seller', '/seller');

  const displayName = profile.full_name || profile.username || user.email?.split('@')[0] || 'ผู้ขาย';

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
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(240, 244, 255, 0.7)' }}
              >
                {label}
              </Link>
            ))}
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
            <form action={signOut}>
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
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="text-xs font-medium" style={{ color: 'rgba(240, 244, 255, 0.7)' }}>
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
