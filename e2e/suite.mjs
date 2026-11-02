import crypto from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright-core';

const APP = process.env.E2E_APP_URL ?? 'http://localhost:3110';
const MOCK = process.env.E2E_MOCK_URL ?? 'http://localhost:54399';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
};
const mock = (p, body) => fetch(MOCK + p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());
const path = (page) => { const u = new URL(page.url()); return u.pathname + u.search; };

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

async function fresh(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.problems.push('console: ' + m.text().slice(0, 160)); });
  return page;
}
async function login(page, email, password = 'pass1234', qs = '') {
  await page.goto(`${APP}/login${qs}`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
}
const has = (page, text) => page.getByText(text, { exact: false }).locator('visible=true').first().isVisible();
const poll = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 150)); } return !!(await fn()); };
const settle = (page) => page.waitForLoadState('networkidle').catch(() => {});

async function step(name, fn) {
  try { await fn(); } catch (e) { check(name + ' (crashed)', false, e.message.split('\n')[0].slice(0, 180)); }
}

await mock('/__reset');

await step('customer', async () => {
  const page = await fresh();
  await login(page, 'customer@test.local');
  await page.waitForURL('**/dashboard');
  await settle(page);
  check('customer login → /dashboard', true);
  check('dashboard shows profile name', await has(page, 'ลูกค้า ทดสอบ'));
  check('dashboard lists products', await has(page, 'ลายดอกบัว'));
  check('dashboard hides inactive product', !(await has(page, 'ลายซ่อน')));
  check('dashboard lists own orders', await has(page, '#101'));

  await page.fill('#quantity-input', '200');
  await page.click('.btn-amber-submit');
  await page.getByText('ส่งรายการสั่งทำ').first().waitFor({ timeout: 5000 });
  await settle(page);
  check('order placed, success message', true);
  check('new order appears after refresh', await poll(() => has(page, '#104')));

  for (const [to, want] of [['/seller', '/dashboard'], ['/seller/orders', '/dashboard'], ['/seller/products', '/dashboard'], ['/admin', '/dashboard']]) {
    await page.goto(APP + to);
    await settle(page);
    check(`customer blocked from ${to}`, new URL(page.url()).pathname === want, path(page));
  }
  await page.goto(APP + '/login');
  await settle(page);
  check('signed-in user at /login → /dashboard', new URL(page.url()).pathname === '/dashboard', path(page));

  await page.getByRole('link', { name: 'สั่งทำลายนี้' }).nth(1).click();
  await page.waitForFunction(() => location.search.includes('product=1'));
  await settle(page);
  const chosen = await page.$eval('#product-select', (e) => e.value);
  check('"สั่งทำลายนี้" selects the product', chosen === '1', `clicked card of product 1, select=${chosen}`);

  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await page.waitForURL('**/login**');
  check('customer sign out', true);
  await page.goto(APP + '/dashboard');
  await settle(page);
  check('session gone after sign out', path(page).startsWith('/login'), path(page));

  await login(page, 'seller@test.local');
  await page.waitForURL('**/seller');
  await settle(page);
  check('same tab: next user sees own area, no stale data', !(await has(page, 'ลูกค้า ทดสอบ')) || (await has(page, 'ผู้ขาย หนึ่ง')));
  check('customer page clean of browser errors', page.problems.length === 0, page.problems.slice(0, 3).join(' | '));
});

