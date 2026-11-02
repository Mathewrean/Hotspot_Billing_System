# FastNet System Logic Flow Documentation

> **Maintenance Rule:** This document must be updated immediately whenever backend API routes, database schemas, MikroTik RouterOS integration scripts, or frontend pages are modified. Keep this file in sync with the codebase at all times.

---

# 1. System Architecture Overview

## Components

| Component | Technology | Role |
|---|---|---|
| Frontend | Next.js 16 (App Router) | Captive portal UI, payment status polling, user dashboard, admin panel |
| Backend | Node.js / Express | REST API, M-Pesa Daraja webhook handler, session manager, Socket.IO real-time events |
| Database | PostgreSQL (Prisma ORM) | Stores users, payments, MAC session bindings, loans, support requests, user activities |
| Router | MikroTik RB951Ui-2HnD (RouterOS 7) | Hotspot server, DHCP pool, IP-binding engine for WiFi access control |
| Payment Gateway | Safaricom Daraja API | M-Pesa STK Push initiation and callback delivery |

## Network Topology

```
Client Device (WiFi)
      |
      v
MikroTik Router (192.168.88.1)
  - Hotspot server on `hotspot-bridge`
  - DHCP pool: 192.168.10.0/24
  - IP-binding bypass rules for whitelisted MACs
      |
      v (captive portal redirect)
Next.js Frontend (localhost:5000 / fastnet.onrender.com)
      |
      v (REST API + WebSocket)
Node.js Backend (Express)
      |
      +-- PostgreSQL (payments, users, loans, support)
      +-- MikroTik RouterOS API (whitelistMAC, disconnect, status)
      +-- Safaricom Daraja API (STK Push, callbacks)
```

---

# 2. Environment Configuration

## `.env` File (Local Development)

| Variable | Example Value | Description |
|---|---|---|
| `PORT` | `5000` | Backend server port |
| `NODE_ENV` | `production` | Node environment |
| `DATABASE_URL` | `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | `your-secure-random-jwt-secret` | JWT signing secret |
| `ADMIN_USERNAME` | `mathew_admin` | Primary admin username |
| `ADMIN_PASSWORD` | `29541227006` | Primary admin password |
| `ADMIN_EMAIL` | `mathewrean@gmail.com` | Primary admin email |
| `MPESA_ENABLED` | `true` | Enable M-Pesa integration |
| `MPESA_CONSUMER_KEY` | `2JlnnkngmmfrrdhxigyZQFGkK5bDBPoQrfesurkJ7KnuBrlZ` | Daraja consumer key |
| `MPESA_CONSUMER_SECRET` | `yeq1i9buL1zHN5skYE77Oiip4vAxxe8vIiJNbESSN3Keefw056Am3IXl6YGqllAi` | Daraja consumer secret |
| `MPESA_SHORTCODE` | `174379` | M-Pesa paybill shortcode |
| `MPESA_PASSKEY` | `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919` | M-Pesa passkey |
| `MPESA_CALLBACK_URL` | `https://<tunnel-id>.trycloudflare.com/api/mpesa/callback` | Public HTTPS URL for Safaricom callbacks |
| `MIKROTIK_ENABLED` | `true` | Enable router integration |
| `MIKROTIK_HOST` | `192.168.88.1` | MikroTik router IP |
| `MIKROTIK_USER` | `admin` | Router API username |
| `MIKROTIK_PASSWORD` | `29541227006mikrotik` | Router API password |
| `MIKROTIK_PORT` | `8728` | Router API port |
| `LOAN_WIFI_DURATION_HOURS` | `1` | WiFi duration granted after loan repayment |

## Supabase Configuration

The database is hosted on Supabase (`vbulozklwemfwlsunhho`). The connection string uses the connection pooler (port 6543) with `?pgbouncer=true` appended to avoid prepared statement errors.

**Important:** `prisma db push` does not work directly with Supabase pgbouncer due to prepared statement limitations. To deploy schema changes:

