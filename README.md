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
