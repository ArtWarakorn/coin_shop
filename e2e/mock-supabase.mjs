// Local in-memory stand-in for Supabase (Auth + PostgREST). Policies mirror coin_shop RLS.
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.MOCK_PORT ?? 54399);
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const KID = 'mock-key';
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'ES256', use: 'sig', key_ops: ['verify'] };
const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const day = (n) => new Date(Date.now() + n * 86400000).toISOString();

const uid = (n) => `00000000-0000-4000-8000-00000000000${n}`;
const C = uid(1), S1 = uid(2), S2 = uid(3), A = uid(4), SHORT = uid(5);

let state, requests = [], ttl = {};
function reset() {
  state = {
    users: {
      'customer@test.local': { id: C, password: 'pass1234', meta: { username: 'cust' } },
      'seller@test.local': { id: S1, password: 'pass1234', meta: { username: 'sell' } },
      'seller2@test.local': { id: S2, password: 'pass1234', meta: { username: 'sell2' } },
      'admin@test.local': { id: A, password: 'pass1234', meta: { username: 'adm' } },
      'short@test.local': { id: SHORT, password: 'pass1234', meta: { username: 'short' } },
    },
    profiles: [
      { id: C, username: 'cust', full_name: 'ลูกค้า ทดสอบ', phone: '0811111111', role: 'customer', created_at: day(-9), updated_at: day(-9) },
      { id: S1, username: 'sell', full_name: 'ผู้ขาย หนึ่ง', phone: '0822222222', role: 'seller', created_at: day(-8), updated_at: day(-8) },
      { id: S2, username: 'sell2', full_name: 'ผู้ขาย สอง', phone: '0833333333', role: 'seller', created_at: day(-7), updated_at: day(-7) },
      { id: A, username: 'adm', full_name: 'แอดมิน ระบบ', phone: '0844444444', role: 'admin', created_at: day(-6), updated_at: day(-6) },
      { id: SHORT, username: 'short', full_name: 'โทเคนสั้น', phone: '0855555555', role: 'customer', created_at: day(-5), updated_at: day(-5) },
    ],
    products: [
      { id: 1, name: 'ลายดอกบัว', image_url: 'http://localhost:54399/img.png', description: 'd1', price: 3.5, is_active: true, seller_id: S1, created_at: day(-3), updated_at: day(-3) },
      { id: 2, name: 'ลายซ่อน', image_url: 'http://localhost:54399/img.png', description: null, price: 4, is_active: false, seller_id: S1, created_at: day(-2), updated_at: day(-2) },
      { id: 3, name: 'ลายคนอื่น', image_url: 'http://localhost:54399/img.png', description: 'd3', price: 5, is_active: true, seller_id: S2, created_at: day(-1), updated_at: day(-1) },
    ],
    orders: [
      { id: 101, customer_id: C, product_id: 1, seller_id: S1, color: 'ทอง', quantity: 100, total_price: 350, customer_note: 'โน้ต1', status: 'pending', due_date: day(1), created_at: day(-4), updated_at: day(-4) },
      { id: 102, customer_id: C, product_id: 1, seller_id: S1, color: 'เงิน', quantity: 50, total_price: 175, customer_note: null, status: 'ready', due_date: day(4), created_at: day(-3), updated_at: day(-3) },
      { id: 103, customer_id: C, product_id: 3, seller_id: S2, color: 'ชมพู', quantity: 20, total_price: 100, customer_note: null, status: 'pending', due_date: day(3), created_at: day(-2), updated_at: day(-2) },
    ],
  };
  requests = [];
  ttl = {};
}
reset();

