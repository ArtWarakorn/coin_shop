import { useEffect, useRef, useState } from 'react';
import type { SellerProduct } from '@/types/seller';
import { sanitizeUrl } from '../_lib/sanitize-url';
import {
  ACCEPTED_IMAGE_TYPES,
  uploadProductImage,
  validateProductImage,
} from '../_lib/upload-product-image';

interface ProductFormProps {
  initial?: Partial<SellerProduct>;
  sellerId: string;
  onSave: (product: Partial<SellerProduct>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export default function ProductForm({ initial, sellerId, onSave, onCancel, isSaving }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState<string>(initial?.price != null ? String(initial.price) : '3.50');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [validationError, setValidationError] = useState('');

  const safeImageSrc = sanitizeUrl(imageUrl);
  const previewSrc = filePreviewUrl ?? safeImageSrc;
  const isBusy = isSaving || isUploading;

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const selectFile = (file: File | null) => {
    setImageFile(file);
    setFilePreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the seller pick the same file again
    if (!file) return;

    const fileError = validateProductImage(file);
    setValidationError(fileError ?? '');
    if (!fileError) selectFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim()) { setValidationError('กรุณากรอกชื่อสินค้า'); return; }
    if (!imageFile && !safeImageSrc) {
      setValidationError('กรุณาเลือกรูปจากเครื่อง หรือกรอก URL รูปภาพที่ถูกต้อง (http/https)');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) { setValidationError('ราคาต้องมากกว่า 0'); return; }

    let savedImageUrl = safeImageSrc;
    if (imageFile) {
      setIsUploading(true);
      try {
        savedImageUrl = await uploadProductImage(imageFile, sellerId);
      } catch (err) {
        setValidationError(`อัปโหลดรูปไม่สำเร็จ: ${err instanceof Error ? err.message : 'กรุณาลองใหม่อีกครั้ง'}`);
        return;
      } finally {
        setIsUploading(false);
      }
      // A retry after a failed save reuses this upload instead of adding another file.
      setImageUrl(savedImageUrl);
      selectFile(null);
    }

    await onSave({
      name: name.trim(),
      image_url: savedImageUrl,
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
        <span style={labelStyle}>รูปสินค้า *</span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          onChange={handleFileChange}
          aria-label="เลือกรูปสินค้าจากเครื่อง"
          className="sr-only"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            style={{
              background: 'rgba(251,146,60,0.12)',
              color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.3)',
            }}
          >
            เลือกรูปจากเครื่อง
          </button>
          <span className="text-xs truncate" style={{ color: 'rgba(240,244,255,0.45)' }}>
            {imageFile ? imageFile.name : 'JPG, PNG หรือ WebP ไม่เกิน 5 MB'}
          </span>
        </div>

        <label style={{ ...labelStyle, marginTop: '0.75rem' }}>หรือใช้ URL รูปภาพ (https://...)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            selectFile(null);
          }}
          placeholder="https://..."
          style={inputStyle}
        />
        {previewSrc && (
          <div className="mt-2 rounded-xl overflow-hidden w-32 h-20" style={{ background: 'rgba(240,244,255,0.04)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt="ตัวอย่างรูป" className="w-full h-full object-cover" />
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
          disabled={isBusy}
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
          disabled={isBusy}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
          style={{
            background: isBusy ? 'rgba(251,146,60,0.3)' : 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
            color: '#fff',
          }}
        >
          {isUploading
            ? 'กำลังอัปโหลดรูป...'
            : isSaving
              ? 'กำลังบันทึก...'
              : initial?.id
                ? 'บันทึกการแก้ไข'
                : 'เพิ่มสินค้า'}
        </button>
      </div>
    </form>
  );
}
