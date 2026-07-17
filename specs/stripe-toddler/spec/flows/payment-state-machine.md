# Payment State Machine

This document defines the lifecycle states and state transition triggers for the iPad POS UI, the Stripe PaymentIntent, and the Stripe Terminal Bluetooth connection.

---

## 1. iPad POS User Interface States

```mermaid
stateDiagram-v2
    [*] --> WaitingForScan : App launch & initialization

    WaitingForScan --> CartActive : Barcode scanned & verified in KV
    WaitingForScan --> ErrorScreen : Network error or barcode not in KV

    CartActive --> CartActive : Additional items scanned
    CartActive --> WaitingForScan : All items removed from cart
    CartActive --> ReaderSyncing : Tap "Pay" button

    ReaderSyncing --> AwaitingCardTap : Terminal token retrieved & intent created
    ReaderSyncing --> ErrorScreen : Stripe API error or backend timeout

    AwaitingCardTap --> ProcessingPayment : Card tapped / swiped successfully
    AwaitingCardTap --> ErrorScreen : Card read timeout or card rejected

    ProcessingPayment --> Celebrating : Capture endpoint returns HTTP 200
    ProcessingPayment --> ErrorScreen : Capture fails on Stripe or database write error

    Celebrating --> WaitingForScan : Tap "Go Again" button

    ErrorScreen --> WaitingForScan : Tap "Dismiss" button
```

---

## 2. Stripe PaymentIntent Lifecycle

This state machine traces the Stripe object state inside the Stripe engine.

```mermaid
stateDiagram-v2
    [*] --> RequiresPaymentMethod : Worker creates PaymentIntent via POST /v1/payment_intents (card_present)

    RequiresPaymentMethod --> RequiresConfirmation : iPad SDK triggers collectPaymentMethod
    RequiresConfirmation --> RequiresCapture : Terminal SDK processes and authorizes card (tapped)

    RequiresCapture --> Succeeded : Worker invokes POST /v1/payment_intents/pi_xxx/capture
    RequiresCapture --> Canceled : Timeout or capture verification mismatch (Worker releases block)

    Succeeded --> [*]
    Canceled --> [*]
```

---

## 3. Stripe Reader Bluetooth Connectivity States

Managed by the Stripe Terminal SDK on the iOS client.

```mermaid
stateDiagram-v2
    [*] --> Disconnected : App boot

    Disconnected --> Discovering : App starts checkouts / initialization
    Discovering --> Connecting : Reader M2 discovered via BLE
    Discovering --> Disconnected : Scan timeout

    Connecting --> Connected : Handshake and location registration complete
    Connecting --> Disconnected : BLE connection handshake fails

    Connected --> Disconnected : Bluetooth signal lost / power down
```

---

## State Transition Conditions

### WaitingForScan $\rightarrow$ CartActive
*   **Trigger**: Barcode scanned.
*   **Action**: Backend lookup is successful. Item details are loaded. Sound effects play (e.g., electronic cash register beep).

### ReaderSyncing $\rightarrow$ AwaitingCardTap
*   **Trigger**: Connection token active and `payment_intent` created.
*   **Action**: Reader M2 LEDs flash. iPad displays "Please Tap Card".

### ProcessingPayment $\rightarrow$ Celebrating
*   **Trigger**: Server response from `/api/terminal/capture` returns HTTP 200.
*   **Action**: Play toddler reward animation (bouncing toy images, fireworks, loud celebratory sounds, guitar band video).
