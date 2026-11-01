import type { SellerProduct } from '@/types/seller';
import { sanitizeUrl } from '../_lib/sanitize-url';

interface ProductCardProps {
  product: SellerProduct;
  onEdit: (p: SellerProduct) => void;
  onToggle: (p: SellerProduct) => void;
}

export default function ProductCard({ product, onEdit, onToggle }: ProductCardProps) {
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