1. Generate SQL: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql`
2. Execute via psql: `PGPASSWORD=<password> psql "host=<host> port=6543 dbname=postgres user=<user>" -f schema.sql`

Or use the direct connection (port 5432) if available.

## Render Deployment

Render uses its own environment variable dashboard. The `render.yaml` file defines:
- `NODE_ENV=production`
- `PORT=10000`
- `MPESA_ENABLED=false` (disabled on Render)
- `MIKROTIK_ENABLED=false` (disabled on Render)
- `MPESA_CALLBACK_URL` set via Render dashboard to `https://fastnet.onrender.com/api/mpesa/callback`

**Critical:** Local `.env` `MPESA_CALLBACK_URL` must point to a public tunnel (cloudflared/ngrok) to `localhost:5000`, NOT to Render. Pointing local at Render causes split-brain: callbacks go to Render's database, not local.

## Express Configuration

`app.set('trust proxy', true)` is set in `server.js` to correctly parse `X-Forwarded-For` headers behind the Cloudflare tunnel proxy. This prevents `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` rate-limiting errors.

## Startup Script (`start.sh`)

Run `bash start.sh` to start the full stack:

1. Starts cloudflared tunnel on port 5000
2. Auto-extracts the trycloudflare URL
3. Updates `MPESA_CALLBACK_URL` in `.env` dynamically
4. Starts Node.js server
5. Displays QR code for mobile portal access
6. Shows structured summary with PIDs, URLs, and callback endpoint

Press `Ctrl+C` to stop both server and tunnel.

---

# 3. Database Schema (Prisma)

## Models

### `User`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `phone` | String | Unique phone number |
| `macAddress` | String | Device MAC address |
| `status` | String | User status |
| `currentPackage` | String? | Current active package |
| `expiresAt` | DateTime? | Package expiry |
| `totalSpent` | Int | Total amount spent |
| `sessionsCount` | Int | Number of sessions |
| `lastSeen` | DateTime? | Last activity timestamp |

### `Payment`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `phone` | String | Customer phone number |
| `amount` | Int | Payment amount in KES |
| `transactionId` | String | Unique transaction ID |
| `macAddress` | String | Device MAC address |
| `status` | String | `pending`, `completed`, `failed`, `refunded` |
| `timePurchased` | DateTime | Purchase timestamp |
| `mpesaRef` | String? | M-Pesa checkout request ID |
| `expiresAt` | DateTime? | Access expiry timestamp |
| `userId` | Int? | Related User |
| `authUserId` | Int? | Related AuthUser |

### `AuthUser`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `username` | String | Unique username |
| `email` | String? | Email address |
| `password` | String | Hashed password |
| `phone` | String | Unique phone number |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### `SupportRequest`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `name` | String | Customer name |
| `phone` | String | Customer phone |
| `transactionCode` | String | Related M-Pesa transaction code |
| `message` | String | Support message |
| `status` | String | `pending`, `in_progress`, `resolved`, `closed` |

### `UserActivity`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `userId` | Int | Related AuthUser |
| `action` | String | Action type (`purchase`, `login`, `loan_repay_initiated`, etc.) |
| `amount` | Int? | Amount for purchase actions |
| `package` | String? | Package name |
| `macAddress` | String? | Device MAC address |
| `createdAt` | DateTime | Activity timestamp |

### `Loan`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `userId` | Int | Related AuthUser |
| `amount` | Int | Loan amount in KES |
| `status` | String | `active`, `repaid`, `overdue`, `defaulted` |
| `borrowedAt` | DateTime | Loan borrow timestamp |
| `dueAt` | DateTime | Repayment due date |
| `repaidAt` | DateTime? | Repayment timestamp |
| `repaymentAmount` | Int? | Actual amount repaid |
| `interestRate` | Float | Interest rate (default 0.1 = 10%) |

### `LoanRepayment`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `loanId` | Int | Related Loan |
| `transactionId` | String | Unique transaction ID |
| `amount` | Int | Repayment amount |
| `status` | String | `pending`, `completed`, `failed` |
| `mpesaRef` | String? | M-Pesa checkout request ID |

### `Admin`
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `email` | String | Unique admin email |
| `password` | String | Admin password |
| `role` | String | Role (default `admin`) |

---

# 4. API Endpoints Reference

## 4.1 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | None |
| `POST` | `/api/auth/login` | User login, returns JWT | None |
| `GET` | `/api/auth/profile` | Get current user profile | JWT (user) |

