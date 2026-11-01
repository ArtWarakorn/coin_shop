import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';
import type { UserRole } from '@/types/database';

interface DashboardHeaderProps {
  role?: UserRole;
  displayName?: string;
}

export default function DashboardHeader({ role, displayName }: DashboardHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-amber-600 dark:text-amber-500">
            🪙 เหรียญโปรยทาน
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold uppercase">
            {role || 'customer'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {role === 'admin' && (
            <Link
              href="/admin"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition flex items-center gap-1.5"
            >
              ⚙️ ระบบแอดมิน (Admin Console)
            </Link>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-300">
            สวัสดี, <strong className="font-semibold">{displayName}</strong>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