await mock('/__reset');
await step('customer applies to become a seller', async () => {
  const CUSTOMER = '00000000-0000-4000-8000-000000000001';
  const roleNow = async () => (await mock('/__state')).profiles.find((p) => p.id === CUSTOMER).role;
  const applyButton = (page) => page.getByRole('button', { name: 'สมัครเป็นร้านค้า', exact: true });

  const page = await fresh();
  await login(page, 'customer@test.local');
  await page.waitForURL('**/dashboard');
  await settle(page);
  check('customer sees apply button', await applyButton(page).isVisible());

  await applyButton(page).click();
  check('apply asks for confirmation', await has(page, 'ยืนยันการสมัครเป็นร้านค้า'));
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  check('cancelling keeps the customer role', (await roleNow()) === 'customer');

  await applyButton(page).click();
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await page.waitForURL('**/seller', { timeout: 5000 });
  await settle(page);
  check('apply saves the seller role', (await roleNow()) === 'seller');
  check('new seller sees applied message', await has(page, 'คุณสมัครร้านค้าเรียบร้อยแล้ว'));
  await page.goto(`${APP}/seller/products`);
  await settle(page);
  check('new seller can open shop management', new URL(page.url()).pathname === '/seller/products', path(page));

  await page.goto(`${APP}/dashboard`);
  await settle(page);
  check('seller opening /dashboard sees applied message', new URL(page.url()).pathname === '/seller' && (await has(page, 'คุณสมัครร้านค้าเรียบร้อยแล้ว')), path(page));
  check('apply page clean of browser errors', page.problems.length === 0, page.problems.slice(0, 3).join(' | '));

  await mock('/__reset');
  const stale = await fresh();
  await login(stale, 'customer@test.local');
  await stale.waitForURL('**/dashboard');
  await settle(stale);
  await mock('/__set', { table: 'profiles', id: CUSTOMER, patch: { role: 'seller' } });
  await applyButton(stale).click();
  await stale.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await stale.waitForURL('**/seller', { timeout: 5000 });
  check('stale tab of a seller moves on to /seller', true);

  await mock('/__reset');
  const blocked = await fresh();
  await login(blocked, 'customer@test.local');
  await blocked.waitForURL('**/dashboard');
  await settle(blocked);
  // What the guard answers until the 20261102 migration is applied.
  await blocked.route('**/rest/v1/profiles*', (route) => (route.request().method() === 'PATCH'
    ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: 'role change not allowed' }) })
    : route.continue()));
  await applyButton(blocked).click();
  await blocked.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await blocked.getByText('สมัครร้านค้าไม่สำเร็จ').first().waitFor({ timeout: 5000 });
  check('rejected apply shows an error and stays on /dashboard', new URL(blocked.url()).pathname === '/dashboard' && (await roleNow()) === 'customer', path(blocked));
  check('button works again after a rejected apply', await applyButton(blocked).isEnabled());

  await mock('/__reset');
  const admin = await fresh();
  await login(admin, 'admin@test.local');
  await admin.waitForURL('**/admin');
  await admin.goto(`${APP}/dashboard`);
  await settle(admin);
  check('admin does not see apply button', (await applyButton(admin).count()) === 0);
});

