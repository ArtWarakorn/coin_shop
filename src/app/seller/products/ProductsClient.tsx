'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SellerProduct } from '@/types/seller';
import { createClient } from '@/lib/supabase/client';

// ─── Helpers ─────────────────────────────────────────────────────
function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') return raw;
  } catch {
    // not a valid url
  }
  return '';
}

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className="fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl max-w-xs"
      style={{
        background: type === 'success' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
        border: `1px solid ${type === 'success' ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
        color: type === 'success' ? '#34d399' : '#f87171',
        backdropFilter: 'blur(8px)',
      }}
    >
      {message}
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────────
interface ProductFormProps {
  initial?: Partial<SellerProduct>;
  onSave: (product: Partial<SellerProduct>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function ProductForm({ initial, onSave, onCancel, isSaving }: ProductFormProps) {
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

// ─── Product Card ─────────────────────────────────────────────────
interface ProductCardProps {
  product: SellerProduct;
  onEdit: (p: SellerProduct) => void;
  onToggle: (p: SellerProduct) => void;
}

function ProductCard({ product, onEdit, onToggle }: ProductCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(240,244,255,0.035)',
        border: `1px solid ${product.is_active ? 'rgba(52,211,153,0.15)' : 'rgba(240,244,255,0.07)'}`,
        opacity: product.is_active ? 1 : 0.6,
      }}
    >
      <div className="h-36 overflow-hidden relative" style={{ background: 'rgba(240,244,255,0.05)' }}>
        {product.image_url && sanitizeUrl(product.image_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-3xl">🪙</span>
        )}
        <span
          className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={
            product.is_active
              ? { background: 'rgba(52,211,153,0.2)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }
              : { background: 'rgba(240,244,255,0.08)', color: 'rgba(240,244,255,0.4)', border: '1px solid rgba(240,244,255,0.1)' }
          }
        >
          {product.is_active ? 'เปิดขาย' : 'ซ่อน'}
        </span>
      </div>

      <div className="p-4 space-y-1">
        <p className="font-bold text-sm" style={{ color: '#f0f4ff' }}>
          {product.name}
        </p>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(240,244,255,0.4)' }}>
          {product.description || 'ไม่มีรายละเอียด'}
        </p>
        <p className="text-sm font-bold pt-1" style={{ color: '#fb923c' }}>
          ฿{product.price.toFixed(2)} / ดอก
        </p>
      </div>

      <div
        className="px-4 py-3 flex gap-2"
        style={{ borderTop: '1px solid rgba(240,244,255,0.06)' }}
      >
        <button
          onClick={() => onToggle(product)}
          className="flex-1 text-xs font-semibold py-2 rounded-xl transition-colors"
          style={{
            background: product.is_active ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
            color: product.is_active ? '#f87171' : '#34d399',
            border: `1px solid ${product.is_active ? 'rgba(248,113,113,0.25)' : 'rgba(52,211,153,0.25)'}`,
          }}
        >
          {product.is_active ? 'ซ่อน' : 'เปิดขาย'}
        </button>
        <button
          onClick={() => onEdit(product)}
          className="flex-1 text-xs font-semibold py-2 rounded-xl transition-colors"
          style={{
            background: 'rgba(240,244,255,0.06)',
            color: 'rgba(240,244,255,0.7)',
            border: '1px solid rgba(240,244,255,0.1)',
          }}
        >
          แก้ไข
        </button>
      </div>
    </div>
  );
}

// ─── Slide-over panel ─────────────────────────────────────────────
function Panel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full overflow-y-auto p-6 space-y-5"
        style={{ background: '#1a2540', borderLeft: '1px solid rgba(240,244,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: '#f0f4ff' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-xl"
            style={{ color: 'rgba(240,244,255,0.5)', border: '1px solid rgba(240,244,255,0.1)' }}
          >
            ปิด
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
interface SellerProductsClientProps {
  initialProducts: SellerProduct[];
}

export default function SellerProductsClient({ initialProducts }: SellerProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<SellerProduct[]>(initialProducts);
  const [panel, setPanel] = useState<'none' | 'create' | 'edit'>('none');
  const [editTarget, setEditTarget] = useState<SellerProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [, startTransition] = useTransition();
  const panelKey = useRef(0);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const closePanel = () => {
    setPanel('none');
    setEditTarget(null);
  };

  const openCreate = () => {
    panelKey.current++;
    setEditTarget(null);
    setPanel('create');
  };

  const openEdit = (p: SellerProduct) => {
    panelKey.current++;
    setEditTarget(p);
    setPanel('edit');
  };

  const handleCreate = async (data: Partial<SellerProduct>) => {
    setIsSaving(true);
    const supabase = createClient();
    // Do NOT send seller_id — server enforces it via RLS trigger
    const { data: created, error } = await supabase
      .from('products')
      .insert({
        name: data.name!,
        image_url: data.image_url!,
        description: data.description ?? null,
        price: data.price!,
        is_active: data.is_active ?? true,
      })
      .select('*')
      .maybeSingle();

    setIsSaving(false);

    if (error) {
      showToast(`เพิ่มสินค้าไม่สำเร็จ: ${error.message}`, 'error');
      return;
    }

    if (created) {
      setProducts((prev) => [created as SellerProduct, ...prev]);
    }
    closePanel();
    showToast('เพิ่มสินค้าเรียบร้อย', 'success');
    startTransition(() => router.refresh());
  };

  const handleEdit = async (data: Partial<SellerProduct>) => {
    if (!editTarget) return;
    setIsSaving(true);
    const supabase = createClient();
    // Only send permitted fields: name, image_url, description, price, is_active
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        name: data.name!,
        image_url: data.image_url!,
        description: data.description ?? null,
        price: data.price!,
        is_active: data.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editTarget.id)
      .select('*')
      .maybeSingle();

    setIsSaving(false);

    if (error) {
      showToast(`แก้ไขสินค้าไม่สำเร็จ: ${error.message}`, 'error');
      return;
    }

    if (updated) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editTarget.id ? (updated as SellerProduct) : p))
      );
    }
    closePanel();
    showToast('แก้ไขสินค้าเรียบร้อย', 'success');
    startTransition(() => router.refresh());
  };

  const handleToggle = async (product: SellerProduct) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
      .eq('id', product.id);

    if (error) {
      showToast(`เปลี่ยนสถานะสินค้าไม่สำเร็จ: ${error.message}`, 'error');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
    );
    showToast(
      `${!product.is_active ? 'เปิดขาย' : 'ซ่อน'} "${product.name}" เรียบร้อย`,
      'success'
    );
    startTransition(() => router.refresh());
  };

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {panel !== 'none' && (
        <Panel
          title={panel === 'create' ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสินค้า'}
          onClose={closePanel}
        >
          <ProductForm
            key={panelKey.current}
            initial={editTarget ?? undefined}
            onSave={panel === 'create' ? handleCreate : handleEdit}
            onCancel={closePanel}
            isSaving={isSaving}
          />
        </Panel>
      )}

      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'rgba(240,244,255,0.4)' }}>
              {products.length} รายการ · {products.filter((p) => p.is_active).length} เปิดขาย
            </p>
          </div>
          <button
            onClick={openCreate}
            className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)', color: '#fff' }}
          >
            + เพิ่มสินค้า
          </button>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: 'rgba(240,244,255,0.03)', border: '1px dashed rgba(240,244,255,0.08)' }}
          >
            <p className="text-sm mb-3" style={{ color: 'rgba(240,244,255,0.3)' }}>
              ยังไม่มีสินค้า
            </p>
            <button
              onClick={openCreate}
              className="text-sm font-bold px-5 py-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)', color: '#fff' }}
            >
              เพิ่มสินค้าแรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={openEdit}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
