'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { SellerProduct } from '@/types/seller';
import Toast from '../_components/Toast';
import { useToast } from '../_lib/use-toast';
import ProductCard from './_components/ProductCard';
import ProductForm from './_components/ProductForm';
import SlideOverPanel from './_components/SlideOverPanel';

interface SellerProductsClientProps {
  initialProducts: SellerProduct[];
}

export default function SellerProductsClient({ initialProducts }: SellerProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<SellerProduct[]>(initialProducts);
  // Re-sync when the server sends a fresh list (after router.refresh()).
  const [syncedFrom, setSyncedFrom] = useState(initialProducts);
  if (initialProducts !== syncedFrom) {
    setSyncedFrom(initialProducts);
    setProducts(initialProducts);
  }
  const [panel, setPanel] = useState<'none' | 'create' | 'edit'>('none');
  const [editTarget, setEditTarget] = useState<SellerProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast, showToast } = useToast();
  const [, startTransition] = useTransition();
  const [panelKey, setPanelKey] = useState(0); // new key resets the form on each open

  const closePanel = () => {
    setPanel('none');
    setEditTarget(null);
  };

  const openCreate = () => {
    setPanelKey((key) => key + 1);
    setEditTarget(null);
    setPanel('create');
  };

  const openEdit = (p: SellerProduct) => {
    setPanelKey((key) => key + 1);
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

    if (!updated) {
      // RLS filtered the row out: nothing was saved.
      showToast('ไม่พบสินค้านี้หรือไม่มีสิทธิ์แก้ไข', 'error');
      startTransition(() => router.refresh());
      return;
    }

    setProducts((prev) => prev.map((p) => (p.id === editTarget.id ? (updated as SellerProduct) : p)));
    closePanel();
    showToast('แก้ไขสินค้าเรียบร้อย', 'success');
    startTransition(() => router.refresh());
  };

  const handleToggle = async (product: SellerProduct) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
      .eq('id', product.id)
      .select('id');

    if (error) {
      showToast(`เปลี่ยนสถานะสินค้าไม่สำเร็จ: ${error.message}`, 'error');
      return;
    }

    if (!data || data.length === 0) {
      showToast(`เปลี่ยนสถานะ "${product.name}" ไม่สำเร็จ: ไม่พบสินค้าหรือไม่มีสิทธิ์`, 'error');
      startTransition(() => router.refresh());
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
        <SlideOverPanel
          title={panel === 'create' ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสินค้า'}
          onClose={closePanel}
        >
          <ProductForm
            key={panelKey}
            initial={editTarget ?? undefined}
            onSave={panel === 'create' ? handleCreate : handleEdit}
            onCancel={closePanel}
            isSaving={isSaving}
          />
        </SlideOverPanel>
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