await mock('/__reset');
await step('seller places an order', async () => {
  const SELLER = '00000000-0000-4000-8000-000000000002';
  const OTHER_SELLER = '00000000-0000-4000-8000-000000000003';
  const page = await fresh();
  await login(page, 'seller@test.local');
  await page.waitForURL('**/seller');
  await settle(page);
  await page.getByRole('link', { name: 'สั่งทำเหรียญ' }).click();
  await page.waitForURL('**/seller/place-order');
  await settle(page);
  check('seller opens order page from overview', true);
  check('seller order page starts with empty history', await has(page, 'ยังไม่มีรายการสั่งทำ'));
  check('seller order page hides inactive product', !(await has(page, 'ลายซ่อน')));

  await page.getByRole('link', { name: 'สั่งทำลายนี้' }).first().click();
  await page.waitForFunction(() => location.search.includes('product=3'));
  await settle(page);
  check('"สั่งทำลายนี้" stays in the seller area', new URL(page.url()).pathname === '/seller/place-order', path(page));
  check('"สั่งทำลายนี้" preselects for seller', (await page.$eval('#product-select', (e) => e.value)) === '3');

  await page.fill('#quantity-input', '50');
  await page.click('.btn-amber-submit');
  await page.getByText('ส่งรายการสั่งทำ').first().waitFor({ timeout: 5000 });
  const order = (await mock('/__state')).orders.at(-1);
  check('seller order goes to the product owner', order.customer_id === SELLER && order.seller_id === OTHER_SELLER && order.total_price === 250, JSON.stringify(order));
  check('seller sees the order in own history', await poll(() => has(page, '#104')));

  await page.goto(`${APP}/seller/orders`);
  await settle(page);
  check('order bought from another shop is not in own queue', !(await has(page, '#104')));

  await page.goto(`${APP}/seller/place-order?product=1`);
  await settle(page);
  await page.fill('#quantity-input', '60');
  await page.click('.btn-amber-submit');
  await page.getByText('ส่งรายการสั่งทำ').first().waitFor({ timeout: 5000 });
  const own = (await mock('/__state')).orders.at(-1);
  check('seller can order from own shop', own.customer_id === SELLER && own.seller_id === SELLER, JSON.stringify(own));
  await page.goto(`${APP}/seller/orders`);
  await settle(page);
  check('own-shop order appears in own queue', await has(page, '#105'));
  check('seller order page clean of browser errors', page.problems.length === 0, page.problems.slice(0, 3).join(' | '));

  const other = await fresh();
  await login(other, 'seller2@test.local');
  await other.waitForURL('**/seller');
  await settle(other);
  await other.goto(`${APP}/seller/orders`);
  await settle(other);
  check('shop receives the order from another seller', await has(other, '#104'));

  const customer = await fresh();
  await login(customer, 'customer@test.local');
  await customer.waitForURL('**/dashboard');
  await settle(customer);
  check('customer order links still use /dashboard', (await customer.getByRole('link', { name: 'สั่งทำลายนี้' }).first().getAttribute('href')).startsWith('/dashboard?'));
  await customer.goto(`${APP}/seller/place-order`);
  await settle(customer);
  check('customer blocked from /seller/place-order', new URL(customer.url()).pathname === '/dashboard', path(customer));

  const guest = await fresh();
  await guest.goto(`${APP}/seller/place-order`);
  await settle(guest);
  check('guest sent to login from /seller/place-order', path(guest).startsWith('/login'), path(guest));
});

await mock('/__reset');
await step('seller orders', async () => {
  const page = await fresh();
  await login(page, 'seller@test.local');
  await page.waitForURL('**/seller');
  await settle(page);
  check('seller login → /seller', true);
  check('seller dashboard shows urgent order', await has(page, '#101'));
  check('seller dashboard excludes other seller order', !(await has(page, '#103')));

  for (const to of ['/admin', '/dashboard']) {
    await page.goto(APP + to);
    await settle(page);
    check(`seller redirected from ${to} → /seller`, new URL(page.url()).pathname === '/seller', path(page));
  }

  await page.goto(`${APP}/seller/orders?status=ready`);
  await settle(page);
  check('status filter from URL', (await has(page, '#102')) && !(await has(page, '#101')));

  await page.goto(`${APP}/seller/orders`);
  await settle(page);
  await page.fill('input[type=search]', 'ไม่มีแน่นอน');
  check('search empty state', await has(page, 'ไม่พบออเดอร์'));
  await page.fill('input[type=search]', '101');
  check('search by order id', (await has(page, '#101')) && !(await has(page, '#102')));
  await page.fill('input[type=search]', '');

  await page.getByRole('button', { name: 'รับออเดอร์', exact: true }).first().click();
  await page.getByText('อัปเดตสถานะออเดอร์ #101').waitFor({ timeout: 5000 });
  check('advance status', (await mock('/__state')).orders.find((o) => o.id === 101).status === 'confirmed');

  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).first().click();
  check('cancel asks for confirmation', await has(page, 'ยืนยันการยกเลิกออเดอร์'));
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await page.getByText('อัปเดตสถานะออเดอร์').first().waitFor({ timeout: 5000 });
  check('confirmed cancel saved', (await mock('/__state')).orders.find((o) => o.id === 101).status === 'cancelled');

  await mock('/__set', { table: 'orders', id: 102, patch: { status: 'completed' } });
  await page.getByRole('button', { name: 'รีเฟรช' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'เรียบร้อย (', exact: false }).first().click();
  check('refresh button shows server changes', await has(page, '#102'), 'order 102 completed by someone else, list checked under "เรียบร้อย"');

  await page.reload();
  await settle(page);
  await page.getByRole('button', { name: 'ทั้งหมด (', exact: false }).click();
  await mock('/__set', { table: 'orders', id: 102, patch: { status: 'cancelled' } });
  await page.locator('div.rounded-2xl', { hasText: '#102' }).last().getByRole('button', { name: 'ยกเลิก', exact: true }).count();
  await mock('/__set', { table: 'orders', id: 102, patch: { status: 'in_production' } });
  await page.reload();
  await settle(page);
  await mock('/__set', { table: 'orders', id: 102, patch: { status: 'ready' } });
  const stale = page.locator('div.rounded-2xl', { hasText: '#102' }).last();
  await stale.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await page.getByText('สถานะถูกเปลี่ยนแล้ว').waitFor({ timeout: 5000 });
  await page.waitForTimeout(1200);
  const label = await page.locator('div.rounded-2xl', { hasText: '#102' }).last().innerText();
  check('stale update: DB untouched and warning shown', (await mock('/__state')).orders.find((o) => o.id === 102).status === 'ready');
  check('stale update: list resyncs to the real status', !label.includes('กำลังผลิต'), 'card still says กำลังผลิต while DB says ready');
  check('seller orders page clean of browser errors', page.problems.length === 0, page.problems.slice(0, 3).join(' | '));
});

