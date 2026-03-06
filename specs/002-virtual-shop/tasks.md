# Tasks: 002-Virtual-Shop

## Cleanup
- [x] Delete `webapp/src/routes/consulting` directory.
- [x] Update `webapp/src/lib/components/Footer.svelte`:
    - [x] Remove `HandshakeSolid`.
    - [x] Import `CartShoppingSolid`.
    - [x] Replace "Consulting Services" block with "Shop" block.
    - [x] Update tooltips logic.

## Data Setup
- [x] Create `webapp/src/lib/data/products.js` to store the mock product catalog.

## Route Implementation
- [x] Create `webapp/src/routes/shop/+page.svelte` (Shop listing).
- [x] Create `webapp/src/routes/shop/+page.server.js` (Checkout action).
- [x] Create `webapp/src/routes/shop/success/+page.svelte` (Success message).
- [x] Create `webapp/src/routes/shop/cancel/+page.svelte` (Cancel message).

## Components
- [x] Create `webapp/src/lib/components/ShopDisclaimer.svelte`.
- [x] Create `webapp/src/lib/components/ProductCard.svelte`.

## Styling & UX
- [x] Add the Shop icon to the footer.
- [x] Ensure the shop looks professional with Tailwind CSS.

## Testing
- [x] Manually verify navigation from footer to `/shop`.
- [x] Verify Stripe Checkout redirect for multiple products.
- [x] Verify success/cancel pages.
