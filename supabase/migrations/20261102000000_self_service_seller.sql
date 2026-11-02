-- NOT APPLIED YET. Review, try on a Supabase branch, then apply.
-- Touches coin_shop objects only. Independent of the 20261101 migrations.
--
-- Lets a customer turn their own account into a seller from /dashboard, with no
-- admin approval. profiles_update_policy already lets users update their own row,
-- so the role guard is the only thing to relax. It allows exactly one move:
-- customer -> seller. Every other self-service role change still raises, including
-- anything to admin and seller -> customer.

begin;

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

-- Roll back: re-run the function above without the "and not (...)" condition.