await mock('/__reset');
await step('seller products', async () => {
  const page = await fresh();
  await login(page, 'seller@test.local');
  await page.waitForURL('**/seller');
  await page.goto(`${APP}/seller/products`);
  await settle(page);
  check('own products listed', await has(page, 'ลายดอกบัว'));
  check('other seller product NOT listed as own', !(await has(page, 'ลายคนอื่น')), 'RLS active-product rule shows it to all sellers');

  await page.getByRole('button', { name: '+ เพิ่มสินค้า' }).click();
  await page.fill('input[type=text]', 'ลายใหม่');
  await page.fill('input[type=url]', `${MOCK}/img.png`);
  await page.locator('form.space-y-4 button[type=submit]').click();
  await page.getByText('เพิ่มสินค้าเรียบร้อย').waitFor({ timeout: 5000 });
  check('create product', (await mock('/__state')).products.some((p) => p.name === 'ลายใหม่'));

  await settle(page); // let the refresh that follows a create finish first
  await page.waitForTimeout(500);
  await mock('/__set', { table: 'products', id: 1, patch: { seller_id: '00000000-0000-4000-8000-000000000003' } });
  const card = page.locator('div.rounded-2xl', { hasText: 'ลายดอกบัว' }).last();
  await card.getByRole('button', { name: 'ซ่อน', exact: true }).click();
  await page.getByText('ไม่สำเร็จ').first().waitFor({ timeout: 5000 });
  const after = (await mock('/__state')).products.find((p) => p.id === 1);
  const claimed = await has(page, 'เรียบร้อย');
  check('hide a product I no longer own: error shown, never "success"', after.is_active === true && !claimed, `db is_active=${after.is_active}, success toast=${claimed}`);
  // The refresh after the failure re-synced the list: the product I no longer own is gone.
  check('list re-syncs after failed write (lost product disappears)', await poll(async () => !(await has(page, 'ลายดอกบัว'))));
  await mock('/__set', { table: 'products', id: 1, patch: { seller_id: '00000000-0000-4000-8000-000000000002' } });
  await page.reload();
  await settle(page);

  const mine = page.locator('div.rounded-2xl', { hasText: 'ลายดอกบัว' }).last();
  await mine.getByRole('button', { name: 'แก้ไข', exact: true }).click();
  await page.fill('input[type=text]', 'ลายดอกบัวแก้');
  await page.locator('form.space-y-4 button[type=submit]').click();
  await page.getByText('แก้ไขสินค้าเรียบร้อย').waitFor({ timeout: 5000 });
  check('edit own product', (await mock('/__state')).products.find((p) => p.id === 1).name === 'ลายดอกบัวแก้');
  check('seller products page clean of browser errors', page.problems.length === 0, page.problems.slice(0, 3).join(' | '));
});

