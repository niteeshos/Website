const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USING_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const adminSessions = new Set();

function readStore() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function supabaseRequest(table, query = '', options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...options.headers
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${table} failed: ${res.status} ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

const db = {
  async getSettings() {
    if (!USING_SUPABASE) return readStore().settings;
    const rows = await supabaseRequest('settings', 'select=*&id=eq.1');
    return rows[0] || {};
  },
  async updateSettings(patch) {
    if (!USING_SUPABASE) {
      const store = readStore();
      store.settings = { ...store.settings, ...patch };
      writeStore(store);
      return store.settings;
    }
    const rows = await supabaseRequest('settings', 'id=eq.1', { method: 'PATCH', body: patch });
    return rows[0] || patch;
  },
  async listCategories() {
    if (!USING_SUPABASE) return readStore().categories || [];
    return supabaseRequest('categories', 'select=*&order=name.asc');
  },
  async createCategory(category) {
    if (!USING_SUPABASE) {
      const store = readStore();
      store.categories = store.categories || [];
      store.categories.push(category);
      writeStore(store);
      return category;
    }
    const rows = await supabaseRequest('categories', '', { method: 'POST', body: category });
    return rows[0] || category;
  },
  async deleteCategory(id) {
    if (!USING_SUPABASE) {
      const store = readStore();
      store.categories = (store.categories || []).filter(c => c.id !== id);
      writeStore(store);
      return;
    }
    await supabaseRequest('categories', `id=eq.${id}`, { method: 'DELETE' });
  },
  async listProducts() {
    if (!USING_SUPABASE) return readStore().products || [];
    return supabaseRequest('products', 'select=*&order=name.asc');
  },
  async createProduct(product) {
    if (!USING_SUPABASE) {
      const store = readStore();
      store.products.push(product);
      writeStore(store);
      return product;
    }
    const rows = await supabaseRequest('products', '', { method: 'POST', body: product });
    return rows[0] || product;
  },
  async updateProduct(id, patch) {
    if (!USING_SUPABASE) {
      const store = readStore();
      const idx = store.products.findIndex(p => p.id === id);
      if (idx === -1) return null;
      store.products[idx] = { ...store.products[idx], ...patch, price: Number(patch.price ?? store.products[idx].price) };
      writeStore(store);
      return store.products[idx];
    }
    const rows = await supabaseRequest('products', `id=eq.${id}`, { method: 'PATCH', body: patch });
    return rows[0] || null;
  },
  async deleteProduct(id) {
    if (!USING_SUPABASE) {
      const store = readStore();
      const idx = store.products.findIndex(p => p.id === id);
      if (idx === -1) return null;
      const [removed] = store.products.splice(idx, 1);
      writeStore(store);
      return removed;
    }
    const rows = await supabaseRequest('products', `id=eq.${id}`, { method: 'DELETE' });
    return rows?.[0] || { id };
  },
  async listBookings() {
    if (!USING_SUPABASE) return readStore().bookings || [];
    return supabaseRequest('bookings', 'select=*&order=createdAt.desc');
  },
  async createBooking(booking) {
    if (!USING_SUPABASE) {
      const store = readStore();
      store.bookings.unshift(booking);
      writeStore(store);
      return booking;
    }
    const rows = await supabaseRequest('bookings', '', { method: 'POST', body: booking });
    return rows[0] || booking;
  },
  async updateBooking(id, patch) {
    if (!USING_SUPABASE) {
      const store = readStore();
      const idx = store.bookings.findIndex(b => b.id === id);
      if (idx === -1) return null;
      store.bookings[idx] = { ...store.bookings[idx], ...patch };
      writeStore(store);
      return store.bookings[idx];
    }
    const rows = await supabaseRequest('bookings', `id=eq.${id}`, { method: 'PATCH', body: patch });
    return rows[0] || null;
  },
  async deleteBooking(id) {
    if (!USING_SUPABASE) {
      const store = readStore();
      const idx = store.bookings.findIndex(b => b.id === id);
      if (idx === -1) return null;
      const [removed] = store.bookings.splice(idx, 1);
      writeStore(store);
      return removed;
    }
    const rows = await supabaseRequest('bookings', `id=eq.${id}`, { method: 'DELETE' });
    return rows?.[0] || { id };
  },
  async listMessages() {
    if (!USING_SUPABASE) return readStore().messages || [];
    return supabaseRequest('messages', 'select=*&order=createdAt.desc');
  },
  async createMessage(message) {
    if (!USING_SUPABASE) {
      const store = readStore();
      store.messages.unshift(message);
      writeStore(store);
      return message;
    }
    const rows = await supabaseRequest('messages', '', { method: 'POST', body: message });
    return rows[0] || message;
  },
  async deleteMessage(id) {
    if (!USING_SUPABASE) {
      const store = readStore();
      const idx = store.messages.findIndex(m => m.id === id);
      if (idx === -1) return null;
      const [removed] = store.messages.splice(idx, 1);
      writeStore(store);
      return removed;
    }
    const rows = await supabaseRequest('messages', `id=eq.${id}`, { method: 'DELETE' });
    return rows?.[0] || { id };
  }
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function resolvePath(reqPath) {
  if (reqPath === '/' || reqPath === '/index') return '/index.html';
  if (reqPath === '/admin' || reqPath === '/admin/') return '/admin-login.html';
  if (reqPath === '/admin/dashboard' || reqPath === '/admin/dashboard/') return '/admin.html';
  return reqPath;
}

function serveFile(reqPath, res) {
  const safePath = resolvePath(reqPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

function notFound(res) {
  sendJson(res, 404, { error: 'Resource not found' });
}

function getAuthToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7);
}

function requireAdmin(req, res) {
  const token = getAuthToken(req);
  if (!token || !adminSessions.has(token)) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    return res.end();
  }

  try {
    if (pathname === '/api/health') return sendJson(res, 200, { ok: true, backend: USING_SUPABASE ? 'supabase' : 'json-file' });

    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body.username !== ADMIN_USER || body.password !== ADMIN_PASSWORD) return sendJson(res, 401, { error: 'Invalid credentials' });
      const token = randomUUID();
      adminSessions.add(token);
      return sendJson(res, 200, { token });
    }

    if (pathname === '/api/admin/verify' && req.method === 'GET') {
      const token = getAuthToken(req);
      return sendJson(res, 200, { valid: !!token && adminSessions.has(token) });
    }

    if (pathname === '/api/settings' && req.method === 'GET') return sendJson(res, 200, await db.getSettings());
    if (pathname === '/api/settings' && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      return sendJson(res, 200, await db.updateSettings(await parseBody(req)));
    }

    if (pathname === '/api/categories' && req.method === 'GET') return sendJson(res, 200, await db.listCategories());
    if (pathname === '/api/categories' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await parseBody(req);
      const category = { id: randomUUID(), name: body.name, slug: String(body.name || '').trim().toLowerCase().replace(/\s+/g, '-') };
      return sendJson(res, 201, await db.createCategory(category));
    }
    if (pathname.startsWith('/api/categories/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      await db.deleteCategory(pathname.split('/').pop());
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/products' && req.method === 'GET') return sendJson(res, 200, await db.listProducts());
    if (pathname === '/api/products' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await parseBody(req);
      const product = { id: randomUUID(), name: body.name, description: body.description, price: Number(body.price), category: body.category, imageUrl: body.imageUrl || '', available: body.available !== false };
      return sendJson(res, 201, await db.createProduct(product));
    }
    if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const updated = await db.updateProduct(pathname.split('/').pop(), await parseBody(req));
      if (!updated) return notFound(res);
      return sendJson(res, 200, updated);
    }
    if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const deleted = await db.deleteProduct(pathname.split('/').pop());
      if (!deleted) return notFound(res);
      return sendJson(res, 200, deleted);
    }

    if (pathname === '/api/bookings' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return sendJson(res, 200, await db.listBookings());
    }
    if (pathname === '/api/bookings' && req.method === 'POST') {
      const booking = { id: randomUUID(), status: 'pending', createdAt: new Date().toISOString(), ...(await parseBody(req)) };
      return sendJson(res, 201, await db.createBooking(booking));
    }
    if (pathname.startsWith('/api/bookings/') && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const updated = await db.updateBooking(pathname.split('/').pop(), await parseBody(req));
      if (!updated) return notFound(res);
      return sendJson(res, 200, updated);
    }
    if (pathname.startsWith('/api/bookings/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const deleted = await db.deleteBooking(pathname.split('/').pop());
      if (!deleted) return notFound(res);
      return sendJson(res, 200, deleted);
    }

    if (pathname === '/api/messages' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return sendJson(res, 200, await db.listMessages());
    }
    if (pathname === '/api/messages' && req.method === 'POST') {
      const message = { id: randomUUID(), createdAt: new Date().toISOString(), ...(await parseBody(req)) };
      return sendJson(res, 201, await db.createMessage(message));
    }
    if (pathname.startsWith('/api/messages/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const deleted = await db.deleteMessage(pathname.split('/').pop());
      if (!deleted) return notFound(res);
      return sendJson(res, 200, deleted);
    }

    serveFile(pathname, res);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Café server running on http://localhost:${PORT} (${USING_SUPABASE ? 'Supabase' : 'JSON'})`);
});
