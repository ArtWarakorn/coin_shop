import { createClient } from '@/lib/supabase/server';
import type { Order } from '@/types/database';
import type { SellerOrder } from '@/types/seller';

// Embed only the columns the UI reads, so payloads stay small as rows grow.
const ORDER_WITH_PRODUCT = '*, product:products(name, price)';
const ORDER_WITH_PRODUCT_AND_CUSTOMER = `${ORDER_WITH_PRODUCT}, customer:profiles!customer_id(full_name, username, phone)`;

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select(ORDER_WITH_PRODUCT)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return (data as Order[] | null) ?? [];
}

/** Every order in the system. RLS only returns them all to admins. */
export async function getAllOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select(ORDER_WITH_PRODUCT)
    .order('created_at', { ascending: false });
  return (data as Order[] | null) ?? [];
}

export async function getAdminOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select(ORDER_WITH_PRODUCT_AND_CUSTOMER)
    .order('created_at', { ascending: false });
  return (data as Order[] | null) ?? [];
}

export async function getSellerOrders() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('seller_orders');
  return { orders: (data as SellerOrder[] | null) ?? [], error };
}