function sign(user, email) {
  const exp = Math.floor(Date.now() / 1000) + (ttl[email] ?? 3600);
  const claims = {
    sub: user.id, aud: 'authenticated', role: 'authenticated', email, exp, iat: exp - 3600,
    iss: `http://localhost:${PORT}/auth/v1`, session_id: crypto.randomUUID(), user_metadata: user.meta, app_metadata: {},
  };
  const head = `${b64({ alg: 'ES256', typ: 'JWT', kid: KID })}.${b64(claims)}`;
  const sig = crypto.sign('sha256', Buffer.from(head), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return { token: `${head}.${sig.toString('base64url')}`, exp };
}
function verify(token) {
  try {
    const [h, p, s] = token.split('.');
    const ok = crypto.verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
    const claims = JSON.parse(Buffer.from(p, 'base64url'));
    return ok && claims.exp * 1000 > Date.now() ? claims : null;
  } catch { return null; }
}
const userObj = (u, email) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email, user_metadata: u.meta, app_metadata: {}, created_at: day(-1) });
function session(email) {
  const u = state.users[email];
  const { token, exp } = sign(u, email);
  return { access_token: token, refresh_token: b64(email), token_type: 'bearer', expires_in: exp - Math.floor(Date.now() / 1000), expires_at: exp, user: userObj(u, email) };
}

