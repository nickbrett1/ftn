# Plan: 002-Virtual-Shop

## Objective
Create a virtual shop at `/shop` on `fintechnick.com` to:
1.  Understand Stripe's APIs by running a virtual shop.
2.  Drive a fleet of autonomous agents that interact with the shop to learn agentic workflows.

## Requirements
-   **Route:** `/shop`.
-   **Navigation:** Accessible via an icon in the footer (shopping cart).
-   **Accessibility:** Open to everyone, no login required.
-   **Stripe Integration:** Use Stripe Test Mode for payments.
-   **Content:** ~24 SKUs (Real and Imaginary).
-   **Disclaimer:** Clearly state that this is a mock shop for testing purposes and does not take real payments or deliver goods.
-   **Persistence:** No persistent state (D1) required for now.
-   **Aesthetics:** Professional look with high-quality imagery or placeholders.

## Removal of Consulting Functionality
-   Remove `/consulting` route and sub-routes (`/consulting/success`, `/consulting/cancel`).
-   Remove "Consulting Services" icon and tooltip from `Footer.svelte`.

## Implementation Strategy

### Phase 1: Cleanup & Setup
-   Remove the consulting route and its logic.
-   Update `Footer.svelte` to replace the handshake icon with a shopping cart icon.
-   Define the product catalog (SKUs).

### Phase 2: Shop Route Implementation
-   Create `src/routes/shop/+page.svelte` and `src/routes/shop/+page.server.js`.
-   Implement the shop UI with product cards.
-   Add the disclaimer prominently.
-   Implement Stripe Checkout integration (server-side action).

### Phase 3: Stripe Webhooks (Optional/Future)
-   Ensure webhooks are ready for agent testing (already partially handled by Stripe's test mode dashboard, but we might want to log them).

### Phase 4: Content & Imagery
-   Sourcing images for the products.
-   Finalizing the 24 SKUs.

## Verification Plan
-   Navigate to `/shop` via the footer icon.
-   Ensure no login is required.
-   Click "Buy" on an item and verify redirect to Stripe Checkout.
-   Complete a test payment and verify redirect back to a success page.
-   Verify that `/consulting` is no longer accessible.
