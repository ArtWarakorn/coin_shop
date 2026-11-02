<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- The Next.js block above is managed by `next dev`. Project notes live below it. -->

# Coin Shop: Pre-production checklist

สถานะ ณ 2026-11-01: โค้ดผ่าน `tsc`, `npm run lint`, `npm test` และ `npm run test:e2e` (101 ข้อ) แต่ E2E รันบน Supabase **จำลอง** (`e2e/mock-supabase.mjs`) ยังไม่เคยทดสอบกับ Supabase จริง ให้ทำรายการด้านล่างให้ครบก่อนขึ้น production ติ๊ก `[x]` เมื่อทำเสร็จและบันทึกวันที่/ผู้ทำท้ายบรรทัด

โปรเจกต์ Supabase: `gokzdfwrblvrnllyorel` (schema `coin_shop`) **ใช้ร่วมกับแอปอื่น** (`KTXA`, `financ`, `classroom`, `workpage`, `public`) ห้ามแก้ schema อื่นโดยไม่ถามเจ้าของ

## 0. คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm test` | unit test (redirect, กฎจำนวนสั่ง) |
| `npm run test:e2e` | E2E ด้วย Chrome จริง + Supabase จำลอง (build แยกที่ `.next-e2e` ไม่ชนกับ `next dev`) |
| `npx tsc --noEmit && npm run lint` | ตรวจ type และ lint |
| `npm run build && npm start` | ทดสอบแบบ production ในเครื่อง |

## 1. เตรียมสภาพแวดล้อมทดสอบ (ห้ามทดสอบมือบน production DB)

- [ ] สร้าง Supabase **branch** จาก project ข้างต้น (หรือ project ทดสอบแยก) แล้วจดชื่อ branch
- [ ] รัน migration บน branch ตามลำดับ:
  - [ ] `supabase/migrations/20261101000000_coin_shop_scaling.sql` (RLS ประเมินครั้งเดียวต่อ query + index)
  - [ ] `supabase/migrations/20261101000100_order_rules_and_hardening.sql` (CHECK จำนวนสั่ง 50–100,000 + `search_path`)
  - [ ] `supabase/migrations/20261102000000_self_service_seller.sql` (ให้ customer สมัครเป็น seller เองได้)