## 4.2 Payments & M-Pesa (`/api`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/payments/initiate` | Initiate M-Pesa STK Push, create pending payment | None |
| `GET` | `/api/payments/status/:transactionId` | Check payment status | None |
| `POST` | `/api/mpesa/callback` | Safaricom callback webhook | None |
| `GET` | `/api/transactions` | List transactions with filters/pagination | None |
| `GET` | `/api/transactions/:transactionId` | Get single transaction | None |
| `POST` | `/api/transactions/:transactionId/refund` | Refund a completed transaction | None |
| `GET` | `/api/transactions/:transactionId/receipt` | Download receipt (placeholder) | None |

## 4.3 MAC-Bound Session / Hotspot Auth (`/api/hotspot`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/hotspot/check-session` | Check if MAC has active unexpired session, re-apply whitelist | None |

## 4.4 Admin (`/api/admin`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/admin/login` | Admin login (via .env credentials) | None |
| `GET` | `/api/admin/payments` | List all payments | JWT (admin) |
| `GET` | `/api/admin/summary` | Dashboard summary stats | JWT (admin) |
| `GET` | `/api/admin/users` | List users with pagination | JWT (admin) |
| `POST` | `/api/admin/users/:id/disconnect` | Disconnect user from router | JWT (admin) |
| `GET` | `/api/admin/transactions` | List transactions | JWT (admin) |
| `POST` | `/api/admin/transactions/:id/refund` | Refund transaction (not implemented) | JWT (admin) |
| `GET` | `/api/admin/network/devices` | List active router devices | JWT (admin) |
| `POST` | `/api/admin/network/disconnect-all` | Disconnect all router users | JWT (admin) |
| `GET` | `/api/admin/network/status` | Get router status | JWT (admin) |
| `GET` | `/api/admin/dashboard/stats` | Overview metrics: revenue, sessions, vouchers, router health | JWT (admin) |
| `GET` | `/api/admin/sessions` | List active MikroTik hotspot sessions | JWT (admin) |
| `POST` | `/api/admin/sessions/:mac/disconnect` | Revoke access / disconnect specific MAC | JWT (admin) |
| `POST` | `/api/admin/devices/whitelist` | Manually whitelist a MAC address with package duration | JWT (admin) |

## 4.5 Loans (`/loans` or `/api/loans`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/loans/eligibility` | Check loan eligibility | JWT (user) |
| `POST` | `/loans/request` | Request a loan | JWT (user) |
| `POST` | `/loans/repay/initiate/:loanId` | Initiate M-Pesa repayment | JWT (user) |
| `GET` | `/loans/repay/status/:transactionId` | Check repayment status | JWT (user) |
| `GET` | `/loans/status` | Get user's loans | JWT (user) |
| `GET` | `/loans/admin/all` | Get all loans (admin) | JWT (admin) |
| `PUT` | `/loans/admin/:loanId/status` | Update loan status | JWT (admin) |

## 4.6 Support (`/api/support`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/support/submit` | Submit support request | None |
| `GET` | `/api/support/requests` | List support requests | None |
| `PUT` | `/api/support/requests/:id/status` | Update support request status | None |
| `GET` | `/api/support/user/requests` | Get user's support requests | None |
| `GET` | `/api/support/requests/:id` | Get single support request | None |

## 4.7 Device Info

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/device/info` | Get device MAC by IP (via MikroTik or ARP) | None |
| `GET` | `/device/info` | Legacy device MAC lookup (via `arp` command) | None |

## 4.8 Legacy / Admin Aliases

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/admin/payments` | Legacy payments list | JWT (admin) |
| `GET` | `/admin/summary` | Legacy summary | JWT (admin) |
| `GET` | `/api/users` | Legacy users list | JWT (admin) |
| `POST` | `/api/users/:id/disconnect` | Legacy disconnect user | JWT (admin) |
| `GET` | `/network/devices` | Legacy network devices | JWT (admin) |
| `POST` | `/network/disconnect-all` | Legacy disconnect all | JWT (admin) |
| `GET` | `/network/status` | Legacy network status | JWT (admin) |

---

# 5. Core Logic Flows

