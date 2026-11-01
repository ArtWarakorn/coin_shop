import Link from 'next/link';
import type { Product } from '@/types/database';

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">ลายเหรียญโปรยทานที่เปิดรับทำ</h2>
          <p className="text-sm text-gray-500">เลือกแบบและสั่งทำได้ทันที</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.length ? (
          products.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition"
            >
              <div className="h-48 bg-gray-100 dark:bg-gray-700 relative flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 right-2 bg-amber-500/95 text-white text-[11px] font-semibold px-2 py-0.5 rounded shadow-sm backdrop-blur-xs">
                  Pre-order 4-5 วัน
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base">{item.name}</h3>
                  <div className="text-right">
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-sm whitespace-nowrap block">
                      ฿{(item.price || 3.5).toFixed(2)} / อัน
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">
                      (ราคารวมใส่เหรียญ 1 บาทแล้ว)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                  ⏳ ระยะเวลาผลิต: Pre-order 4-5 วัน
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {item.description || 'เหรียญโปรยทานริบบิ้น งานฝีมือประณีต'}
                </p>
                <Link
                  href={`/dashboard?product=${item.id}#order-customizer`}
                  scroll
                  className="mt-3 block w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition text-center"
                >
                  สั่งทำลายนี้
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
            ยังไม่มีรายการสินค้าที่เปิดใช้งาน
          </div>
        )}
      </div>
    </section>
  );
}
