'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types/database';

interface OrderCustomizerProps {
  products: Product[];
  userId: string;
}

const COLOR_PRESETS = [
  'ทองประกายมงคล',
  'เงินยวงบริสุทธิ์',
  'ชมพูกลีบบัว',
  'ฟ้าครามสดใส',
  'เขียวมรกต',
  'คละสีมงคล 5 สี',
];

export default function OrderCustomizer({ products, userId }: OrderCustomizerProps) {
  const router = useRouter();

  const [selectedProductId, setSelectedProductId] = useState<number>(
    products[0]?.id || 0
  );
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PRESETS[0]);
  const [customColor, setCustomColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [customerNote, setCustomerNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currentProduct = products.find((p) => p.id === Number(selectedProductId)) || products[0];
  const unitPrice = currentProduct?.price || 3.5;
  const totalPrice = Number((quantity * unitPrice).toFixed(2));

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const finalColor = customColor.trim() ? customColor.trim() : selectedColor;

    if (!selectedProductId) {
      setFeedback({ type: 'error', message: 'กรุณาเลือกลายเหรียญโปรยทาน' });
      setSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('orders').insert({
        customer_id: userId,
        product_id: Number(selectedProductId),
        color: finalColor,
        quantity: Number(quantity),
        total_price: totalPrice,
        customer_note: customerNote.trim() || null,
        status: 'pending',
      });

      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        message: 'ส่งรายการสั่งทำเหรียญโปรยทานเรียบร้อยแล้ว ทีมงานจะเริ่มเตรียมงานทันที',
      });
      setCustomerNote('');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกคำสั่งทำ';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="order-customizer-card">
      <div className="order-customizer-header">
        <div className="flex items-center justify-between">
          <h2 className="order-customizer-title">
            <span>🪙</span> สั่งทำเหรียญโปรยทานพิเศษ (Custom Order)
          </h2>
          <span className="badge-amber">งานฝีมือประณีต</span>
        </div>
        <p className="order-customizer-desc">
          เลือกแบบ สีริบบิ้น และระบุจำนวนที่ต้องการสำหรับใช้ในงานบวช งานศพ หรือพิธีมงคล
        </p>
      </div>

      <div className="order-customizer-body">
        {/* Left Column: Form Controls */}
        <form onSubmit={handleOrderSubmit} className="order-form-grid">
          {feedback && (
            <div className={`alert-feedback ${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* 1. เลือกลายเหรียญ */}
          <div>
            <label htmlFor="product-select" className="form-group-label">
              1. เลือกลายเหรียญโปรยทาน
            </label>
            <select
              id="product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="theme-select"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. เลือกสีริบบิ้น */}
          <div>
            <label className="form-group-label">
              2. โทนสีริบบิ้นที่ต้องการ
            </label>
            <div className="radio-chips-container">
              {COLOR_PRESETS.map((colorName) => (
                <button
                  type="button"
                  key={colorName}
                  onClick={() => {
                    setSelectedColor(colorName);
                    setCustomColor('');
                  }}
                  className={`radio-chip ${
                    selectedColor === colorName && !customColor ? 'selected' : ''
                  }`}
                >
                  {colorName}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="หรือพิมพ์ระบุสีพิเศษเอง เช่น แดงทับทิมขลิบทอง"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="theme-input"
              />
            </div>
          </div>

          {/* 3. จำนวนและหมายเหตุ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity-input" className="form-group-label">
                3. จำนวน (เหรียญ/ดอก)
              </label>
              <input
                id="quantity-input"
                type="number"
                min="10"
                step="10"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="theme-input"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                ขั้นต่ำ 50-100 เหรียญขึ้นไป
              </span>
            </div>

            <div>
              <label htmlFor="note-input" className="form-group-label">
                ข้อความ/หมายเหตุถึงร้าน
              </label>
              <textarea
                id="note-input"
                placeholder="ระบุวันที่จัดงาน หรือข้อความพิเศษ..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="theme-textarea"
                rows={2}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-amber-submit"
          >
            {submitting ? 'กำลังบันทึกรายการ...' : 'ยืนยันการสั่งทำเหรียญโปรยทาน'}
          </button>
        </form>

        {/* Right Column: Live Order Summary & Preview */}
        <div className="order-summary-box">
          <div>
            <div className="summary-title">
              <span>สรุปรายการสั่งทำ</span>
              <span className="text-xs font-normal text-amber-600">พร้อมดำเนินการ</span>
            </div>

            {currentProduct && (
              <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="h-44 relative bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentProduct.image_url}
                    alt={currentProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <span className="absolute top-2 right-2 bg-amber-500/95 text-white text-[11px] font-semibold px-2 py-0.5 rounded shadow-sm">
                    Pre-order 4-5 วัน
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">{currentProduct.name}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                    ⏳ ผลิตตามคิวสั่งทำ: Pre-order 4-5 วัน
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {currentProduct.description || 'เหรียญโปรยทานริบบิ้น งานฝีมือประณีต'}
                  </p>
                </div>
              </div>
            )}

            <div className="summary-list">
              <div className="summary-row">
                <span>ลายที่เลือก</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {currentProduct?.name || '-'}
                </span>
              </div>
              <div className="summary-row">
                <span>สีริบบิ้น</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {customColor.trim() || selectedColor}
                </span>
              </div>
              <div className="summary-row">
                <span>ราคาต่ออัน</span>
                <div className="text-right">
                  <span className="font-medium text-gray-900 dark:text-gray-100">฿{unitPrice.toFixed(2)} / อัน</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-normal">
                    (พร้อมใส่เหรียญ 1 บาท)
                  </span>
                </div>
              </div>
              <div className="summary-row">
                <span>จำนวนที่สั่ง</span>
                <span className="summary-highlight">{quantity} อัน</span>
              </div>
              <div className="summary-row">
                <span>ยอดรวมทั้งหมด</span>
                <div className="text-right">
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    ฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-normal">
                    (ราคารวมเหรียญบาทเรียบร้อยแล้ว)
                  </span>
                </div>
              </div>
              <div className="summary-row">
                <span>ระยะเวลาเตรียมของ</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">Pre-order 4-5 วัน</span>
              </div>
              <div className="summary-row total">
                <span>สถานะหลังสั่ง</span>
                <span className="badge-amber">รอยืนยัน (Pending)</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
            * หลังจากกดสั่งทำ ร้านค้าจะยืนยันคิวและเริ่มจัดเตรียมสินค้าตามลำดับ
          </div>
        </div>
      </div>
    </div>
  );
}