## 5.1 MAC-Bound Login & Auto-Bypass Flow

**Purpose:** Allow returning devices with active, unexpired sessions to regain WiFi access automatically without re-payment.

### Step-by-Step

1. **Captive Portal Interception:** Device connects to `hotspot-bridge` WiFi. MikroTik intercepts HTTP and redirects to frontend login page with query params: `?mac=00:00:5E:B8:22:8A&ip=192.168.10.5`

2. **Frontend Captures MAC:** Frontend reads `mac` parameter from URL.

3. **Session Verification:** Frontend calls `GET /api/hotspot/check-session?mac=00:00:5E:B8:22:8A`.

4. **Backend Query:** Backend searches `Payment` table for:
   - `macAddress` matches
   - `status = 'completed'`
   - `expiresAt > NOW()`
   - Ordered by `createdAt DESC` (latest first)

5. **Auto-Bypass (if active session found):**
   - Backend determines `timeLabel` from payment amount (30=24Hrs, 20=12Hrs, 15=4Hrs, default=1Hr)
   - Backend calls `whitelistMAC(mac, timeLabel)` to re-apply MikroTik IP-binding bypass rule
   - Returns `{ authenticated: true, expiresAt, ... }`

6. **Payment Required (if no active session):**
   - Returns `{ authenticated: false, message: "No active session found. Payment required." }`
   - Frontend shows payment form

7. **Internet Access:** Device traffic bypasses MikroTik hotspot via IP-binding rule.

### Endpoint: `GET /api/hotspot/check-session`

**Query params:** `mac` (required)

**Response (active session):**
```json
{
  "success": true,
  "authenticated": true,
  "message": "Active session found. Device whitelisted.",
  "expiresAt": "2026-11-02T08:00:00.000Z",
  "amount": 30,
  "transactionId": "TXN_1234567890",
  "mpesaRef": "CHECKOUT_REQUEST_ID",
  "mikrotik": { "success": true, "message": "Whitelisted 00:00:5E:B8:22:8A for 24Hrs" }
}
```

**Response (no active session):**
```json
{
  "success": true,
  "authenticated": false,
  "message": "No active session found. Payment required."
}
```

---

## 5.2 Payment & Provisioning Flow (WiFi Purchase)

### Step-by-Step Sequence

```
1. User enters phone number, amount, MAC address on frontend
      |
      v
2. Frontend POST /api/payments/initiate { phone, amount, macAddress }
      |
      v
3. Backend validates:
   - Phone matches 2547XXXXXXXX
   - Amount is whole number 1-1000 KES
   - MAC matches format or is allowed placeholder
      |
      v
4. Backend creates Payment record: status=pending, macAddress, phone, amount, transactionId
      |
      v
5. Backend calls stkPush(phone, amount, transactionId) from config/mpesa.js
      |
      v
6. Daraja OAuth: getAccessToken() via client credentials grant
      |
      v
7. STK Push dispatched to user's phone
      |
      v
8. User enters M-Pesa PIN
      |
      v
9. Safaricom delivers callback POST /api/mpesa/callback
      |
      v
10. ResultCode === 0?
      |
      +-- No: Mark payment failed in database, emit payment_failed WebSocket
      |
      +-- Yes:
          |
          v
      11. Idempotency check: skip if already completed
          |
          v
      12. Extract Amount and MpesaReceiptNumber from callback metadata
          |
          v
      13. Find payment by mpesaRef (CheckoutRequestID)
          |
          v
      14. Determine timeLabel from amount:
          30 KES = 24Hrs, 20 KES = 12Hrs, 15 KES = 4Hrs, default = 1Hr
          |
          v
      15. Call whitelistMAC(macAddress, timeLabel) from config/mikrotik.js
          |
          v
      16. MikroTik: /ip/hotspot/ip-binding/add mac-address=<MAC> type=bypassed comment=FastNet <timeLabel>
          |
          v
      17. On success: update payment to completed, set expiresAt
          |
          v
      18. Emit WebSocket payment_completed event
          |
          v
      19. Return success to Safaricom
```

### Endpoint: `POST /api/payments/initiate`

**Request body:**
```json
{ "phone": "254712345678", "amount": 30, "macAddress": "00:00:5E:B8:22:8A" }
```

