# Deployment Targets & Infrastructure Mapping

This document details the physical environments, hardware requirements, hosting platforms, and deployment configurations for all components of the Stripe Toddler system.

---

## 1. Client Environment (iPad POS Application)

| Attribute | Specification |
| :--- | :--- |
| **Platform** | Apple iOS (iPadOS) |
| **OS Version** | iOS 16.0 or higher (required for DeviceCheck App Attest APIs) |
| **Hardware** | Any iPad supporting iOS 16+ with Bluetooth Low Energy (BLE 4.2+) |
| **Deployment Method** | Xcode ad-hoc provisioning profile or Apple TestFlight. Restricted to developer-controlled devices. |
| **Stripe Terminal SDK** | Stripe Terminal iOS SDK (v3.0.0 or higher) |

---

## 2. Physical Peripherals

### 2.1 Tera Mini Barcode Scanner
*   **Connection Mode**: Bluetooth HID (Human Interface Device) / Keyboard Wedge Mode.
*   **Pairing**: Paired directly via iPadOS System Settings.
*   **Behavior**: When a barcode is read, the scanner simulates standard keyboard keypress events at high speed, appending a carriage return (`\r` or `\n`) at the end of the payload.

### 2.2 Stripe Reader M2
*   **Connection Mode**: Bluetooth Low Energy (BLE) Mode.
*   **Pairing**: Handled dynamically in-app via the Stripe Terminal SDK (do *not* pair via iPadOS system settings).
*   **Power/Provisioning**: Charged and registered to the merchant's Stripe account via Terminal location settings.

---

## 3. Edge Backend (Cloudflare Workers Platform)

All backend endpoints are consolidated into a single monolithic Cloudflare Worker written in Rust and compiled to WebAssembly (Wasm).

### 3.1 Cloudflare Worker (Rust / Wasm)
*   **Runtime**: Cloudflare Workers runtime.
*   **Compilation Toolchain**: Rust `cargo` with `worker` crate, deployed via Cloudflare `wrangler` CLI.
*   **Routing**: Handles matching routes for both the iPad app (under `/api/pos/*`) and the Admin tools (under `/api/admin/*`).

### 3.2 Cloudflare KV Namespace (Inventory Store)
*   **Name**: `STRIPE_TODDLER_INVENTORY`
*   **Purpose**: Stores inventory meta-objects keyed by scanned barcode strings.
*   **Access Pattern**: High-volume, low-latency edge-replicated reads.

### 3.3 Cloudflare D1 Database (Analytics Database)
*   **Name**: `stripe_toddler_analytics`
*   **Engine**: Relational SQLite hosted natively on Cloudflare's global infrastructure.
*   **Purpose**: Relational storage for logging checkout events and transactions to power analytical aggregation queries.

---

## 4. Admin Portal Host

### 4.1 Admin Web App
*   **Hosting Domain**: Subpage on `https://www.fintechnick.com`
*   **Static Assets**: Hosted on the primary `fintechnick.com` hosting server (or Cloudflare Pages).
*   **API Interaction**: The client browser loads admin assets and invokes endpoints directly on the Rust Cloudflare Worker using an API key for authentication.

---

## 5. Network & Firewalls

```
[ iPad POS App ] --------( HTTPS / Port 443 ) --------> [ Cloudflare Edge Worker ]
                                                               |
                                                               +---> [ Stripe REST API ]
                                                               +---> [ Apple App Attest API ]
```

*   **SSL/TLS**: All outbound and inbound traffic must be encrypted over TLS 1.3.
*   **API Whitelists**: The Rust worker requires outbound network access to `api.stripe.com` and Apple's attestation verification domains.