await mock('/__reset');
await step('seller uploads a product image', async () => {
  const SELLER = '00000000-0000-4000-8000-000000000002';
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const fileInput = (page) => page.locator('input[type=file]');
  const submit = (page) => page.locator('form.space-y-4 button[type=submit]');
  const openCreate = async (page) => {
    await page.getByRole('button', { name: '+ เพิ่มสินค้า' }).click();
    await page.fill('input[type=text]', 'ลายจากเครื่อง');
  };
  const open = async () => {
    const page = await fresh();
    await login(page, 'seller@test.local');
    await page.waitForURL('**/seller');
    await page.goto(`${APP}/seller/products`);
    await settle(page);
    return page;
  };

  const page = await open();
  await openCreate(page);
  await submit(page).click();
  check('no image: asks for one, nothing saved', (await has(page, 'กรุณาเลือกรูปจากเครื่อง')) && !(await mock('/__state')).products.some((p) => p.name === 'ลายจากเครื่อง'));

  await fileInput(page).setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: PNG });
  check('unsupported file type rejected', await has(page, 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP'));
  await fileInput(page).setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  check('file over 5 MB rejected', await has(page, 'ไม่เกิน 5 MB') && (await page.getByText('ไฟล์รูปต้องมีขนาดไม่เกิน').count()) === 1);
  check('rejected files are not uploaded', (await mock('/__state')).uploads.length === 0);

  await fileInput(page).setInputFiles({ name: 'coin.png', mimeType: 'image/png', buffer: PNG });
  check('chosen file name shown', await has(page, 'coin.png'));
  check('local preview before upload', (await page.getByAltText('ตัวอย่างรูป').getAttribute('src')).startsWith('blob:'));
  check('nothing uploaded until save', (await mock('/__state')).uploads.length === 0);

  await submit(page).click();
  await page.getByText('เพิ่มสินค้าเรียบร้อย').waitFor({ timeout: 5000 });
  let state = await mock('/__state');
  const created = state.products.find((p) => p.name === 'ลายจากเครื่อง');
  check('file saved in the seller folder', state.uploads.length === 1 && state.uploads[0].startsWith(`products/${SELLER}/`) && state.uploads[0].endsWith('.png'), state.uploads[0]);
  check('product row stores the public URL', created?.image_url.endsWith(`/storage/v1/object/public/coin_shop/${state.uploads[0]}`), created?.image_url);
  await settle(page);
  const image = page.getByAltText('ลายจากเครื่อง').first();
  check('uploaded image displays on the card', await poll(() => image.evaluate((e) => e.complete && e.naturalWidth > 0)));

  const card = page.locator('div.rounded-2xl', { hasText: 'ลายดอกบัว' }).last();
  await card.getByRole('button', { name: 'แก้ไข', exact: true }).click();
  check('edit shows the current image', (await page.getByAltText('ตัวอย่างรูป').getAttribute('src')).includes('/img.png'));
  await fileInput(page).setInputFiles({ name: 'new.webp', mimeType: 'image/webp', buffer: PNG });
  await submit(page).click();
  await page.getByText('แก้ไขสินค้าเรียบร้อย').waitFor({ timeout: 5000 });
  state = await mock('/__state');
  check('edit replaces the image', state.uploads.length === 2 && state.products.find((p) => p.id === 1).image_url.endsWith('.webp'));
  check('image upload page clean of browser errors', page.problems.length === 0, page.problems.slice(0, 3).join(' | '));

  await mock('/__reset');
  const rejected = await open();
  await rejected.route('**/storage/v1/object/coin_shop/**', (route) => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' }),
  }));
  await openCreate(rejected);
  await fileInput(rejected).setInputFiles({ name: 'coin.png', mimeType: 'image/png', buffer: PNG });
  await submit(rejected).click();
  await rejected.getByText('อัปโหลดรูปไม่สำเร็จ').waitFor({ timeout: 5000 });
  check('rejected upload: error shown, product not saved', !(await mock('/__state')).products.some((p) => p.name === 'ลายจากเครื่อง'));
  check('rejected upload: form stays usable', await submit(rejected).isEnabled());

  await rejected.unroute('**/storage/v1/object/coin_shop/**');
  await rejected.route('**/rest/v1/products*', (route) => (route.request().method() === 'POST'
    ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'boom' }) })
    : route.continue()));
  await submit(rejected).click();
  await rejected.getByText('เพิ่มสินค้าไม่สำเร็จ').first().waitFor({ timeout: 5000 });
  await rejected.unroute('**/rest/v1/products*');
  await submit(rejected).click();
  await rejected.getByText('เพิ่มสินค้าเรียบร้อย').waitFor({ timeout: 5000 });
  state = await mock('/__state');
  check('retry after failed save reuses the upload', state.uploads.length === 1 && state.products.some((p) => p.name === 'ลายจากเครื่อง'), `uploads=${state.uploads.length}`);
});

