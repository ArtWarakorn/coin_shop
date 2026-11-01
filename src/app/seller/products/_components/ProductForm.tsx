import { useState } from 'react';
import type { SellerProduct } from '@/types/seller';
import { sanitizeUrl } from '../_lib/sanitize-url';

interface ProductFormProps {
  initial?: Partial<SellerProduct>;
  onSave: (product: Partial<SellerProduct>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export default function ProductForm({ initial, onSave, onCancel, isSaving }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState<string>(initial?.price != null ? String(initial.price) : '3.50');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [validationError, setValidationError] = useState('');

  const safeImageSrc = sanitizeUrl(imageUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim()) { setValidationError('กรุณากรอกชื่อสินค้า'); return; }
    if (!safeImageSrc) { setValidationError('กรุณากรอก URL รูปภาพที่ถูกต้อง (http/https)'); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) { setValidationError('ราคาต้องมากกว่า 0'); return; }

    await onSave({
      name: name.trim(),
      image_url: safeImageSrc,
      description: description.trim() || null,
      price: priceNum,
      is_active: isActive,
    });
  };

  const inputStyle = {
    background: 'rgba(240,244,255,0.06)',
    border: '1px solid rgba(240,244,255,0.12)',
    color: '#f0f4ff',
    borderRadius: '0.75rem',
    padding: '0.625rem 0.875rem',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'rgba(240,244,255,0.5)',
    marginBottom: '0.375rem',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {validationError && (
        <p
          className="text-xs rounded-xl px-4 py-2.5"
          style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
        >
          {validationError}
        </p>
      )}

      <div>
        <label style={labelStyle}>ชื่อสินค้า *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ลายเหรียญพระพุทธ..."
          required
          maxLength={100}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>URL รูปภาพ * (https://...)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          required
          style={inputStyle}
        />
        {safeImageSrc && (
          <div className="mt-2 rounded-xl overflow-hidden w-32 h-20" style={{ background: 'rgba(240,244,255,0.04)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={safeImageSrc} alt="ตัวอย่างรูป" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div>
        <label style={labelStyle}>รายละเอียด</label>
        <textarea
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="เหรียญโปรยทานริบบิ้น งานฝีมือ..."
          maxLength={500}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
        />
      </div>

      <div>
        <label style={labelStyle}>ราคาต่อดอก (฿)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ ...inputStyle, width: '9rem' }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive(!isActive)}
          className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
          style={{
            background: isActive ? 'linear-gradient(135deg, #ea580c, #f59e0b)' : 'rgba(240,244,255,0.12)',
            border: '1px solid rgba(240,244,255,0.1)',
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            style={{ transform: isActive ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
        <span className="text-sm" style={{ color: isActive ? '#34d399' : 'rgba(240,244,255,0.4)' }}>
          {isActive ? 'เปิดขาย (ลูกค้ามองเห็น)' : 'ซ่อน (ลูกค้าไม่เห็น)'}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: 'rgba(240,244,255,0.06)',
            color: 'rgba(240,244,255,0.6)',
            border: '1px solid rgba(240,244,255,0.1)',
          }}
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
          style={{
            background: isSaving ? 'rgba(251,146,60,0.3)' : 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
            color: '#fff',
          }}
        >
          {isSaving ? 'กำลังบันทึก...' : initial?.id ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
        </button>
      </div>
    </form>
  );
}
