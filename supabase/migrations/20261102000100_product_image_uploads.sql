-- ให้ seller อัปโหลดรูปสินค้าจากเครื่องเข้า bucket coin_shop ได้
-- วิธีใช้: คัดลอกทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor แล้วกด Run
--
-- ความปลอดภัย
--   * แตะเฉพาะ bucket coin_shop ไม่ยุ่งกับ bucket profiles และ schema ของแอปอื่น
--   * รูปเดิมใน bucket ไม่เปลี่ยน และไม่ลบไฟล์หรือข้อมูลใดๆ
--   * seller เขียนได้เฉพาะ products/<id ของตัวเอง>/ แก้หรือลบไฟล์ไม่ได้
--   * รันซ้ำได้ ไม่ error และผลเหมือนเดิม
--
-- ขนาดและชนิดไฟล์ต้องตรงกับ src/app/seller/products/_lib/upload-product-image.ts

begin;

set local lock_timeout = '5s';

-- ขนาดไม่เกิน 5 MB และไม่รับ SVG เพราะฝังสคริปต์ได้
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'coin_shop';

drop policy if exists coin_shop_seller_upload_product_image on storage.objects;
create policy coin_shop_seller_upload_product_image on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'coin_shop'
    and (storage.foldername(name))[1] = 'products'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select coin_shop.is_seller())
  );

commit;

-- ตรวจผล: อ่านอย่างเดียว ทุกแถวต้องเป็น ok = true
select 'bucket เป็น public และจำกัดไฟล์แล้ว' as item,
       exists (select 1 from storage.buckets
               where id = 'coin_shop' and public and file_size_limit = 5242880
                 and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']) as ok
union all
select 'มี policy อัปโหลดของ seller',
       exists (select 1 from pg_policies
               where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'coin_shop_seller_upload_product_image');

-- ย้อนกลับ (ถ้าจำเป็น): เอา /* และ */ ออกแล้วรันเฉพาะส่วนนี้
/*
begin;
drop policy if exists coin_shop_seller_upload_product_image on storage.objects;
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'coin_shop';
commit;
*/
