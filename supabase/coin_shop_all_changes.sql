-- รวมการแก้ฐานข้อมูลทั้งหมดของ schema coin_shop ไว้ในไฟล์เดียว
-- วิธีใช้: คัดลอกทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor แล้วกด Run
--
-- ความปลอดภัย
--   * แตะเฉพาะ schema coin_shop ไม่ยุ่งกับ KTXA, financ, classroom, workpage, public
--   * ไม่ลบและไม่แก้ข้อมูลในตาราง
--   * อยู่ใน transaction เดียว ถ้าพังตรงไหนจะย้อนกลับทั้งหมด
--   * รันซ้ำได้ ไม่ error และผลเหมือนเดิม
--   * ถ้าตารางถูกใช้งานอยู่จนรอ lock เกิน 5 วินาที จะยกเลิกเอง ให้กด Run ใหม่
--
-- สิ่งที่เปลี่ยน
--   1. RLS ประเมินครั้งเดียวต่อ query เงื่อนไขสิทธิ์เหมือนเดิมทุกข้อ + เพิ่ม index
--   2. ฐานข้อมูลบังคับจำนวนสั่ง 50-100,000 ชิ้น (ตรงกับ src/lib/orders/rules.ts)
--   3. แก้ search_path ของ set_order_total_price()
--   4. ให้ customer สมัครเป็น seller เองได้ (อนุญาตเฉพาะ customer -> seller)
--
-- รวมจาก supabase/migrations/20261101000000, 20261101000100 และ 20261102000000

begin;

set local lock_timeout = '5s';

-- ------------------------------------------------------------------
-- ตรวจข้อมูลเก่าก่อนเริ่ม ถ้าไม่ผ่านจะหยุดโดยไม่มีอะไรเปลี่ยน
-- ------------------------------------------------------------------
do $check$
declare
  v_bad bigint;
begin
  select count(*) into v_bad
  from coin_shop.orders
  where quantity not between 50 and 100000;

  if v_bad > 0 then
    raise exception 'มีออเดอร์ % แถวที่จำนวนอยู่นอกช่วง 50-100,000 ยังไม่ได้แก้อะไร', v_bad;
  end if;
end
$check$;

-- ------------------------------------------------------------------
-- 1. RLS: เงื่อนไขเดิม แต่ครอบด้วย (select ...) ให้ทำงานครั้งเดียวต่อ query
-- ------------------------------------------------------------------
alter function coin_shop.is_admin() stable;

drop policy if exists orders_insert_policy on coin_shop.orders;
create policy orders_insert_policy on coin_shop.orders
  for insert to authenticated
  with check (customer_id = (select auth.uid()) and status = 'pending'::coin_shop.order_status);

drop policy if exists orders_select_policy on coin_shop.orders;
create policy orders_select_policy on coin_shop.orders
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or (select coin_shop.is_admin())
    or seller_id = (select auth.uid())
  );

drop policy if exists orders_update_policy on coin_shop.orders;
create policy orders_update_policy on coin_shop.orders
  for update to authenticated
  using ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())))
  with check ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())));

drop policy if exists profiles_select_policy on coin_shop.profiles;
create policy profiles_select_policy on coin_shop.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select coin_shop.is_admin()));

drop policy if exists profiles_insert_policy on coin_shop.profiles;
create policy profiles_insert_policy on coin_shop.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) or (select coin_shop.is_admin()));

drop policy if exists profiles_update_policy on coin_shop.profiles;
create policy profiles_update_policy on coin_shop.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select coin_shop.is_admin()))
  with check (id = (select auth.uid()) or (select coin_shop.is_admin()));

drop policy if exists products_select_policy on coin_shop.products;
create policy products_select_policy on coin_shop.products
  for select to anon, authenticated
  using (is_active = true or (select coin_shop.is_admin()) or seller_id = (select auth.uid()));

drop policy if exists products_staff_insert on coin_shop.products;
create policy products_staff_insert on coin_shop.products
  for insert to authenticated
  with check ((select coin_shop.is_admin()) or (select coin_shop.is_seller()));

drop policy if exists products_staff_update on coin_shop.products;
create policy products_staff_update on coin_shop.products
  for update to authenticated
  using ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())))
  with check ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())));