**Placeholder MAC handling:** If MAC is `LOADING...`, `UNAVAILABLE`, `MAC_NOT_FOUND`, `UNKNOWN`, or `00:00:00:00:00:00`, a deterministic MAC is derived from the phone number hash.

**Success response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN_1234567890",
    "mpesaRef": "ws_CO_221020262342335712345678",
    "status": "pending",
    "expiresAt": null
  },
  "message": "STK Push sent!"
}
```

---

## 5.3 Loan Repayment Flow

### Step-by-Step

1. User requests loan via `POST /loans/request` (JWT required)
2. Backend creates `Loan` record with `status=active`, `interestRate=0.1` (10%)
3. User initiates repayment via `POST /loans/repay/initiate/:loanId`
4. Backend calculates `totalDue = ceil(amount * (1 + interestRate))`
5. Backend creates `LoanRepayment` record with `status=pending`
6. Backend optionally stores MAC address in `UserActivity` (action: `loan_repay_initiated`)
7. Backend dispatches STK Push with `CheckoutRequestID` containing `LOAN_REPAY_` prefix
8. Safaricom callback received at `POST /api/mpesa/callback`
9. Backend detects `isLoanRepayment = checkoutId.includes('LOAN_REPAY')`
10. On `ResultCode === 0`:
    - Update `LoanRepayment` to `completed`
    - Update `Loan` to `status=repaid`, set `repaidAt`, `repaymentAmount`
    - Create `UserActivity` (action: `loan_repaid_mpesa`)
    - If MAC address found from recent `loan_repay_initiated` activity:
      - Call `whitelistMAC(mac, timeLabel)` from `LOAN_WIFI_DURATION_HOURS` env
      - Create `Payment` record for WiFi access granted
11. Emit WebSocket loan events via `global.emitLoanEvent`

---

## 5.4 Support Request Flow

1. User submits support request via `POST /api/support/submit`
2. Backend validates phone format (Kenyan: `+254`, `254`, or `0` prefix)
3. Backend creates `SupportRequest` with `status=pending`
4. Backend emits `support_request_created` WebSocket event to user's phone room
5. Admin updates status via `PUT /api/support/requests/:id/status`
6. Backend emits `support_status_update` WebSocket event
7. User can view their own requests via `GET /api/support/user/requests?phone=...`

---

# 6. MikroTik Integration (`config/mikrotik.js`)

## Functions

| Function | Description | Router Command |
|---|---|---|
| `whitelistMAC(mac, timeLabel)` | Add IP-binding bypass rule for MAC | `/ip/hotspot/ip-binding/add =mac-address=<MAC> =type=bypassed =comment=FastNet <label>` |
| `disconnectByMac(mac)` | Remove active hotspot session by MAC | `/ip/hotspot/active/remove =.id=<id>` |
| `disconnectAllUsers()` | Remove all active hotspot sessions | `/ip/hotspot/active/print` then remove each |
| `getActiveDevices()` | List active hotspot sessions | `/ip/hotspot/active/print` |
| `getStatus()` | Get router status and user count | `/ip/hotspot/active/print` |
| `getDeviceInfoByIP(ip)` | Get device info by IP — queries ARP table first, then hotspot active sessions | `/ip/arp/print`, `/ip/hotspot/active/print` |

## Configuration Required on MikroTik Router

1. Enable API service: `/ip service enable api`
2. Create API user with appropriate permissions
3. Hotspot must be configured on `hotspot-bridge` interface
4. IP-binding table must exist: `/ip hotspot ip-binding`
5. **WiFi SSID must be set to "FASTNET":** `/interface wireless set [find default-name=wlan1] ssid=FASTNET`

## Code Patches Applied

- **`Channel.processPacket` patched** to skip MikroTik `!empty` replies (prevents `UNKNOWNREPLY` crash when `/print` returns no data)
- **`safeWrite()` wrapper** catches `UNKNOWNREPLY` and returns `[]`
- All `client.write()` calls use array-style parameters (`=key=value`) per `node-routeros` API
- **`getDeviceInfoByIP()` enhanced** to query `/ip/arp/print` before `/ip/hotspot/active/print` — ARP table contains real device MAC even when device not yet in active hotspot sessions
- **Hardcoded placeholder MAC `00:11:22:33:44:55` removed** from all fallbacks — returns `MAC_NOT_FOUND` instead when real MAC cannot be determined
- **`/api/device/info` accepts `mac` query parameter** — frontend can pass real MAC captured from captive portal URL (`?mac=...`)

## MAC Capture Flow

### How the real device MAC is obtained:

1. **Captive Portal Redirect**: MikroTik intercepts the device's first HTTP request and redirects to the login page with `?mac=REAL_MAC&ip=192.168.10.x`
2. **Frontend URL Parameter Capture**: `page.tsx` and `packages/page.tsx` read the `mac` query parameter from `window.location.search` on page load
3. **Backend `/api/device/info`**: Accepts optional `mac` query parameter — if provided and valid MAC format, uses it directly
4. **Backend ARP Fallback**: If no MAC param, `getDeviceInfoByIP()` queries MikroTik `/ip/arp/print` to find the real MAC for the client's IP address
5. **Hotspot Active Sessions Fallback**: If ARP has no match, checks `/ip/hotspot/active/print`
6. **Last Resort**: Returns `MAC_NOT_FOUND` (never returns a hardcoded placeholder like `00:11:22:33:44:55`)

### Router command to clean stale placeholder bindings:

```
/ip hotspot ip-binding remove [find mac-address=00:11:22:33:44:55]
```

## M-Pesa Callback Decoupling

### Fix applied to `routes/mpesaCallback.js`:

**Before (broken):** DB update (`status: completed`) and WebSocket `payment_completed` emit were INSIDE `if (mikrotikResponse.success)`. A whitelist failure (e.g., duplicate binding) prevented payment confirmation — user paid but dashboard never updated.

**After (fixed):** Three independent steps execute in order:
1. **DB Update FIRST**: Payment marked `completed` with `expiresAt` — always happens on `ResultCode === 0`
2. **WebSocket SECOND**: `payment_completed` emitted — always happens after DB update
3. **Whitelist THIRD**: `whitelistMAC()` attempted independently — failure is logged but does NOT block payment confirmation

This ensures: **money received = payment confirmed**, regardless of router-side whitelist outcome. Whitelist failures are retriable via the admin "Force Whitelist MAC" action on `/admin/transactions`.


If `MIKROTIK_ENABLED=false` or router is unreachable, all functions return success stubs with `[MIKROTIK-FALLBACK]` log messages. No router board required for development.

## Dev Mode Fallback Behavior

- `MIKROTIK_ENABLED=false`: All MikroTik functions return `{ success: true, message: "Dev mode: ..." }` — no router board needed for development
- Router unreachable: `getClient()` returns null, functions gracefully fall back to dev mode
- `[MIKROTIK-FALLBACK]` prefix on all fallback log messages for easy identification

---

# 7. M-Pesa Configuration (`config/mpesa.js`)

## Functions

| Function | Description |
|---|---|
| `getAccessToken()` | OAuth client credentials grant to Daraja API |
| `stkPush(phone, amount, transactionId)` | Builds STK push payload, posts to `/mpesa/stkpush/v1/processrequest` |

## STK Push Payload Fields

| Field | Value |
|---|---|
| `BusinessShortCode` | `MPESA_SHORTCODE` env |
| `Password` | Base64(shortcode + passkey + timestamp) |
| `Timestamp` | `YYYYMMDDHHmmss` |
| `TransactionType` | `CustomerPayBillOnline` |
| `Amount` | Payment amount |
| `PartyA` | Customer phone |
| `PartyB` | Shortcode |
| `PhoneNumber` | Customer phone |
| `CallBackURL` | `MPESA_CALLBACK_URL` env |
| `AccountReference` | `WiFi Payment` |
| `TransactionDesc` | `WiFi Payment - {transactionId}` |

## Callback URL Split-Brain Prevention

**Problem:** Local `.env` had `MPESA_CALLBACK_URL=https://fastnet.onrender.com/api/mpesa/callback`, causing Safaricom to send callbacks to Render instead of local machine.