await mock('/__reset');
await step('admin', async () => {
  const page = await fresh();
  await login(page, 'admin@test.local');
  await page.waitForURL('**/admin');
  await settle(page);
  check('admin login → /admin', true);
  check('admin sees all orders', (await has(page, '#101')) && (await has(page, '#103')));
  check('admin sees customer name via embed', await has(page, 'ลูกค้า ทดสอบ'));

  await page.getByPlaceholder('ค้นหาเลขออเดอร์').fill('ชมพู');
  await page.getByRole('button', { name: /สิทธิ์สมาชิก/ }).click();
  await page.getByRole('button', { name: /จัดการคำสั่งทำ/ }).click();
  check('filter survives tab switch', (await page.getByPlaceholder('ค้นหาเลขออเดอร์').inputValue()) === 'ชมพู');
  await page.getByPlaceholder('ค้นหาเลขออเดอร์').fill('');

  await page.locator('tr', { hasText: '#101' }).locator('select').selectOption('ready');
  await page.getByText('อัปเดตสถานะออเดอร์ #101').waitFor({ timeout: 5000 });
  await settle(page);
  check('admin updates order status', (await mock('/__state')).orders.find((o) => o.id === 101).status === 'ready');

  await page.getByRole('button', { name: /สิทธิ์สมาชิก/ }).click();
  await page.locator('tr', { hasText: 'ลูกค้า ทดสอบ' }).getByRole('button', { name: /เลื่อนเป็น Seller/ }).click();
  check('role modal opens', await has(page, 'ยืนยันการเปลี่ยนบทบาทผู้ใช้'));
  await page.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์' }).click();
  check('role change saved', await poll(async () => (await mock('/__state')).profiles.find((p) => p.username === 'cust').role === 'seller'));
  await settle(page);

  await page.goto(`${APP}/seller`);
  await settle(page);
  check('admin at /seller → /admin', new URL(page.url()).pathname === '/admin', path(page));
  await page.goto(`${APP}/dashboard`);
  await settle(page);
  check('admin can open /dashboard with all orders', new URL(page.url()).pathname === '/dashboard' && (await has(page, '#103')));
  check('admin page clean of browser errors', page.problems.length === 0, page.problems.slice(0, 3).join(' | '));
});