create or replace function coin_shop.seller_orders()
returns table (
  id bigint, status coin_shop.order_status, quantity integer, color text, customer_note text,
  total_price numeric, created_at timestamptz, due_date timestamptz, days_left integer,
  product_name text, product_image text, customer_name text, customer_phone text
)
language sql stable security definer
set search_path to 'coin_shop', 'pg_temp'
as $function$
  select o.id, o.status, o.quantity, o.color, o.customer_note, o.total_price, o.created_at, o.due_date,
         ((o.due_date at time zone 'Asia/Bangkok')::date - (now() at time zone 'Asia/Bangkok')::date),
         p.name, p.image_url, c.full_name, c.phone
  from coin_shop.orders o
  join coin_shop.products p on p.id = o.product_id
  join coin_shop.profiles c on c.id = o.customer_id
  where (select coin_shop.is_admin())
     or ((select coin_shop.is_seller()) and o.seller_id = auth.uid())
  order by (o.status in ('completed','cancelled')), o.due_date asc, o.created_at asc;
$function$;

create index if not exists idx_orders_customer_created
  on coin_shop.orders (customer_id, created_at desc);
create index if not exists idx_products_active_created
  on coin_shop.products (created_at desc) where is_active;

-- ------------------------------------------------------------------
-- 2. บังคับจำนวนสั่ง 50-100,000 ชิ้นที่ฐานข้อมูล
-- ------------------------------------------------------------------
do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_quantity_range'
      and conrelid = 'coin_shop.orders'::regclass
  ) then
    alter table coin_shop.orders
      add constraint orders_quantity_range check (quantity between 50 and 100000);
  end if;
end
$constraint$;

-- ------------------------------------------------------------------
-- 3. แก้คำเตือน mutable search_path
-- ------------------------------------------------------------------
alter function coin_shop.set_order_total_price()
  set search_path = coin_shop, pg_temp;

-- ------------------------------------------------------------------
-- 4. ให้ customer สมัครเป็น seller เองได้
--    การเปลี่ยน role เองแบบอื่นยังถูกปฏิเสธทั้งหมด รวมถึงการตั้งเป็น admin
-- ------------------------------------------------------------------
create or replace function coin_shop.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'coin_shop', 'pg_temp'
as $function$
begin
  if auth.uid() is not null and not coalesce(coin_shop.is_admin(), false) then
    if tg_op = 'INSERT' and new.role is distinct from 'customer'::coin_shop.user_role then
      raise exception 'role not allowed';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role
      and not (old.role = 'customer'::coin_shop.user_role
               and new.role = 'seller'::coin_shop.user_role) then
      raise exception 'role change not allowed';
    end if;
  end if;
  return new;
end $function$;

commit;

-- ------------------------------------------------------------------
-- ตรวจผล: อ่านอย่างเดียว ทุกแถวต้องเป็น ok = true
-- ------------------------------------------------------------------
select 'is_admin เป็น stable' as item,
       (select provolatile = 's' from pg_proc where oid = 'coin_shop.is_admin()'::regprocedure) as ok
union all
select 'มี CHECK จำนวนสั่ง',
       exists (select 1 from pg_constraint where conname = 'orders_quantity_range' and convalidated)
union all
select 'แก้ search_path แล้ว',
       (select proconfig is not null from pg_proc where oid = 'coin_shop.set_order_total_price()'::regprocedure)
union all
select 'มี index ใหม่ครบ 2 ตัว',
       (select count(*) = 2 from pg_indexes
        where schemaname = 'coin_shop'
          and indexname in ('idx_orders_customer_created', 'idx_products_active_created'))
union all
select 'มี policy ครบ 9 ตัว',
       (select count(*) = 9 from pg_policies where schemaname = 'coin_shop')
union all
select 'เปิดให้สมัคร seller แล้ว',
       (select pg_get_functiondef(oid) like '%old.role = ''customer''%'
        from pg_proc where oid = 'coin_shop.guard_profile_role()'::regprocedure);

-- ------------------------------------------------------------------
-- ย้อนกลับ (ถ้าจำเป็น): เอา /* และ */ ออกแล้วรันเฉพาะส่วนนี้
-- เงื่อนไขของ policy เหมือนเดิมอยู่แล้ว จึงไม่ต้องย้อน
-- ------------------------------------------------------------------
/*
begin;
alter table coin_shop.orders drop constraint if exists orders_quantity_range;
alter function coin_shop.set_order_total_price() reset search_path;
create or replace function coin_shop.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'coin_shop', 'pg_temp'
as $function$
begin
  if auth.uid() is not null and not coalesce(coin_shop.is_admin(), false) then
    if tg_op = 'INSERT' and new.role is distinct from 'customer'::coin_shop.user_role then
      raise exception 'role not allowed';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'role change not allowed';
    end if;
  end if;
  return new;
end $function$;
commit;
*/