**Fix:** Local `.env` uses cloudflared tunnel URL (e.g., `https://<tunnel-id>.trycloudflare.com/api/mpesa/callback`). Render keeps its own fixed URL via Render dashboard env vars.

**Rule:** Never point local `MPESA_CALLBACK_URL` at the Render deployment.

---

# 8. Real-Time Events (Socket.IO)

| Event | Emitted By | Description |
|---|---|---|
| `payment_completed` | M-Pesa callback handler | Payment succeeded, WiFi access granted |
| `payment_failed` | M-Pesa callback handler | Payment failed or cancelled |
| `loan_eligibility_checked` | Loan eligibility endpoint | Eligibility check result |
| `loan_application_result` | Loan request endpoint | Loan approved/rejected |
| `support_request_created` | Support submit endpoint | New support request |
| `support_status_update` | Support status update | Support request status changed |

**Connection:** `io.on("connection", ...)` with rooms: `loan_<userId>`, `admin_loans`, `support_<phone>`

---

# 9. Setup & Deployment Instructions

## 9.1 Local Development Setup

### Prerequisites
- Node.js v18+
- PostgreSQL database
- MikroTik router (optional, dev mode works without it)
- cloudflared or ngrok (for M-Pesa callback tunnel)

### Steps

1. **Clone repository:**
   ```bash
   git clone <repo-url>
   cd Hotspot_Billing_System
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Set up database (Supabase):**
   ```bash
   # Update .env with Supabase DATABASE_URL (see .env.example for format)
   # Must include ?pgbouncer=true for pooler compatibility
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true

   npx prisma generate

   # prisma db push does not work with Supabase pgbouncer.
   # Generate SQL and execute directly:
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/schema.sql
   PGPASSWORD=<password> psql "host=aws-0-eu-west-1.pooler.supabase.com port=6543 dbname=postgres user=<user>" -f /tmp/schema.sql
   ```

5. **Start M-Pesa callback tunnel (cloudflared):**
   ```bash
   cloudflared tunnel --url http://localhost:5000
   # Copy the https://<tunnel-id>.trycloudflare.com URL
   # Update MPESA_CALLBACK_URL in .env
   ```

6. **Start backend server:**
   ```bash
   NODE_ENV=production node server.js
   ```

7. **Start frontend (separate terminal):**
   ```bash
   cd frontend && npm run dev
   ```

## 9.2 Render Deployment

1. Connect repository to Render
2. Use `render.yaml` for blueprint deployment
3. Set environment variables in Render dashboard:
   - `MPESA_CALLBACK_URL=https://fastnet.onrender.com/api/mpesa/callback`
   - `MPESA_ENABLED=false` (or true if using production Daraja credentials)
   - `MIKROTIK_ENABLED=false`
   - All other required vars

