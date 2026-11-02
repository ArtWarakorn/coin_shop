import { createClient } from '@/lib/supabase/client';

// Keep in sync with the bucket limits in migration 20261102000100.
const BUCKET = 'coin_shop';
const MAX_IMAGE_MB = 5;
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSION_BY_TYPE).join(',');

export function validateProductImage(file: File): string | null {
  if (!EXTENSION_BY_TYPE[file.type]) return 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP';
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `ไฟล์รูปต้องมีขนาดไม่เกิน ${MAX_IMAGE_MB} MB`;
  return null;
}

/** Uploads to the seller's own folder and returns the public URL. Throws on failure. */
export async function uploadProductImage(file: File, sellerId: string): Promise<string> {
  const path = `products/${sellerId}/${crypto.randomUUID()}.${EXTENSION_BY_TYPE[file.type]}`;
  const { storage } = createClient();

  const { error } = await storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);

  return storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
