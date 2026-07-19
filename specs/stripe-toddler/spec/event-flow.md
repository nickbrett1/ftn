# Event Flow: Stripe Toddler Shop POS

This document defines the event schemas, flows, and asynchronous contracts for the **Stripe Toddler Shop** point of sale integration.

## Bounded Context
* **Context**: `stripe-toddler-pos`
* **Owner**: `nickbrett1`
* **Status**: `draft`

---

## Event Catalog

### 1. `ItemScanned`
* **Type**: Event (Internal UI State Change)
* **Producer**: `job.ipad-pos-client` (via HID barcode scanner input)
* **Consumer**: `job.ipad-pos-client` (cart state controller)
* **Description**: Emitted when a physical barcode sticker is scanned by the barcode scanner.
* **Payload Schema**:
  ```json
  {
    "barcode": "string",
    "scanned_at": "timestamp"
  }
  ```
* **Ordering**: Strict FIFO sequence per POS checkout session.
* **Idempotency**: Scans are additive; scanning the same item twice increases quantity.

### 2. `PaymentIntentCreated`
* **Type**: Event (Integration Event)
* **Producer**: `job.payments-backend` (Rust Worker)
* **Consumer**: `job.ipad-pos-client` (initiates Stripe terminal flow)
* **Description**: Emitted when a Stripe PaymentIntent has been initialized successfully on the Stripe backend.
* **Payload Schema**:
  ```json
  {
    "payment_intent_id": "string",
    "client_secret": "string",
    "amount": "integer",
    "currency": "string"
  }
  ```
* **Ordering**: One per checkout intent.
* **Idempotency**: Unique payment intents are generated per transaction token to prevent double-charging.

### 3. `PaymentCaptured`
* **Type**: Event (Stripe Integration Webhook Event)
* **Producer**: `Stripe API Engine`
* **Consumer**: `job.payments-backend` (captures webhook/terminal callbacks)
* **Description**: Emitted when Stripe successfully captures funds from the terminal card reader.
* **Payload Schema**:
  ```json
  {
    "payment_intent_id": "string",
    "charge_id": "string",
    "status": "succeeded",
    "captured_at": "timestamp"
  }
  ```
* **Ordering**: Out-of-order delivery possible; must be reconciled against intent ID.
* **Idempotency**: Captures are idempotent; backend filters duplicates using `payment_intent_id` as the primary key.

### 4. `TransactionLogged`
* **Type**: Event (Data Sync Event)
* **Producer**: `job.payments-backend`
* **Consumer**: `job.admin-portal` (real-time transaction log sync)
* **Description**: Emitted when a successful transaction is committed to the D1 SQLite database.
* **Payload Schema**:
  ```json
  {
    "transaction_id": "string",
    "payment_intent_id": "string",
    "amount": "integer",
    "items": ["string"],
    "created_at": "timestamp"
  }
  ```
* **Ordering**: FIFO ordered by transaction timestamp.
* **Idempotency**: D1 unique constraints on `payment_intent_id` enforce database-level idempotency.
