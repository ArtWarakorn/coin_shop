import type { Order } from '@/types/database';

export default function OrderHistory({ orders, isAdmin }: { orders: Order[]; isAdmin: boolean }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-bold">
          {isAdmin ? 'รายการสั่งทำทั้งหมด (Admin System View)' : 'ประวัติการสั่งทำของฉัน'}
        </h2>
        <p className="text-sm text-gray-500">
          {isAdmin
            ? 'แสดงคำสั่งทำทั้งหมดในระบบร้านเหรียญโปรยทาน'
            : 'แสดงเฉพาะคำสั่งทำของคุณเท่านั้น'}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">เลขออเดอร์</th>
                <th className="px-4 py-3 font-semibold">สินค้า</th>
                <th className="px-4 py-3 font-semibold">สีริบบิ้น</th>
                <th className="px-4 py-3 font-semibold">จำนวน</th>
                <th className="px-4 py-3 font-semibold">ยอดรวม</th>
                <th className="px-4 py-3 font-semibold">สถานะ</th>
                <th className="px-4 py-3 font-semibold">วันที่สั่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {orders.length ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="px-4 py-3 font-medium">#{order.id}</td>
                    <td className="px-4 py-3">{order.product?.name || `Product ID ${order.product_id}`}</td>
                    <td className="px-4 py-3">{order.color}</td>
                    <td className="px-4 py-3">{order.quantity} ดอก</td>
                    <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400">
                      ฿{(order.total_price || (order.quantity * (order.product?.price || 3.5))).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    ยังไม่มีรายการสั่งทำ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
