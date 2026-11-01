export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'seller' | 'admin';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'in_production',
  'ready',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  image_url: string;
  description: string | null;
  price: number;
  is_active: boolean;
  seller_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  customer_id: string;
  product_id: number;
  seller_id: string | null;
  color: string;
  quantity: number;
  total_price: number;
  customer_note: string | null;
  status: OrderStatus;
  due_date: string;
  created_at: string;
  updated_at: string;
  product?: Pick<Product, 'name' | 'price'>;
  customer?: Pick<Profile, 'full_name' | 'username' | 'phone'>;
}