- [ ] เช็กข้อมูลก่อนรัน CHECK: `select min(quantity), max(quantity) from coin_shop.orders;` ต้องอยู่ในช่วง 50–100,000 (ตรวจ 2026-11-01 แล้ว: 50–100)
- [ ] ชี้ `.env.local` ไปที่ branch (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_SCHEMA=coin_shop`) **ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY`** โค้ดไม่ได้ใช้
- [ ] สร้างบัญชีทดสอบ 3 บัญชีผ่านหน้า `/register` แล้วเลื่อน role บน branch ด้วย SQL: ลูกค้า 1 (customer), ผู้ขาย 2 คน (seller), แอดมิน 1 (admin) และสร้างสินค้าอย่างน้อย 1 ชิ้นต่อผู้ขาย
- [ ] รัน `npm run build && npm start` แล้วทดสอบที่ `http://localhost:3000`

## 2. ทดสอบมือกับ Supabase จริง

### 2.1 สมัครและเข้าสู่ระบบ
- [ ] สมัครผู้ใช้ใหม่ → ไป `/dashboard` และมีแถวใน `coin_shop.profiles` role = `customer`
- [ ] สมัครด้วย **อีเมลซ้ำ** → เห็น "อีเมลนี้ถูกใช้งานแล้ว…" และไม่ถูกพาไปหน้า login (ผลจำลองอาจต่างจากของจริง บันทึกข้อความที่เห็นจริงไว้ท้ายข้อ)
- [ ] สมัครด้วย **user_name ซ้ำ** (ต่างตัวพิมพ์เล็ก/ใหญ่ก็ถือว่าซ้ำ) → เห็น "user_name นี้ถูกใช้งานแล้ว…" ไม่ใช่ `Database error saving new user`
- [ ] รหัสผ่านสั้นกว่า 6 ตัว / อีเมลผิดรูปแบบ → error ภาษาไทย
- [ ] login ผิดรหัส → "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
- [ ] login ถูก: customer → `/dashboard`, seller → `/seller`, admin → `/admin`
- [ ] `/login?redirectTo=/dashboard` กลับไปหน้าที่ขอ และ `?redirectTo=https://example.com` กับ `?redirectTo=//example.com` ถูกเพิกเฉย
- [ ] sign out แล้วเปิด `/dashboard` → เด้งไป `/login`
- [ ] ปิด tab ทิ้งไว้เกิน 1 ชั่วโมง (อายุ JWT) แล้วเปิดใหม่ → ยังเข้าระบบอยู่ (token ถูกต่ออายุ)
- [ ] วัดเวลา login (กด → เข้าหน้าได้) บันทึก: ______ วินาที (ก่อนปรับ "ช้ามาก")

### 2.2 ลูกค้า (customer)
- [ ] เห็นเฉพาะสินค้าที่เปิดขาย และเฉพาะออเดอร์ของตัวเอง
- [ ] กด "สั่งทำลายนี้" → เลื่อนไปฟอร์มสั่งและเลือกลายนั้น
- [ ] สั่ง 50 ชิ้น → สำเร็จ, ออเดอร์ใหม่ขึ้นในประวัติ, ราคารวม = จำนวน × ราคาต่ออัน, `seller_id` และกำหนดส่ง (+5 วัน) ถูกใส่โดย trigger
- [ ] สั่ง 49 ชิ้น และ 100,001 ชิ้น → ถูกปฏิเสธ
- [ ] สั่งผ่านคอนโซล/API ด้วย `quantity = 1000000` → ถูกปฏิเสธโดยฐานข้อมูล (ต้องรัน migration ข้อ 1 แล้ว)
- [ ] เปิด `/seller`, `/seller/orders`, `/seller/products`, `/admin` → ถูกส่งกลับ `/dashboard`
- [ ] กด "สมัครเป็นร้านค้า" แล้วยืนยัน → `role` เป็น `seller`, ไปหน้า `/seller` และเห็น "คุณสมัครร้านค้าเรียบร้อยแล้ว" (ต้องรัน migration `…20261102…` แล้ว)
- [ ] seller เปิด `/dashboard` → ถูกส่งไป `/seller` และเห็นข้อความเดียวกัน

### 2.3 ผู้ขาย (seller)
- [ ] `/seller` แสดงจำนวนตามสถานะและรายการ "ใกล้ครบกำหนด" (≤ 2 วัน) ถูกต้อง
- [ ] เห็นเฉพาะออเดอร์ของตัวเอง ไม่เห็นออเดอร์ของผู้ขายอีกคน
- [ ] `/seller/orders?status=ready` กรองตามสถานะ, ค้นหาด้วยเลขออเดอร์/ชื่อลูกค้า/ชื่อลาย
- [ ] เลื่อนสถานะ pending → confirmed → in_production → ready → completed ได้ทีละขั้น และฐานข้อมูลเปลี่ยนจริง
- [ ] ยกเลิก/ส่งมอบ มีกล่องยืนยันก่อน
- [ ] เปิด 2 หน้าต่าง เปลี่ยนสถานะออเดอร์เดียวกันทั้งคู่ → หน้าต่างหลังเห็น "สถานะถูกเปลี่ยนแล้ว" และการ์ดอัปเดตเป็นสถานะจริง
- [ ] ปุ่ม "รีเฟรช" ดึงข้อมูลใหม่จากเซิร์ฟเวอร์
- [ ] `/seller/products` เห็นเฉพาะสินค้าของตัวเอง; เพิ่ม/แก้/ซ่อน/เปิดขายได้ และ `seller_id` ถูกใส่เป็นตัวเอง
- [ ] ใช้ URL รูปที่ไม่ใช่ http/https → ถูกปฏิเสธ
- [ ] เพิ่ม/แก้สินค้าด้วยการเลือกรูปจากเครื่อง → รูปขึ้นทั้งหน้าร้านและหน้า `/dashboard` และไฟล์อยู่ใน bucket `coin_shop` ใต้ `products/<seller id>/` (ต้องรัน `…20261102000100_…` แล้ว)
- [ ] เปิด `/admin` และ `/dashboard` → ถูกส่งกลับ `/seller`
- [ ] `/seller/place-order` สั่งลายของผู้ขายอีกคน → `customer_id` เป็นตัวเอง, `seller_id` เป็นเจ้าของลาย, ออเดอร์ขึ้นในประวัติของตัวเองและในคิวของร้านนั้น
- [ ] `/seller/place-order` สั่งลายของตัวเอง → ออเดอร์ขึ้นทั้งในประวัติและใน `/seller/orders`

### 2.4 แอดมิน (admin)
- [ ] `/admin` เห็นออเดอร์ทั้งหมด พร้อมชื่อ/เบอร์ลูกค้า และตัวเลขสรุปถูกต้อง
- [ ] เปลี่ยนสถานะออเดอร์ได้ทุกสถานะ
- [ ] เลื่อน customer → seller, seller → customer, ตั้งเป็น admin ได้ และมีกล่องยืนยัน
- [ ] ลดสิทธิ์บัญชีตัวเองไม่ได้
- [ ] เปิด `/seller` → ถูกส่งไป `/admin`; เปิด `/dashboard` ได้ และเห็นออเดอร์ทั้งหมด
- [ ] ค้นหา/กรองยังอยู่เมื่อสลับแท็บ

### 2.5 ความปลอดภัย
- [ ] `/auth/callback?code=x&next=@example.com/x` และ `next=//example.com` ไม่พาไปเว็บอื่น
- [x] ใช้ anon key เรียก REST ตรง: `orders` และ `profiles` ต้องได้ `permission denied`; `products` เห็นเฉพาะที่ `is_active = true` (2026-11-02, Claude)
- [ ] ผู้ใช้ customer เรียก `update` บน `orders` ผ่านคอนโซล → ถูกปฏิเสธ
- [ ] ผู้ใช้ customer ตั้ง `profiles.role = 'admin'` และ seller ตั้ง `role` เป็นค่าอื่น ผ่านคอนโซล → ถูกปฏิเสธ (อนุญาตเฉพาะ customer → seller)
- [ ] `/api/auth/*` ส่ง body ผิดรูปแบบ → ได้ 400/415 ไม่ใช่ 500
- [x] `npm audit --omit=dev` ไม่มีช่องโหว่ (2026-11-02, Claude)
- [x] ไม่มี secret ถูก commit (`git log -p | grep -i service_role`) และ `.env*` อยู่ใน `.gitignore` (2026-11-02, Claude)

### 2.6 อื่นๆ
- [ ] หน้า `/login`, `/register`, `/dashboard`, `/seller/*`, `/admin` ไม่มี scroll แนวนอนที่จอ 375px
- [ ] เปิด DevTools Console ทุกหน้า ไม่มี error
- [ ] `/api/health/database` ตอบ `ok`

## 3. Supabase dashboard

- [ ] Auth → Providers → Email: เปิด **Leaked password protection**
- [ ] Auth → URL Configuration: ตั้ง **Site URL** และ **Redirect URLs** เป็นโดเมน production (ไม่งั้น `/auth/callback` ใช้ไม่ได้)
- [ ] ตัดสินใจเรื่องการยืนยันอีเมล (เปิด/ปิด) และทดสอบข้อ 2.1 ซ้ำตามค่าที่เลือก
- [ ] ตรวจ rate limit ของ Auth (sign-in/sign-up ต่อ IP) ให้เหมาะกับจำนวนผู้ใช้ เพราะทุก login ออกจาก IP ของเซิร์ฟเวอร์เดียว
- [ ] เปิด backup/PITR ตามแผน (ตรวจใน dashboard)
- [x] รัน advisors ซ้ำหลัง migration: ต้องไม่มี `auth_rls_initplan` และ `function_search_path_mutable` ของ `coin_shop` (2026-11-02, Claude)

## 4. ก่อน merge migration เข้า production

- [ ] ทุกข้อใน 2.x ผ่านบน branch และเทียบสิทธิ์ของทั้ง 3 role แล้วเหมือนเดิม
- [x] รัน `supabase/coin_shop_all_changes.sql` บน project จริงผ่าน SQL Editor (รวม migration ทั้ง 3 ไฟล์ไว้แล้ว รันซ้ำได้ และมี rollback อยู่ท้ายไฟล์) ห้ามรันไฟล์แยกซ้ำหลังจากนี้ เพราะ `…000100_…` จะ error ว่า constraint มีอยู่แล้ว (2026-11-02, เจ้าของโปรเจกต์)
- [ ] รันข้อ 2.1–2.5 แบบเร็ว (smoke) บน production อีกรอบด้วยบัญชีทดสอบ แล้วลบบัญชี/ออเดอร์ทดสอบ

## 5. Deploy

- [ ] ตั้ง env บน hosting: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_SCHEMA=coin_shop` (ไม่ต้องใส่ service role)
- [ ] `npm run build` ผ่านบน CI/hosting และ `npm run test:e2e` ผ่านก่อน deploy
- [ ] มีแผน rollback (รุ่นก่อนหน้า + rollback SQL)
- [ ] ตั้ง monitoring/error tracking และแจ้งเตือนเมื่อ `/api/health/database` ล้ม

## 6. งานที่ยังไม่ได้ทำ (ไม่บล็อกวันเปิด แต่ต้องทำก่อนผู้ใช้เยอะ)

- [ ] **pagination/ค้นหาฝั่งเซิร์ฟเวอร์** ของ `/admin` และ `/seller/orders`: ตอนนี้โหลดทั้งหมด Supabase ตัดที่ 1,000 แถวโดยเงียบๆ ทำให้ตัวเลขสรุปผิด ต้องเพิ่ม RPC/view ฝั่ง DB และดึงตัวเลขสรุปแยก
- [ ] **rate limit ที่ `/api/auth/login` และ `/api/auth/register`** ฝั่งแอป
- [ ] **ทดสอบ load** (เช่น k6) เพื่อหาเพดานจริง
- [ ] **RLS ปิดอยู่ 7 ตารางของ schema อื่น** (`classroom.*`, `financ.categories`, `public.users`): ไม่ใช่ของโปรเจกต์นี้ ต้องให้เจ้าของแอปนั้นยืนยันก่อนเปิด

## 7. ข้อควรรู้เมื่อพัฒนาต่อ

- ทุกหน้าที่ต้อง login ให้เรียก `requireUser()` / `requireRole()` จาก `src/lib/auth/session.ts` เอง (layout ไม่ได้กัน page ลูก) `proxy.ts` ทำแค่ตรวจ JWT ในเครื่องและต่ออายุ token ห้ามเพิ่ม query ฐานข้อมูลลงใน proxy
- query ฝั่งเซิร์ฟเวอร์รวมอยู่ที่ `src/lib/data/*` การเขียนจากเบราว์เซอร์ต้อง `.select('id')` แล้วเช็กว่ามีแถวถูกแก้จริง (RLS กรองแถวออกโดยไม่ error)
- กฎจำนวนสั่งอยู่ที่ `src/lib/orders/rules.ts` และต้องตรงกับ CHECK ใน migration `…000100_…`
- redirect ที่รับค่าจากผู้ใช้ต้องผ่าน `safeRedirectPath()` (`src/lib/auth/redirect.ts`)
- `next build` ที่ใช้ `NEXT_DIST_DIR` จะเขียนทับ `tsconfig.json` ให้ใช้ `npm run test:e2e` (คืนไฟล์ให้เอง) ไม่ build ด้วยมือ