4. Deploy: `npm run build && npm start`

## 9.3 Vercel Frontend Deployment

**Important:** Vercel can only host the Next.js frontend. The Express backend cannot run on Vercel (serverless environment). Deploy the backend separately on Render, Railway, or a VPS.

### Vercel Configuration (`vercel.json`)

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/out",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

### Next.js Configuration (`frontend/next.config.js`)

```js
output: "export",  // Required for Vercel static hosting
images: { unoptimized: true },
```

### Steps

1. Connect the GitHub repository to Vercel
2. Vercel auto-detects `vercel.json` at root
3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` — Backend API URL (e.g., `https://fastnet.onrender.com` or your VPS URL)
   - `NEXT_PUBLIC_API_BASE_URL` — Same as above
4. Deploy

**Important limitations of Vercel static export:**
- No server-side API routes (frontend only)
- No WebSocket/Socket.IO support on Vercel
- No middleware
- Backend must be hosted separately (Render, Railway, VPS)
- The frontend communicates with the backend via REST API calls

# 10. Frontend UI/UX

## Theme

The application uses a strict clean light theme across all devices:
- **Background:** Pure white (`#ffffff`)
- **Text:** Black (`#000000`)
- **Accent:** Sky blue (`#0284c7` / `--sky-600`)
- **Dark mode:** Disabled — forced light theme via `theme-provider.tsx` (`forcedTheme="light"`)

This ensures consistent appearance on mobile captive portal users and desktop, eliminating the white-on-phone/dark-on-laptop inconsistency.

