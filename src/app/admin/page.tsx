import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';
import { requireRole } from '@/lib/auth/session';
import { getAdminOrders } from '@/lib/data/orders';
import { getAllProfiles } from '@/lib/data/profiles';
import AdminConsole from './AdminConsole';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const { user, profile } = await requireRole('admin', '/admin');

  const adminDisplayName =
    profile.username ||
    profile.full_name ||
    (user.user_metadata.username as string) ||
    (user.user_metadata.full_name as string) ||
    user.email;

  const [orders, profiles] = await Promise.all([getAdminOrders(), getAllProfiles()]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            🪙
          </div>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              ระบบจัดการร้านเหรียญโปรยทาน
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 uppercase">
                Admin Console
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              ควบคุมคิวงานสั่งทำ & จัดการสิทธิ์สมาชิก
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ← กลับหน้าร้าน (Dashboard)
          </Link>
          <div className="hidden sm:block text-right">
            <span className="text-xs font-semibold block">
              {adminDisplayName}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              Role: Admin
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-1.5 rounded-lg transition"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AdminConsole
          orders={orders}
          profiles={profiles}
          currentAdminId={user.id}
        />
      </main>
    </div>
  );
}
