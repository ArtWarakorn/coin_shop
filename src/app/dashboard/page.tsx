import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, Product, Order } from '@/types/database';
import OrderCustomizer from './OrderCustomizer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile from coin_shop.profiles
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Self-heal: If profile does not exist yet in coin_shop.profiles, auto-insert from auth metadata
  if (!profile) {
    const fallbackUsername =
      (user.user_metadata?.username as string) ||
      (user.user_metadata?.user_name as string) ||
      user.email?.split('@')[0] ||
      'user_' + user.id.slice(0, 6);
    const fallbackFullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.fullName as string) ||
      user.email ||
      '';
    const fallbackPhone = (user.user_metadata?.phone as string) || '';

    const { data: newProfile } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: fallbackUsername,
        full_name: fallbackFullName,
        phone: fallbackPhone,
        role: 'customer',
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();

    if (newProfile) {
      profile = newProfile;
    }
  }

  const userProfile = profile as Profile | null;
  const displayUsername =
    userProfile?.username ||
    (user.user_metadata?.username as string) ||
    (user.user_metadata?.user_name as string) ||
    user.email?.split('@')[0] ||
    'สมาชิก';
  const displayPhone =
    userProfile?.phone ||
    (user.user_metadata?.phone as string) ||
    '-';
  const displayName =
    userProfile?.full_name ||
    displayUsername ||
    user.email;

  // Fetch active products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Orders query: Admin sees all orders, whereas Customers & Sellers see only their own orders
  const isAdmin = userProfile?.role === 'admin';
  const orderQuery = supabase
    .from('orders')
    .select('*, product:products(*)')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    orderQuery.eq('customer_id', user.id);
  }

  const { data: orders } = await orderQuery;

  async function handleSignOut() {
    'use server';
    const client = await createClient();
    await client.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-500">
              🪙 เหรียญโปรยทาน
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold uppercase">
              {userProfile?.role || 'customer'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {userProfile?.role === 'admin' && (
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
            <form action={handleSignOut}>
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

      {/* Main Content */}
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

        {/* Custom Order Section */}
        {products && products.length > 0 && (
          <OrderCustomizer products={products} userId={user.id} />
        )}

        {/* Products Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">ลายเหรียญโปรยทานที่เปิดรับทำ</h2>
              <p className="text-sm text-gray-500">เลือกแบบและสั่งทำได้ทันที</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(products as Product[] | null)?.length ? (
              products!.map((item) => (
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
                    <button className="mt-3 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition">
                      สั่งทำลายนี้
                    </button>
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

        {/* Orders Section */}
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
                  {(orders as Order[] | null)?.length ? (
                    orders!.map((order) => (
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
      </main>
    </div>
  );
}
