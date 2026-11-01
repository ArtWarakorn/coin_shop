import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/types/database';
import type { SellerProduct } from '@/types/seller';

export async function getActiveProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return (data as Product[] | null) ?? [];
}

/** A seller's own products. RLS alone would also return other sellers' active ones. */
export async function getSellerProducts(sellerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  return { products: (data as SellerProduct[] | null) ?? [], error };
}
