// Seller-specific types — extend database.ts without modifying customer/admin types

import type { OrderStatus } from './database';

/** Row returned by coin_shop.seller_orders() RPC */
export interface SellerOrder {
  id: number;
  status: OrderStatus;
  quantity: number;
  color: string;
  customer_note: string | null;
  total_price: number;
  created_at: string;
  due_date: string;
  /** Days left until due date (Bangkok time). Negative = overdue. */
  days_left: number;
  product_name: string;
  product_image: string | null;
  customer_name: string | null;
  customer_phone: string | null;
}

/** Seller's own product (seller_id is present from RLS-filtered query) */
export interface SellerProduct {
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

/** Status flow for seller: next allowed status from each current status */
export const STATUS_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'in_production',
  in_production: 'ready',
  ready: 'completed',
};

/** Statuses from which cancel is allowed */
export const CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'in_production'];

/** Thai action label for advancing to the next status */
export const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'รับออเดอร์',
  confirmed: 'เริ่มผลิต',
  in_production: 'พร้อมจัดส่ง',
  ready: 'ส่งมอบเรียบร้อย',
};

/** Thai display labels for each status */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'รอรับ',
  confirmed: 'รับออเดอร์แล้ว',
  in_production: 'กำลังผลิต',
  ready: 'จัดส่ง',
  completed: 'เรียบร้อย',
  cancelled: 'ยกเลิก',
};
