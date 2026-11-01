import type { Profile, UserRole } from '@/types/database';

interface RoleChangeModalProps {
  user: Profile;
  newRole: UserRole;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RoleChangeModal({ user, newRole, onCancel, onConfirm }: RoleChangeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-xl font-bold">
            ⚠️
          </span>
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              ยืนยันการเปลี่ยนบทบาทผู้ใช้
            </h3>
            <p className="text-xs text-gray-500">โปรดตรวจสอบก่อนดำเนินการ</p>
          </div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">ผู้ใช้:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {user.full_name || user.username}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">สิทธิ์เดิม:</span>
            <span className="font-semibold">{user.role.toUpperCase()}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="text-gray-500">สิทธิ์ใหม่:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {newRole.toUpperCase()}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          {newRole === 'seller' &&
            '💡 เมื่อปรับเป็น Seller ผู้ใช้รายนี้จะเห็นรายการสั่งทำทั้งหมดและสามารถรับงานพับเหรียญได้'}
          {newRole === 'customer' &&
            '💡 เมื่อปรับเป็น Customer ผู้ใช้รายนี้จะเห็นเฉพาะคำสั่งทำของตนเองเท่านั้น'}
          {newRole === 'admin' &&
            '⚠️ ข้อควรระวัง: สิทธิ์ Admin สามารถเข้าถึงระบบจัดการผู้ใช้และปรับสถานะงานได้ทั้งหมด'}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
          >
            ยืนยันการเปลี่ยนสิทธิ์
          </button>
        </div>
      </div>
    </div>
  );
}