await mock('/__reset');
await step('auth', async () => {
  const page = await fresh();
  await login(page, 'customer@test.local', 'wrong-password');
  await page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง').waitFor({ timeout: 5000 });
  check('wrong password message', true);

  await login(page, 'customer@test.local', 'pass1234', '?redirectTo=/dashboard');
  await page.waitForURL('**/dashboard');
  check('redirectTo honoured', true);

  const evil = await fresh();
  await login(evil, 'customer@test.local', 'pass1234', '?redirectTo=https://evil.example/x');
  await evil.waitForURL('**/dashboard', { timeout: 5000 });
  check('external redirectTo ignored', true);

  const proto = await fresh();
  await login(proto, 'customer@test.local', 'pass1234', '?redirectTo=//evil.example/x');
  await proto.waitForTimeout(1500);
  check('protocol-relative redirectTo ignored', new URL(proto.url()).host === 'localhost:3110', proto.url());

  const root = await fresh();
  await root.goto(APP + '/');
  await settle(root);
  check('home page lands without error param', !path(root).includes('error='), path(root));

  await mock('/__ttl', { 'short@test.local': 1 });
  const s = await fresh();
  await login(s, 'short@test.local');
  await s.waitForURL('**/dashboard');
  await settle(s);
  await s.waitForTimeout(2500);
  await s.goto(APP + '/dashboard');
  await settle(s);
  check('expired token refreshed by proxy, stays signed in', new URL(s.url()).pathname === '/dashboard' && (await has(s, 'โทเคนสั้น')), path(s));

  const reg = async (email, username, password = 'pass1234', wait = 2500) => {
    const p = await fresh();
    await p.goto(APP + '/register');
    const inputs = p.locator('form input');
    await inputs.nth(0).fill(username);
    await inputs.nth(1).fill('ชื่อ ทดสอบ');
    await inputs.nth(2).fill('0899999999');
    await inputs.nth(3).fill(email);
    await inputs.nth(4).fill(password);
    await p.click('button[type=submit]');
    await p.waitForTimeout(wait);
    return p;
  };
  const ok = await reg('new@test.local', 'newuser');
  await settle(ok);
  check('register new user → /dashboard', new URL(ok.url()).pathname === '/dashboard', path(ok));

  const dupEmail = await reg('customer@test.local', 'another1', 'different-pass', 600);
  const dupText = await dupEmail.locator('body').innerText();
  await dupEmail.waitForTimeout(2200);
  check('duplicate email: clear Thai error, stays on /register', dupText.includes('อีเมลนี้ถูกใช้งานแล้ว') && !dupText.includes('สมัครสมาชิกสำเร็จ') && path(dupEmail) === '/register', `url=${path(dupEmail)}`);

  const dupName = await reg('other@test.local', 'cust');
  const nameText = (await dupName.locator('body').innerText());
  check('duplicate username: clear Thai error', nameText.includes('user_name นี้ถูกใช้งานแล้ว') && !nameText.includes('Database error'), nameText.split('\n').find((l) => /error|ถูกใช้งาน/i.test(l)) ?? '');
});

