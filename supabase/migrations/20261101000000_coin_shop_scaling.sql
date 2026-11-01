-- Scaling fixes for the coin_shop schema. Only touches coin_shop objects.
-- Access rules do not change: each policy keeps the same condition, wrapped in
-- (select ...) so Postgres evaluates it once per query instead of once per row.

begin;

-- is_admin() was VOLATILE by default, which forces a re-run for every row.
alter function coin_shop.is_admin() stable;

drop policy orders_insert_policy on coin_shop.orders;
create policy orders_insert_policy on coin_shop.orders
  for insert to authenticated
  with check (customer_id = (select auth.uid()) and status = 'pending'::coin_shop.order_status);

drop policy orders_select_policy on coin_shop.orders;
create policy orders_select_policy on coin_shop.orders
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or (select coin_shop.is_admin())
    or seller_id = (select auth.uid())
  );

drop policy orders_update_policy on coin_shop.orders;
create policy orders_update_policy on coin_shop.orders
  for update to authenticated
  using ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())))
  with check ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())));

drop policy profiles_select_policy on coin_shop.profiles;
create policy profiles_select_policy on coin_shop.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select coin_shop.is_admin()));

drop policy profiles_insert_policy on coin_shop.profiles;
create policy profiles_insert_policy on coin_shop.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) or (select coin_shop.is_admin()));

drop policy profiles_update_policy on coin_shop.profiles;
create policy profiles_update_policy on coin_shop.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select coin_shop.is_admin()))
  with check (id = (select auth.uid()) or (select coin_shop.is_admin()));

drop policy products_select_policy on coin_shop.products;
create policy products_select_policy on coin_shop.products
  for select to anon, authenticated
  using (is_active = true or (select coin_shop.is_admin()) or seller_id = (select auth.uid()));

drop policy products_staff_insert on coin_shop.products;
create policy products_staff_insert on coin_shop.products
  for insert to authenticated
  with check ((select coin_shop.is_admin()) or (select coin_shop.is_seller()));

drop policy products_staff_update on coin_shop.products;
create policy products_staff_update on coin_shop.products
  for update to authenticated
  using ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())))
  with check ((select coin_shop.is_admin()) or ((select coin_shop.is_seller()) and seller_id = (select auth.uid())));

-- Same results as before; the role checks now run once per call.
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

-- Match the app's most frequent filter + sort combinations.
create index if not exists idx_orders_customer_created
  on coin_shop.orders (customer_id, created_at desc);
create index if not exists idx_products_active_created
  on coin_shop.products (created_at desc) where is_active;

commit;
