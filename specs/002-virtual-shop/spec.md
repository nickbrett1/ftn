# Spec: 002-Virtual-Shop

## Product Catalog (Mock SKUs)

The shop will feature a variety of products related to finance, technology, and art, some real, some imaginary.

### 1. Finance & Markets
- **Wall Street Charging Bull Statue (Replica)** - $2,500.00
- **Bear Market Survival Kit** - $49.99
- **Golden "Buy the Dip" Button** - $19.99
- **Framed Stock Ticker Tape (1929 Crash)** - $450.00
- **Quantitative Easing Printing Press (Desktop Model)** - $88.00

### 2. Crypto & Digital Assets
- **1 Bitcoin (Physical Commemorative Coin)** - $15.00
- **1 Ethereum (Digital Certificate of Mock Ownership)** - $1,200.00
- **Dogecoin Plushie** - $24.99
- **HODL Hoodie** - $55.00
- **NFT of a Pixelated Bull** - $10,000.00 (Mock transaction)

### 3. Tech & Engineering
- **Svelte 5 "Runes" Keychain** - $8.00
- **Autonomous Agent Brain (Circuit Board Model)** - $120.00
- **"Hello World" Neon Sign** - $75.00
- **Mechanical Keyboard (Blue Switches)** - $130.00
- **Vintage Floppy Disk (Signed by "Satoshi")** - $1,000,000.00 (High-roller mock item)

### 4. Lifestyle & Consulting (Formerly separate)
- **1 Hour Virtual Consulting (Mock)** - $100.00
- **"Trust Me, I'm an Engineer" Mug** - $14.00
- **Fintech Nick's Secret Sauce (Digital Guide)** - $29.00

### 5. Imaginary / Fun
- **Time Machine (Beta)** - $5,000,000.00
- **Invisible Cloak (Clearance)** - $999.00
- **Bag of Magic Internet Money** - $1.00
- **Jar of Liquid Liquidity** - $12.50
- **Infinite Loop (Physical Loop of Wire)** - $5.00
- **The "Everything" App (Mock Access Key)** - $0.99

## Technical Specification

### Route: `/shop`
- **Frontend:** A grid of cards (`Card.svelte`) displaying product image, name, price, and a "Buy Now" button.
- **Backend:** `+page.server.js` with a `checkout` action.

### Stripe Integration
- **Secret Key:** `process.env.STRIPE_SECRET_KEY`.
- **Session:** Create a Stripe Checkout session for the selected product.
- **Success/Cancel URLs:** `/shop/success` and `/shop/cancel`.

### Image Strategy
- Use placeholder images (e.g., `https://placehold.co/600x400?text=Product+Name`) if real images aren't available.
- Link to specific stock photos if possible.

### Disclaimer Component
- A fixed or prominent banner at the top of the shop:
  > **MOCK SHOP:** This is a demonstration site for testing agentic workflows and Stripe API integrations. No real payments are processed, and no goods will be delivered. Use Stripe Test Card numbers for checkout.