const roleOf = (id) => state.profiles.find((p) => p.id === id)?.role;
const visible = {
  profiles: (r, u) => r.id === u || roleOf(u) === 'admin',
  orders: (r, u) => r.customer_id === u || r.seller_id === u || roleOf(u) === 'admin',
  products: (r, u) => r.is_active || r.seller_id === u || roleOf(u) === 'admin',
};
const writable = {
  profiles: (r, u) => r.id === u || roleOf(u) === 'admin',
  orders: (r, u) => roleOf(u) === 'admin' || (roleOf(u) === 'seller' && r.seller_id === u),
  products: (r, u) => roleOf(u) === 'admin' || (roleOf(u) === 'seller' && r.seller_id === u),
};
function filterRows(rows, q) {
  for (const [k, v] of q) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    const [op, ...rest] = v.split('.');
    const val = rest.join('.');
    if (op === 'eq') rows = rows.filter((r) => String(r[k]) === val);
  }
  return rows;
}
function embed(rows, select) {
  return rows.map((r) => {
    const o = { ...r };
    if (/product:products/.test(select)) o.product = state.products.find((p) => p.id === r.product_id) ?? null;
    if (/customer:profiles/.test(select)) o.customer = state.profiles.find((p) => p.id === r.customer_id) ?? null;
    return o;
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  if (req.method === 'OPTIONS') return send(res, 204);
  const raw = await new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });
  const body = raw ? JSON.parse(raw) : {};

  if (path === '/img.png') {
    res.writeHead(200, { 'content-type': 'image/png', 'access-control-allow-origin': '*' });
    return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
  }
  if (path === '/__reset') { reset(); return send(res, 200, {}); }
  if (path === '/__count') { const c = requests; requests = []; return send(res, 200, c); }
  if (path === '/__ttl') { Object.assign(ttl, body); return send(res, 200, {}); }
  if (path === '/__set') { const r = state[body.table].find((x) => x.id === body.id); Object.assign(r, body.patch); return send(res, 200, r); }
  if (path === '/__state') return send(res, 200, state);
  requests.push(`${req.method} ${path}`);

  const bearer = (req.headers.authorization ?? '').replace('Bearer ', '');
  const me = verify(bearer)?.sub ?? null;

  if (path === '/auth/v1/.well-known/jwks.json') return send(res, 200, { keys: [jwk] });
  if (path === '/auth/v1/token') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'pkce') return send(res, 200, session('customer@test.local'));
    const email = grant === 'refresh_token' ? Buffer.from(body.refresh_token, 'base64url').toString() : body.email;
    const u = state.users[email];
    if (!u || (grant === 'password' && u.password !== body.password)) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    if (grant === 'refresh_token') ttl[email] = 3600;
    return send(res, 200, session(email));
  }
  if (path === '/auth/v1/signup') {
    // Behaviours below follow Supabase: a taken email returns a fake user with no error;
    // a username clash inside the trigger surfaces as a 500 "Database error saving new user".
    if (state.users[body.email]) return send(res, 200, { id: crypto.randomUUID(), aud: 'authenticated', role: '', email: body.email, user_metadata: {}, app_metadata: {}, identities: [], created_at: day(0) });
    const name = (body.data?.username ?? '').trim().toLowerCase();
    if (state.profiles.some((p) => p.username.trim().toLowerCase() === name)) return send(res, 500, { code: 500, error_code: 'unexpected_failure', msg: 'Database error saving new user' });
    const id = crypto.randomUUID();
    state.users[body.email] = { id, password: body.password, meta: body.data };
    state.profiles.push({ id, username: body.data.username, full_name: body.data.full_name, phone: body.data.phone, role: 'customer', created_at: day(0), updated_at: day(0) });
    return send(res, 200, session(body.email));
  }
  if (path === '/auth/v1/logout') return send(res, 204);
  if (path === '/auth/v1/user') {
    const c = verify(bearer);
    if (!c) return send(res, 401, { msg: 'invalid token' });
    return send(res, 200, userObj(state.users[c.email], c.email));
  }

  if (path === '/rest/v1/rpc/seller_orders') {
    const rows = state.orders
      .filter((o) => roleOf(me) === 'admin' || (roleOf(me) === 'seller' && o.seller_id === me))
      .map((o) => {
        const p = state.products.find((x) => x.id === o.product_id);
        const c = state.profiles.find((x) => x.id === o.customer_id);
        return { ...o, days_left: Math.ceil((new Date(o.due_date) - Date.now()) / 86400000), product_name: p.name, product_image: p.image_url, customer_name: c.full_name, customer_phone: c.phone };
      });
    return send(res, 200, rows);
  }

  const table = path.replace('/rest/v1/', '');
  if (!state[table]) return send(res, 404, { message: 'no table' });
  const q = url.searchParams;
  const single = (req.headers.accept ?? '').includes('vnd.pgrst.object');
  const prefer = req.headers.prefer ?? '';
  const select = q.get('select') ?? '*';
  const out = (rows, status = 200) => {
    if (!prefer.includes('return=representation') && req.method !== 'GET') return send(res, status === 201 ? 201 : 204);
    if (single) return rows.length ? send(res, status, rows[0]) : send(res, 406, { code: 'PGRST116', message: 'no rows', details: 'The result contains 0 rows' });
    return send(res, status, rows);
  };

  if (req.method === 'GET') {
    let rows = filterRows(state[table].filter((r) => visible[table](r, me)), q);
    if ((q.get('order') ?? '').startsWith('created_at.desc')) rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return out(embed(rows, select));
  }
  if (req.method === 'PATCH') {
    const rows = filterRows(state[table].filter((r) => visible[table](r, me) && writable[table](r, me)), q);
    rows.forEach((r) => Object.assign(r, body, { updated_at: day(0) }));
    return out(rows);
  }
  if (req.method === 'POST') {
    const row = Array.isArray(body) ? body[0] : body;
    const exists = state[table].find((r) => r.id === row.id);
    if (table === 'profiles' && prefer.includes('merge-duplicates') && exists) { Object.assign(exists, row); return out([exists], 201); }
    if (table === 'orders') {
      if (row.customer_id !== me) return send(res, 403, { code: '42501', message: 'new row violates row-level security policy' });
      const p = state.products.find((x) => x.id === row.product_id);
      Object.assign(row, { id: Math.max(...state.orders.map((o) => o.id)) + 1, total_price: row.quantity * p.price, due_date: day(5), seller_id: p.seller_id, created_at: day(0), updated_at: day(0) });
    } else if (table === 'products') {
      if (!['seller', 'admin'].includes(roleOf(me))) return send(res, 403, { code: '42501', message: 'rls' });
      Object.assign(row, { id: Math.max(...state.products.map((o) => o.id)) + 1, seller_id: me, created_at: day(0), updated_at: day(0) });
    } else if (row.id !== me) return send(res, 403, { code: '42501', message: 'rls' });
    state[table].push(row);
    return out([row], 201);
  }
  send(res, 405, { message: 'unsupported' });
}).listen(PORT, () => console.log('mock ready'));
