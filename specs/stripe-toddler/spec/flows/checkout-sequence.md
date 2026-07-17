# Checkout Sequence Flow

This document details the network, Bluetooth, and internal system interactions during a standard POS transaction.

---

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Toddler as Toddler / Executive
    participant iPad as iPad App (Swift)
    participant Scanner as Barcode Scanner (HID)
    participant Reader as Stripe Reader M2 (BLE)
    participant Backend as Rust Worker (Cloudflare)
    participant KV as Cloudflare KV
    participant D1 as D1 SQLite DB
    participant Stripe as Stripe API

    Note over Toddler, Scanner: 1. Item Scanning Phase
    Toddler->>Scanner: Scans Toy Barcode Sticker
    Scanner->>iPad: Sends raw keystrokes + Carriage Return
    iPad->>iPad: Aggregates buffer and parses Barcode String
    
    iPad->>Backend: GET /api/pos/inventory/{barcode} (Attested Request)
    Backend->>Backend: Validate App Attest Assertion Signature
    Backend->>KV: Fetch item details (key: "item:<barcode>")
    KV-->>Backend: Return name, price, photo URL
    Backend-->>iPad: Return JSON (item details)
    iPad->>iPad: Render photo, name, price, update total. Play sound.

    Note over Toddler, Reader: 2. Payment Initiation Phase
    Toddler->>iPad: Taps "Pay" Button
    iPad->>Backend: POST /api/terminal/payment-intent (Attested Request)
    Backend->>Stripe: POST /v1/payment_intents (Amount, card_present type)
    Stripe-->>Backend: Return PaymentIntent client_secret & ID (pi_xxx)
    Backend-->>iPad: Return client_secret & payment_intent_id

    Note over iPad, Reader: 3. Stripe Terminal Collection
    iPad->>Reader: Stripe Terminal SDK: collectPaymentMethod(client_secret)
    Reader->>Reader: Prompt card tap (LEDs flash)
    Toddler->>Reader: Taps Stripe Terminal Test Card
    Reader->>Stripe: Securely processes card details directly
    Stripe-->>Reader: Card authenticated & payment intent authorized
    Reader-->>iPad: Return authorized payment intent token

    Note over iPad, D1: 4. Capture & Database Logging
    iPad->>Backend: POST /api/terminal/capture (payment_intent_id, items)
    Backend->>Stripe: POST /v1/payment_intents/pi_xxx/capture
    Stripe-->>Backend: Confirm Capture Succeeded
    Backend->>D1: INSERT INTO transactions & transaction_items
    D1-->>Backend: DB Confirm OK
    Backend-->>iPad: Return Capture Success confirmation (transaction ID)

    Note over Toddler, iPad: 5. Celebration Phase
    iPad->>iPad: Trigger celebration view (guitar band video, sound, fireworks)
    Toddler->>iPad: Taps "Go Again" Button
    iPad->>iPad: Reset cart state, revert UI to scanning display
```

---

## Key Phase Breakdown

### 1. Item Scanning Phase
*   **Wedge interception**: The scanner operates as a secondary keyboard. The iPad app intercepts raw text input fast-buffer sequences to avoid triggering user-input fields.
*   **App Attest protection**: The GET query for item lookup is signed with the device's attested key to prevent arbitrary crawlers from scraping the inventory catalog.

### 2. Payment Initiation & Capture
*   **Stripe SDK direct communications**: During card reading (Step 13–15), the Stripe SDK on the iPad communicates directly with Stripe's card processing backend.
*   **Verification**: The backend capture step (Step 17–20) acts as the final ledger validator. It verifies that the captured card amount matches the sum of the inventory items in the cart before confirming write operations to D1.