await mock('/__reset');
await step('callback & forged tokens', async () => {
  // A real code exchange (the mock accepts any PKCE code), then check where it lands.
  // Let the SDK create the real PKCE verifier cookies (names differ between SDK versions).
  const jar = new Map();
  const sdk = createServerClient(MOCK, 'mock-anon-key', {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await sdk.auth.signInWithOAuth({ provider: 'github', options: { skipBrowserRedirect: true } });
  const verifier = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  for (const [next, want] of [['/seller/orders?status=ready', '/seller/orders?status=ready'], ['@evil.example/x', '/dashboard'], ['//evil.example', '/dashboard'], ['https://evil.example', '/dashboard'], ['/\\evil.example', '/dashboard']]) {
    const r = await fetch(`${APP}/auth/callback?code=abc&next=${encodeURIComponent(next)}`, { redirect: 'manual', headers: { cookie: verifier } });
    const loc = r.headers.get('location') ?? '';
    const u = loc ? new URL(loc) : null;
    check(`callback next=${JSON.stringify(next)} stays on site`, !!u && u.host === new URL(APP).host && u.pathname + u.search === want, loc || `status ${r.status}`);
  }

  const signIn = async (email) => (await fetch(`${MOCK}/auth/v1/token?grant_type=password`, { method: 'POST', body: JSON.stringify({ email, password: 'pass1234' }) })).json();
  const cookieFrom = (session) => 'sb-localhost-auth-token=base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
  const probe = async (label, cookie, want) => {
    for (const p of ['/dashboard', '/seller', '/seller/orders', '/seller/products', '/admin']) {
      const r = await fetch(APP + p, { redirect: 'manual', headers: { cookie } });
      const loc = r.headers.get('location') ?? '';
      check(`${label} → ${p}`, want(r.status, loc), `${r.status} ${loc}`);
    }
  };
  const toLogin = (status, loc) => status === 307 && loc.includes('/login');

  const real = await signIn('customer@test.local');
  await probe('valid customer token', cookieFrom(real), (st, loc) => (st === 200) || (st === 307 && !loc.includes('/login')));

  // signature from a different key, same kid and claims
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const [h, p] = real.access_token.split('.');
  const forgedSig = crypto.sign('sha256', Buffer.from(`${h}.${p}`), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  await probe('token signed by another key', cookieFrom({ ...real, access_token: `${h}.${p}.${forgedSig}` }), toLogin);

  // real signature, but payload edited to the admin's id
  const claims = JSON.parse(Buffer.from(p, 'base64url'));
  const tamperedPayload = b64({ ...claims, sub: '00000000-0000-4000-8000-000000000004', email: 'admin@test.local' });
  await probe('payload edited to admin id', cookieFrom({ ...real, access_token: `${h}.${tamperedPayload}.${real.access_token.split('.')[2]}` }), toLogin);

  // alg "none"
  const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...claims, sub: '00000000-0000-4000-8000-000000000004' })}.`;
  await probe('alg none token', cookieFrom({ ...real, access_token: none }), toLogin);

  await probe('garbage cookie', 'sb-localhost-auth-token=base64-bm90LWpzb24', toLogin);
});

await mock('/__reset');
await step('input limits', async () => {
  const page = await fresh();
  await login(page, 'customer@test.local');
  await page.waitForURL('**/dashboard');
  await settle(page);
  const before = (await mock('/__state')).orders.length;
  await page.fill('#quantity-input', '10');
  await page.click('.btn-amber-submit');
  await page.waitForTimeout(1000);
  const n = (await mock('/__state')).orders.length;
  check('quantity below minimum (50) rejected', n === before, `quantity 10 accepted=${n > before}`);
  await page.fill('#quantity-input', '50');
  await page.click('.btn-amber-submit');
  await page.getByText('ส่งรายการสั่งทำ').first().waitFor({ timeout: 5000 });
  check('quantity at the minimum (50) accepted', (await mock('/__state')).orders.length === before + 1);

  await page.fill('#quantity-input', '1000000');
  await page.click('.btn-amber-submit');
  await page.waitForTimeout(1000);
  check('absurd quantity (1,000,000) rejected', !(await mock('/__state')).orders.some((o) => o.quantity === 1000000));
});

await mock('/__reset');
await step('round trips', async () => {
  for (const [email, to] of [['customer@test.local', '/dashboard'], ['seller@test.local', '/seller'], ['admin@test.local', '/admin']]) {
    const page = await fresh();
    await login(page, email);
    await page.waitForURL('**' + to);
    await settle(page);
    await mock('/__count');
    await page.goto(APP + to);
    await settle(page);
    const calls = await mock('/__count');
    const api = calls.filter((c) => !c.includes('jwks'));
    console.log(`INFO  ${to}: ${api.length} Supabase calls`, JSON.stringify(api));
    check(`${to} makes no Supabase Auth call per page`, !api.some((c) => c.includes('/auth/v1/user')));
  }
});

await step('mobile layout', async () => {
  for (const [email, to] of [['customer@test.local', '/dashboard'], ['seller@test.local', '/seller'], ['seller@test.local', '/seller/orders'], ['seller@test.local', '/seller/products'], ['seller@test.local', '/seller/place-order'], ['admin@test.local', '/admin']]) {
    const page = await fresh({ width: 375, height: 700 });
    await login(page, email);
    await page.waitForLoadState('load');
    await page.waitForTimeout(800);
    await page.goto(APP + to);
    await settle(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`no horizontal scroll at 375px ${to}`, over <= 0, `overflow=${over}px`);
  }
  for (const to of ['/login', '/register']) {
    const page = await fresh({ width: 375, height: 700 });
    await page.goto(APP + to);
    await settle(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`no horizontal scroll at 375px ${to}`, over <= 0, `overflow=${over}px`);
  }
});

await browser.close();
const fail = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - fail.length}/${results.length} passed ===`);
fail.forEach((f) => console.log(`FAIL  ${f.name}  → ${f.detail}`));
process.exit(fail.length ? 1 : 0);
