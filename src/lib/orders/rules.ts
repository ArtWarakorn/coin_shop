/**
 * Order quantity limits. Used by the order form and mirrored by a CHECK
 * constraint in supabase/migrations/20261101000100_order_rules_and_hardening.sql.
 * Change both together.
 */
export const MIN_ORDER_QUANTITY = 50;
export const MAX_ORDER_QUANTITY = 100_000;
export const ORDER_QUANTITY_STEP = 10;

/** Returns a Thai error message, or null when the quantity is acceptable. */
export function validateOrderQuantity(quantity: number): string | null {
  if (!Number.isInteger(quantity)) return 'กรุณาระบุจำนวนเป็นจำนวนเต็ม';
  if (quantity < MIN_ORDER_QUANTITY) {
    return `สั่งขั้นต่ำ ${MIN_ORDER_QUANTITY.toLocaleString('th-TH')} ดอก`;
  }
  if (quantity > MAX_ORDER_QUANTITY) {
    return `สั่งได้สูงสุด ${MAX_ORDER_QUANTITY.toLocaleString('th-TH')} ดอกต่อออเดอร์`;
  }
  return null;
}
