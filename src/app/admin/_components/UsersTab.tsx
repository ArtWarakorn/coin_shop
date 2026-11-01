import type { Profile, UserRole } from '@/types/database';
import { USER_ROLES } from '../_lib/constants';

interface UsersTabProps {
  profiles: Profile[];
  search: string;
  onSearchChange: (value: string) => void;
  currentAdminId: string;
  isPending: boolean;
  onRequestRoleChange: (user: Profile, newRole: UserRole) => void;
}

export default function UsersTab({
  profiles,
  search,
  onSearchChange,
  currentAdminId,
  isPending,
  onRequestRoleChange,
}: UsersTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            ระบบจัดการสิทธิ์และเลื่อนระดับสมาชิก
          </h3>
          <p className="text-xs text-gray-500">
            คุณสามารถปรับสถานะผู้ใช้จาก Customer เป็น Seller (ช่างพับเหรียญ) หรือ Admin ได้
          </p>
        </div>
        <div>
          <input
            type="text"
            placeholder="ค้นหาชื่อ, username, เบอร์โทร..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">ชื่อผู้ใช้ / Username</th>
                <th className="px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 font-semibold">เบอร์โทรศัพท์</th>
                <th className="px-4 py-3 font-semibold">บทบาทปัจจุบัน</th>
                <th className="px-4 py-3 font-semibold text-right">การปรับสิทธิ์ (Role Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {profiles.length > 0 ? (
                profiles.map((user) => {
                  const isMe = user.id === currentAdminId;
                  const roleConfig = USER_ROLES.find((r) => r.role === user.role) || USER_ROLES[0];
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          {user.username || 'ไม่มี username'}
                          {isMe && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                              คุณ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          ID: {user.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                        {user.full_name || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                        {user.phone || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.8 text-[11px] font-bold rounded-md border ${roleConfig.badgeClass}`}
                        >
                          {user.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isMe ? (
                          <span className="text-gray-400 text-xs italic">
                            บัญชีปัจจุบัน (Admin สูงสุด)
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {user.role === 'customer' && (
                              <button
                                disabled={isPending}
                                onClick={() => onRequestRoleChange(user, 'seller')}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
                              >
                                ⬆️ เลื่อนเป็น Seller
                              </button>
                            )}

                            {user.role === 'seller' && (
                              <button
                                disabled={isPending}
                                onClick={() => onRequestRoleChange(user, 'customer')}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition"
                              >
                                ⬇️ ปรับเป็น Customer
                              </button>
                            )}

                            {user.role !== 'admin' && (
                              <button
                                disabled={isPending}
                                onClick={() => onRequestRoleChange(user, 'admin')}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition"
                              >
                                ตั้งเป็น Admin
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    ไม่พบข้อมูลผู้ใช้งานที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
