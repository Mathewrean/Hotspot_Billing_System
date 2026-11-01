# FastNet System Logic Flow

## Maintenance Rule

This document must be updated whenever backend routes, database schemas, or MikroTik integration scripts are modified.

---

## 1. System Architecture Overview

### Components

| Component | Technology | Role |
|---|---|---|
| Frontend | Next.js | User interface, captive portal, payment initiation, status polling |
| Backend | Node.js / Express | API routes, M-Pesa integration, MikroTik integration, WebSocket events |
| Database | PostgreSQL | Payment records, loan records, user activity logs |
| Router | MikroTik RB951Ui-2HnD | Hotspot IP-binding bypass rules for WiFi access control |

### Relationship

Next.js frontend communicates with Node.js backend via REST API and WebSocket (Socket.IO). Node.js backend persists payment records to PostgreSQL and pushes IP-binding rules to MikroTik router via the RouterOS API. Safaricom Daraja API delivers M-Pesa STK push callbacks to the backend callback endpoint.

---

## 2. User Authentication & Captive Portal Flow

1. Device connects to `hotspot-bridge` WiFi network
2. MikroTik router assigns IP via DHCP
3. Device attempts HTTP request; MikroTik captive portal intercepts and redirects to login page
4. User selects package and enters phone number on frontend
5. Frontend initiates payment via POST `/api/payments/initiate`
6. Backend creates pending payment record and dispatches M-Pesa STK push
7. User enters M-Pesa PIN on phone
8. Safaricom delivers callback to backend `/api/mpesa/callback`
9. Backend updates payment status, whitelists MAC on MikroTik, emits WebSocket event
10. Frontend polls payment status or receives WebSocket `payment_completed` event
11. Device gains WiFi access through MikroTik IP-binding bypass rule

---

## 3. Payment & Provisioning Workflow

### Step-by-Step Sequence

```
Phone number entry
      |
      v
STK Push initiation (POST /api/payments/initiate)
      |
      v
Backend validates phone, amount, MAC address
      |
      v
Pending payment record created in PostgreSQL (status: pending)
      |
      v
OAuth access token obtained from Safaricom Daraja API
      |
      v
STK Push dispatched to user phone
      |
      v
User enters M-Pesa PIN
      |
      v
Safaricom delivers callback (POST /api/mpesa/callback)
      |
      v
ResultCode === 0?
      |
      +-- No: Mark payment failed/cancelled in database
      |
      +-- Yes: Idempotency check (skip if already completed)
               |
               v
               Extract MAC address and amount from payment record
               |
               v
               Determine timeLabel from amount (30=24Hrs, 20=12Hrs, 15=4Hrs, default=1Hr)
               |
               v
               Invoke whitelistMAC(macAddress, timeLabel)
               |
               v
               MikroTik: /ip/hotspot/ip-binding/add mac-address=<MAC> type=bypassed comment=FastNet <timeLabel>
               |
               v
               Update payment status to completed, set expiresAt
               |
               v
               Emit WebSocket payment_completed event
               |
               v
               Return success response to Safaricom
```

### Route: POST /api/payments/initiate

**Request body:** `{ phone, amount, macAddress }`

**Validation:**
- Phone must match `2547XXXXXXXX` format
- Amount must be whole number between 1 and 1000 KES
- MAC address must match standard format or be an allowed placeholder

**Placeholder MAC handling:** If MAC is a placeholder (`LOADING...`, `UNAVAILABLE`, `MAC_NOT_FOUND`, `UNKNOWN`, `00:00:00:00:00:00`), a deterministic MAC is derived from the phone number hash.

**Database:** Creates `payment` record with `status: pending`, `macAddress`, `phone`, `amount`, `transactionId`.

**STK Push:** Calls `stkPush(phone, amount, transactionId)` from `config/mpesa.js`. Persists `CheckoutRequestID` as `mpesaRef` for callback correlation.

### Route: POST /api/mpesa/callback

**Idempotency guard:** If `ResultCode === 0` and payment already `completed`, returns success immediately to prevent duplicate processing on Safaricom retry.

**Failure handling (`ResultCode !== 0`):** Marks payment as `failed` in database, emits `payment_failed` WebSocket event.

**Success handling (`ResultCode === 0`):**
1. Extract `Amount` and `MpesaReceiptNumber` from callback metadata
2. Find payment by `mpesaRef` (CheckoutRequestID)
3. Determine `timeLabel` from amount mapping
4. Call `whitelistMAC(macAddress, timeLabel)` to push IP-binding rule to MikroTik
5. On whitelist success: update payment to `completed`, set `expiresAt`, emit `payment_completed` WebSocket
6. On whitelist failure: return 500 error

### Module: config/mpesa.js

- `getAccessToken()`: OAuth client credentials grant to Daraja API
- `stkPush(phone, amount, transactionId)`: Builds STK push payload with timestamp, password, CallBackURL from env; posts to `/mpesa/stkpush/v1/processrequest`

### Module: config/mikrotik.js

- `getClient()`: Returns `RouterOSAPI` instance using `MIKROTIK_HOST`, `MIKROTIK_USER`, `MIKROTIK_PASSWORD`, `MIKROTIK_PORT` env vars; returns null if disabled or missing credentials (dev mode fallback)
- `whitelistMAC(macAddress, timeLabel)`: Connects to router, adds `/ip/hotspot/ip-binding/add` rule with `type=bypassed`, closes connection
- `disconnectByMac(macAddress)`: Removes active hotspot session by MAC address
- `disconnectAllUsers()`: Removes all active hotspot sessions
- `getActiveDevices()`: Returns list of active hotspot sessions with MAC, IP, user, uptime
- `getStatus()`: Returns router status and connected user count
- `getDeviceInfoByIP(ipAddress)`: Returns device info for a given IP from active sessions

**Patches applied:**
- `Channel.processPacket` patched to skip MikroTik `!empty` replies (prevents `UNKNOWNREPLY` crash)
- `safeWrite()` wrapper catches `UNKNOWNREPLY` and returns `[]`
- All `client.write()` calls use `safeWrite()` with array-style parameters (`=key=value`)

### Environment Variables

| Variable | Description | Local Dev | Render |
|---|---|---|---|
| MPESA_CALLBACK_URL | Public HTTPS URL for Safaricom callbacks | cloudflared/ngrok tunnel to localhost:5000 | https://fastnet.onrender.com/api/mpesa/callback |
| MIKROTIK_ENABLED | Enable router integration | true | false |
| MIKROTIK_HOST | Router IP address | 192.168.88.1 | 192.168.88.1 |
| MIKROTIK_USER | Router API username | admin | admin |
| MIKROTIK_PASSWORD | Router API password | 29541227006mikrotik | 29541227006mikrotik |
| MIKROTIK_PORT | Router API port | 8728 | 8728 |

---

## 4. Verification Summary

- MikroTik router at 192.168.88.1 reachable via ping
- `RouterOSAPI` connection established successfully
- `getStatus()`: Connected, 0 active users
- `getActiveDevices()`: Empty (no active sessions)
- `whitelistMAC('00:00:5E:B8:22:8A', '24Hrs')`: Binding confirmed on router as `bypassed` with comment `FastNet 24Hrs`
- M-Pesa callback URL configured via cloudflared tunnel for local development; Render deployment uses its own fixed public URL
- End-to-end simulated callback test passed: callback received, payment status updated to `completed`, WebSocket `payment_completed` emitted with 136ms latency
