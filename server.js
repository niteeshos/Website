const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const adminSessions = new Set();

function readStore() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

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
    if (pathname === '/api/health') return sendJson(res, 200, { ok: true });

    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body.username !== ADMIN_USER || body.password !== ADMIN_PASSWORD) {
        return sendJson(res, 401, { error: 'Invalid credentials' });
      }
      const token = randomUUID();
      adminSessions.add(token);
      return sendJson(res, 200, { token });
    }

    if (pathname === '/api/admin/verify' && req.method === 'GET') {
      const token = getAuthToken(req);
      return sendJson(res, 200, { valid: !!token && adminSessions.has(token) });
    }

    if (pathname === '/api/settings' && req.method === 'GET') {
      return sendJson(res, 200, readStore().settings);
    }

    if (pathname === '/api/settings' && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const store = readStore();
      store.settings = { ...store.settings, ...(await parseBody(req)) };
      writeStore(store);
      return sendJson(res, 200, store.settings);
    }

    if (pathname === '/api/categories' && req.method === 'GET') {
      return sendJson(res, 200, readStore().categories || []);
    }

    if (pathname === '/api/categories' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await parseBody(req);
      const store = readStore();
      const category = { id: randomUUID(), name: body.name, slug: String(body.name || '').trim().toLowerCase().replace(/\s+/g, '-') };
      store.categories = store.categories || [];
      store.categories.push(category);
      writeStore(store);
      return sendJson(res, 201, category);
    }

    if (pathname.startsWith('/api/categories/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = pathname.split('/').pop();
      const store = readStore();
      store.categories = (store.categories || []).filter(c => c.id !== id);
      writeStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/products' && req.method === 'GET') {
      return sendJson(res, 200, readStore().products);
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await parseBody(req);
      const store = readStore();
      const product = { id: randomUUID(), name: body.name, description: body.description, price: Number(body.price), category: body.category, imageUrl: body.imageUrl || '', available: body.available !== false };
      store.products.push(product);
      writeStore(store);
      return sendJson(res, 201, product);
    }

    if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const store = readStore();
      const idx = store.products.findIndex(p => p.id === id);
      if (idx === -1) return notFound(res);
      store.products[idx] = { ...store.products[idx], ...body, price: Number(body.price ?? store.products[idx].price) };
      writeStore(store);
      return sendJson(res, 200, store.products[idx]);
    }

    if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = pathname.split('/').pop();
      const store = readStore();
      const idx = store.products.findIndex(p => p.id === id);
      if (idx === -1) return notFound(res);
      const [removed] = store.products.splice(idx, 1);
      writeStore(store);
      return sendJson(res, 200, removed);
    }

    if (pathname === '/api/bookings' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return sendJson(res, 200, readStore().bookings);
    }

    if (pathname === '/api/bookings' && req.method === 'POST') {
      const store = readStore();
      const booking = { id: randomUUID(), status: 'pending', createdAt: new Date().toISOString(), ...(await parseBody(req)) };
      store.bookings.unshift(booking);
      writeStore(store);
      return sendJson(res, 201, booking);
    }

    if (pathname.startsWith('/api/bookings/') && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const id = pathname.split('/').pop();
      const store = readStore();
      const idx = store.bookings.findIndex(b => b.id === id);
      if (idx === -1) return notFound(res);
      store.bookings[idx] = { ...store.bookings[idx], ...(await parseBody(req)) };
      writeStore(store);
      return sendJson(res, 200, store.bookings[idx]);
    }

    if (pathname.startsWith('/api/bookings/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = pathname.split('/').pop();
      const store = readStore();
      const idx = store.bookings.findIndex(b => b.id === id);
      if (idx === -1) return notFound(res);
      const [removed] = store.bookings.splice(idx, 1);
      writeStore(store);
      return sendJson(res, 200, removed);
    }

    if (pathname === '/api/messages' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return sendJson(res, 200, readStore().messages);
    }

    if (pathname === '/api/messages' && req.method === 'POST') {
      const store = readStore();
      const message = { id: randomUUID(), createdAt: new Date().toISOString(), ...(await parseBody(req)) };
      store.messages.unshift(message);
      writeStore(store);
      return sendJson(res, 201, message);
    }

    if (pathname.startsWith('/api/messages/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = pathname.split('/').pop();
      const store = readStore();
      const idx = store.messages.findIndex(m => m.id === id);
      if (idx === -1) return notFound(res);
      const [removed] = store.messages.splice(idx, 1);
      writeStore(store);
      return sendJson(res, 200, removed);
    }

    serveFile(pathname, res);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Café server running on http://localhost:${PORT}`);
});
