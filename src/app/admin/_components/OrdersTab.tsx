import { ORDER_STATUSES } from '@/types/database';
import type { Order, OrderStatus } from '@/types/database';
import { ORDER_STATUS_MAP } from '../_lib/constants';

interface OrdersTabProps {
  orders: Order[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isPending: boolean;
  onOrderStatusChange: (orderId: number, nextStatus: OrderStatus) => void;
}

export default function OrdersTab({
  orders,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  isPending,
  onOrderStatusChange,
}: OrdersTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">กรองสถานะ:</span>
          <div className="flex flex-wrap gap-1">
            {['all', ...ORDER_STATUSES].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => onStatusFilterChange(st)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium border transition ${
                    statusFilter === st
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-400'
                  }`}
                >
                  {st === 'all' ? 'ทั้งหมด' : ORDER_STATUS_MAP[st as OrderStatus]?.label || st}
                </button>
              )
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหาเลขออเดอร์, ลายเหรียญ, สี, ลูกค้า..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full md:w-72 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">เลขออเดอร์</th>
                <th className="px-4 py-3 font-semibold">ลูกค้า</th>
                <th className="px-4 py-3 font-semibold">แบบและสีเหรียญ</th>
                <th className="px-4 py-3 font-semibold text-right">จำนวน</th>
                <th className="px-4 py-3 font-semibold text-right">ยอดรวม</th>
                <th className="px-4 py-3 font-semibold text-center">สถานะการผลิต</th>
                <th className="px-4 py-3 font-semibold text-right">เปลี่ยนสถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {orders.length > 0 ? (
                orders.map((order) => {
                  const statusInfo = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-gray-100">
                        #{order.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.customer?.full_name || order.customer?.username || 'ลูกค้าทั่วไป'}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {order.customer?.phone || 'ไม่ระบุเบอร์'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {order.product?.name || `รหัสลาย #${order.product_id}`}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600/30"></span>
                          <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                            ริบบิ้นสี: {order.color}
                          </span>
                        </div>
                        {order.customer_note && (
                          <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/50">
                            โน้ต: {order.customer_note}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                        {order.quantity} ดอก
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        ฿
                        {(
                          order.total_price ||
                          order.quantity * (order.product?.price || 3.5)
                        ).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={order.status}
                          disabled={isPending}
                          onChange={(e) =>
                            onOrderStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {ORDER_STATUS_MAP[st].label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    ไม่พบคิวคำสั่งทำที่ตรงกับเงื่อนไข
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
