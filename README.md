# Café Restaurant (Full-Stack Demo)

A complete full-stack restaurant website with:
- Public website (`/`)
- Admin login (`/admin`)
- Admin dashboard (`/admin/dashboard`)
- File-based JSON persistence (`data/store.json`)

## Quick Start

```bash
npm install
npm start
```

## Live Localhost Link

After starting the server, open:

- **Website:** http://localhost:3000
- **Admin Login:** http://localhost:3000/admin

## Shareable Local Network Link (same Wi‑Fi/LAN)

If someone is on the same network, they can use your machine IP:

```bash
npm run share-link
```

This prints links like:

- `http://192.168.x.x:3000`

> Note: This is shareable only inside your local network. For internet sharing, use a tunnel service (e.g. Cloudflare Tunnel, ngrok) and point it to port `3000`.


## Supabase Backend (Production-ready option)

This project now supports **two backend modes**:

1. **JSON mode (default)** using `data/store.json`
2. **Supabase mode** when these env vars are present:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

When enabled, API routes read/write from Supabase tables.

### Required Supabase tables

Create these tables in Supabase (with matching columns used by the app):

- `settings` (`id`, `restaurantName`, `heroTagline`, `aboutText`, `primaryColor`)
- `categories` (`id`, `name`, `slug`)
- `products` (`id`, `name`, `description`, `price`, `category`, `imageUrl`, `available`)
- `bookings` (`id`, `name`, `email`, `phone`, `guests`, `date`, `time`, `message`, `status`, `createdAt`)
- `messages` (`id`, `name`, `email`, `message`, `createdAt`)

The app automatically falls back to JSON mode when Supabase env vars are not set.

## Project Structure

- `server.js` — Node HTTP server + REST API
- `public/` — frontend + admin static assets
- `data/store.json` — persistent app data
- `package.json` — scripts

## Validation

```bash
npm run check
node --check server.js
node --check public/app.js
node --check public/admin.js
node --check public/admin-login.js
```


## Backend Connection Process (How frontend talks to backend)

1. **Server startup** (`npm start`) boots `server.js` on port `3000`.
2. Frontend files in `public/` call API endpoints with `fetch('/api/...')`.
3. Backend storage layer picks data source:
   - **JSON mode** when Supabase env vars are not set.
   - **Supabase mode** when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set.
4. Public actions:
   - Booking form -> `POST /api/bookings`
   - Contact form -> `POST /api/messages`
5. Admin actions require login token:
   - Login -> `POST /api/admin/login`
   - Token then sent in `Authorization: Bearer <token>` for protected CRUD.

## Go-Live (Next Step) Checklist

When you are ready to make the site live in the next step:

1. Deploy Node app (Render / Railway / VPS / Docker).
2. Set environment variables in hosting dashboard:
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
   - `SUPABASE_URL` (optional but recommended for production)
   - `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended for production)
3. Open port/service and bind to production domain.
4. Verify endpoints:
   - `/api/health`
   - `/`
   - `/admin`
5. Enable HTTPS and set secure admin credentials.