## Page Layouts

### Home Page (`/`)
- Hero section with package selection (1Hr/4Hrs/12Hrs/24Hrs)
- M-Pesa phone input with Kenyan format validation (`07XXXXXXXX` or `01XXXXXXXX`)
- Pay with M-Pesa button and Okoa Internet loan button
- Device info panel showing MAC address and connection status
- Success modal on payment completion
- WebSocket listener for real-time `payment_completed` / `payment_failed` events
- 60-second polling fallback for payment status confirmation

### Dashboard Page (`/dashboard`)
Requires authentication. Sections in order:

1. **Active Package + Countdown** (top) — Shows current WiFi package, time remaining countdown, expiresAt, amount, and M-Pesa reference
2. **Notifications** — Real-time payment confirmation notifications, stored in localStorage
3. **Quick Actions** — Buy Package, Get Support buttons
4. **Transaction History** — Actual payment transactions (not loans), paginated, with status badges

### Login Page (`/login`)
- Tabbed interface: Login / Create Account
- Username + password authentication
- Registration with phone validation (Kenyan format)
- JWT token stored in `localStorage` as `user_token`

### Header Navigation
- Brand: FastNet logo + "WiFi billing" tagline
- Desktop nav: Packages, Dashboard, Support + Login/Logout
- Mobile: Hamburger menu with slide-out drawer containing same links
- Auth state persisted via `localStorage` (`user_token`, `user_data`)

## Admin Pages (Route-Based)

### Admin Dashboard (`/admin/dashboard`)
Requires admin authentication. Four metric cards:
1. **Total Revenue** — KES earned from all completed payments
2. **Active Sessions** — Devices currently online via MikroTik IP bindings
3. **Total Vouchers** — Lifetime payment count
4. **Router Status** — Online/offline health indicator

Plus an Active Devices preview table showing MAC, IP, user, and uptime.

### Admin Active Sessions (`/admin/sessions`)
Lists all active hotspot sessions from MikroTik router:
- MAC Address, IP Address, User, Uptime
- **Revoke Access** button per row — disconnects specific MAC via `/api/admin/sessions/:mac/disconnect`
- Search by MAC or IP
- Refresh button

### Admin M-Pesa Transaction Ledger (`/admin/transactions`)
Full audit log of M-Pesa STK push payments:
- Transaction ID, Phone, Amount (KES), Status badge, M-Pesa Ref, Timestamp
- Search by phone, transaction ID, or M-Pesa reference
- Filter by status (All/Completed/Pending/Failed/Refunded)
- Pagination
- **Force Whitelist MAC** action for completed payments that failed to callback

### Admin Manual Device Provisioning (`/admin/devices`)
Manually grant WiFi access to a device:
- MAC Address input field
- Package duration dropdown (1Hr/4Hrs/12Hrs/24Hrs)
- Submit calls `/api/admin/devices/whitelist` to push IP-binding rule to router
- Use case: cash payments, offline scenarios, callback failures

## Frontend-Backend Communication

- **REST API:** All calls go through `apiClient` in `frontend/lib/api.ts`
- **Base URL:** Relative by default (`""`), configurable via `NEXT_PUBLIC_API_BASE_URL` env var
- **WebSocket:** Socket.IO connection for real-time payment/loan/support events
- **Auth:** JWT Bearer token in `Authorization` header for protected routes

## Payment Flow on Frontend

```
1. User enters phone, selects package, clicks "Pay with M-Pesa"
2. Frontend POST /api/payments/initiate → backend creates pending payment + STK Push
3. Backend returns transactionId, mpesaRef (CheckoutRequestID)
4. Frontend stores activeCheckoutId, starts WebSocket listener + 60s polling
5. User enters M-Pesa PIN on phone
6. Safaricom callback → backend updates payment to completed + whitelists MAC on router
7. Backend emits WebSocket payment_completed event
8. Frontend receives event, updates UI to completed, shows success modal
9. Dashboard (if open) receives same event, updates active package + countdown
```

---

# 11. Maintenance Rule

This document must be updated immediately whenever backend API routes, database schemas, MikroTik RouterOS integration scripts, or frontend pages are modified. Keep this file in sync with the codebase at all times.
