-- NOT APPLIED YET. Review, try on a Supabase branch, then apply.
-- Touches coin_shop objects only. Independent of 20261101000000_coin_shop_scaling.sql.
--
-- 1. Order quantity limits. The browser writes orders straight to the database,
--    so the app-side check in src/lib/orders/rules.ts is not enough on its own.
--    Keep MIN/MAX in sync with that file (50 and 100000).
--    Checked on 2026-11-01: the 4 existing orders have quantities 50..100, so the
--    constraint can be added fully validated.
-- 2. Fix the "mutable search_path" advisor warning on set_order_total_price().

begin;

alter table coin_shop.orders
  add constraint orders_quantity_range check (quantity between 50 and 100000);

alter function coin_shop.set_order_total_price()
  set search_path = coin_shop, pg_temp;

commit;

-- Roll back:
--   alter table coin_shop.orders drop constraint orders_quantity_range;
--   alter function coin_shop.set_order_total_price() reset search_path;
