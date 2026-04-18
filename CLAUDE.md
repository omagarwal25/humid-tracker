# Humidity Monitor — Claude Code Spec

Build a humidity monitoring system with three components: NodeMCU firmware, a Node.js/Express backend deployable to Railway, and a Vite React frontend.

---

## 1. Firmware (`/firmware/firmware.ino`)

Arduino C++ for a NodeMCU (ESP8266).

- Connects to WiFi using credentials defined as constants at the top of the file
- Reads temperature and humidity from an SHT3x sensor over I2C (SDA=D2/GPIO4, SCL=D1/GPIO5, I2C address 0x44)
- Implements the SHT3x read manually using Wire.h (no external SHT library): send command 0x2C 0x06, wait 500ms, read 6 bytes (2 temp + 1 CRC + 2 hum + 1 CRC), convert raw values to Celsius and %RH
- Every 60 seconds, POSTs a JSON payload to the backend: `{ mac, temperature, humidity }`
- Uses `WiFi.macAddress()` as the device identifier
- Prints MAC address on boot and logs each reading + HTTP response code to Serial

---

## 2. Backend (`/backend/`)

Node.js + Express + Prisma, targeting Railway with a PostgreSQL database.

### Prisma schema

One model: `Reading` with fields: `id` (autoincrement), `mac` (String), `temperature` (Float), `humidity` (Float), `createdAt` (DateTime, default now)

### API endpoints

- `POST /readings` — accepts `{ mac, temperature, humidity }`, writes to DB, returns the created record
- `GET /readings` — returns all readings ordered by `createdAt` desc, supports optional `?limit=N` query param (default 500)
- `GET /readings/stats` — returns `{ min, max, avg }` for humidity and temperature across all readings

### Config

- Port from `process.env.PORT`
- Database URL from `process.env.DATABASE_URL`
- Include a `railway.json` or note in README that Railway needs `DATABASE_URL` set and `npm run build` runs `prisma migrate deploy`

### package.json scripts

- `dev`: `nodemon index.js`
- `start`: `node index.js`
- `build`: `prisma migrate deploy`

---

## 3. Frontend (`/frontend/`)

Vite + React. No UI library needed, plain CSS is fine.

### Pages / components

- **Dashboard** — main view with:
  - A stats bar showing current (latest) humidity and temperature, and 24h min/max
  - A line chart (use recharts) showing humidity over time, with temperature as a second line
  - A data table below showing all readings (mac, temp, humidity, timestamp), newest first
- **Auto-refreshes** every 60 seconds

### Config

- Backend URL read from `import.meta.env.VITE_API_URL`
- Include a `.env.example` with `VITE_API_URL=http://localhost:3000`

---

## Project structure

```
humidity-monitor/
  firmware/
    firmware.ino
  backend/
    index.js
    package.json
    prisma/
      schema.prisma
    README.md
  frontend/
    src/
      App.jsx
      main.jsx
      App.css
    index.html
    package.json
    vite.config.js
    .env.example
```

---

## Notes

- No auth needed, this is local/private use
- Keep firmware WiFi credentials and server URL as clearly labeled constants at the top of the .ino file so they're easy to swap
- Backend should have CORS enabled for all origins
