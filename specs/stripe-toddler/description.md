OK, we're going to be creating a set of design docs for an entirely new project. I've created the containing folder under specs/stripe-toddler. We'll create all the artifacts there, validate them and only when we feel they're good will we use genproj via MCP to create our initial repo and move these files there. Then I'll continue implementing in that repo to build out the project.

THese artifacts need to be complete in terms of describing the project specification, covering topology (what is the overall set of dependency and where are they being deployed), apis between components, schemas for data stores and key data structures, flows for communication across the system, UI mocks and a capture of expected capacity needs. But they also don't need to specify every detail, consider them the design doc, not a full coding spec. A senior engineer on reading the artifacts should feel confident that they can fully implement the system, though would expect to make various judgments on details, e.g. algorithms to use, styling details in UI, how to handle error cases, addition of logging, etc...

Here's a good directory hierarchy proposal to store the various artifacts with some possible example files I expect we might need based on my overview description below. But we should add more, e.g. diagrams as appropriate to explain.

spec
├── topology/
│ ├── component-graph.mmd # Mermaid.js top-level system nodes and DAG configs
│ └── deployment-targets.md # Infrastructure mapping (Cloudflare, iPad, Homelab)
├── api/
│ ├── worker-openapi.yaml # OpenAPI/Swagger spec for the Rust backend
│ └── swift-protocols.md # Core interface contracts for the iOS app
├── data-architecture/
│ ├── d1-schema.sql # SQLite relational definitions for analytics
│ ├── kv-layout.json # Key-Value access patterns for inventory
│ └── domain-models.rs # Core Rust structs / Swift Codable types
├── flows/
│ ├── checkout-sequence.md # Step-by-step transaction walkthroughs
│ └── payment-state-machine.md # Lifecycle handling for intents and hardware
├── ui/
│ └── wireframes/ # Layouts for Checkout and Admin screens
└── capacity/
└── load-model.md # Dataset sizing, retention, and write IOPS

For wireframes we should generate low fidelity Excalidraw files. Mermaid.js is appropriate for other diagrams.

# Goals and Overview

We are building a simple payment system aimed to help achieve two goals:

1. Allow me learn about Stripe and its APIs and services
2. Provide a fun experience for a 3-year old toddler.

The system will have two user interfaces. One is on an iPad, and be represented as an iPad application which will provide a point of sale workflow for the toddler. This ipad app will connect over Bluetooth to a Tera Mini 1D 2D QR Wireless Barcode Scanner which will allow items for the shop to be scanned. There will also be a Bluetooth connection to a Stripe Reader M2, and payments can be made using Stripe Terminal Test Cards. The toddler will scan items (typically toys or other household objects) which have had a barcode sticker attached, and they will appear on the iPad application with a price. When payment is made, a charge is made via Stripe and the transaction logged in a backend service. Transactions should always succeed. The app will be designed for a toddler, with bright colors, strong feedback, big buttons, etc...

There will also be an admin service that allows for inventory management, with the creation of new inventory by associating a photo and then enable the generation of a barcode. The backend services will also power a view into various sales analytics, e.g. past transaction history, by pulling data down from Stripe as necessary. Note that the actual frontend display for this sales analytics screen is out-of-scope for this project and will be built separately as part of fintechnick.com (which calls this backend); however, a wireframe of the admin screen is included in this repository to define and verify the service interfaces.

# iPad App

The iPad App will be simple, and designed with minimal words, big buttons and use of color. On loading, it will present a colorful display and await the first item scan.
Each item scan will show the photo of the item, as well as its name and price. Prices will be integer values to make interpretation easy, e.g. $1 or $5. A total will show the full amount. There will be no tax or additional charges. There will be an easy button to remove an item from the checkout.
When a credit card is scanned, a button will appear to confirm the transaction. Then a celebration will occur, be creative - fireworks, flashing and bouncing images of the items sold could all be used. Sound as well, would be good. A little video of a guitar band playing could work well as a celebration of the sale.
Once complete, the screen will present a button to 'Go Again' and will revert back to the accept new scans.

# Payments Backend

To retrieve information on inventory, and make payments, the iPad will communicate to a backend server. We'd like to use Cloudflare Workers for this, as we have experience hosting apps there. We'd also like to use Rust as we'd like to better understand its capabilities in cloudflare, my past workers have been in javascript / typescript. There will need to be a mechanism to send a charge to Stripe, and also log it in our D1 database that we can use for analytics. This backend should also provide a few methods for retrieving this transaction history for analytics for the admin website. I expect we will not be able to use the Stripe client-side API given our use of Rust and Cloudflare, but given the simplicity of our requests we can directly make HTTP calls.

# Admin Backend

The admin backend is a service that enables two different use-cases:

1. It needs to allow for inventory management. That will involve allowing for the upload of photos for new inventory items (or editing existing ones), setting their price, generating a barcode for the item and allowing bar codes to be easily printed. I have 'Avery Easy Peel Printable Address Labels with Sure Feed, 1" x 2-5/8" Customizable Stickers'

2. It needs to allow me to see analytics about the store. This can be simple to start with, just a log of transactions would be fine.

The user of this service, the admin website, will run as part of www.fintechnick.com and provide a visual display on top, but the heavy lifting will be done by this backend.

# Authentication

The iPad App will use a generated secret security key from https://fintechnick.com/api-keys that is authenticated by the payments backend. This will ensure that only the iPad app can make requests to the payments backend. We will ensure that the iPad App is only deployed on my personal devices.

For the iPad to payments backend authentication, we should use Apple App Attest to ensure the request is coming from the app itself. We will restrict installation of the app to devices I control.

# Architectural Decisions & Specification Plan

## Agreed Architectural Decisions

1. **Stripe Terminal Integration**: Standard Stripe Terminal SDK workflow.
   - The iPad App integrates the Stripe Terminal iOS SDK to connect to the M2 reader and collect card information.
   - The Rust Cloudflare Worker backend manages connection tokens, creates `PaymentIntents` (with the `card_present` payment method type), and captures payments upon authorization.
2. **Backend Structure**: Single Monolithic Worker.
   - A single Rust-based Cloudflare Worker will serve both the iPad POS API endpoints and the Admin/Inventory API endpoints.
3. **Data Stores**: Hybrid KV & D1.
   - **Cloudflare KV**: Stores inventory items (metadata keyed by barcode, e.g., `item:<barcode>`) for extremely fast edge retrieval.
   - **Cloudflare D1**: Stores sales transaction logs and history for relational SQLite queries and analytics.
4. **Barcode Scanner**: Keyboard Wedge Mode (HID).
   - Paired via Bluetooth as a keyboard. The iPad App captures global keystrokes and processes the barcode string once a carriage return (`\r` or `\n`) is scanned.
5. **Barcode Printing & Selection Filters**: Browser-side CSS Print Layout with Selectors.
   - The Admin Web UI handles printing layout using CSS `@media print` rules, formatted exactly for Avery 1" x 2-5/8" address labels (30-up templates: 3 columns, 10 rows).
   - **Print Filters**: The UI provides filters to select what to print:
     - *Added this session (Default)*: Automatically selects all toys registered in the current active web browser session.
     - *All Toys*: Selects the entire inventory database for bulk printing.
     - *Custom Selection*: Allows the admin to check/uncheck individual checkboxes in the corners of each label card to print specific tags (e.g. for replacing torn/broken labels).
6. **Wireframe Format**: Raw Excalidraw JSON.
   - Low-fidelity wireframes will be saved as raw `.excalidraw` files under `ui/wireframes/` so they can be imported directly into [excalidraw.com](https://excalidraw.com).

## Proposed Spec File Generation Plan

We will generate the specification files under the `spec/` sub-directory:

1. **Topology**
   - `spec/topology/component-graph.mmd`: Mermaid.js DAG showing components, interfaces, and physical nodes.
   - `spec/topology/deployment-targets.md`: Infrastructure configuration and mapping (Xcode deployment, Bluetooth links, Worker wrangler setups).
2. **APIs**
   - `spec/api/worker-openapi.yaml`: OpenAPI 3.0.0 yaml specification for all backend endpoints (including Stripe, App Attest, inventory, and analytics).
   - `spec/api/swift-protocols.md`: Swift protocol definitions for BLE scanning, terminal reader connections, and POS state management.
3. **Data Architecture**
   - `spec/data-architecture/d1-schema.sql`: SQL schemas for SQLite transaction records and analytic aggregations.
   - `spec/data-architecture/kv-layout.json`: Key schemas, JSON formats, and access paths for inventory items in Cloudflare KV.
   - `spec/data-architecture/domain-models.rs`: Rust structs mapping to KV JSON and D1 SQL records (with Serde derives).
4. **Flows**
   - `spec/flows/checkout-sequence.md`: Sequence diagrams (Mermaid.js) detailing scan-to-checkout and Stripe Terminal processing steps.
   - `spec/flows/payment-state-machine.md`: State transition charts for POS states, reader connectivity, and Stripe PaymentIntent.
5. **UI Wireframes**
   - `spec/ui/wireframes/checkout-screen.excalidraw`: Raw Excalidraw JSON mock for the toddler POS UI.
   - `spec/ui/wireframes/admin-screen.excalidraw`: Raw Excalidraw JSON mock for the executive inventory/analytics dashboard.
6. **Capacity**
   - `spec/capacity/load-model.md`: Detailed sizing assumptions for low-frequency writes, edge latency requirements, and memory overheads.
