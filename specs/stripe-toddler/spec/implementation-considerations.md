# Implementation Considerations
### Stripe Toddler — Pre-Implementation Reference

> This document is a **human-facing reference** — a thinking document that captures constraints, open questions, tooling gaps, and decision rationale relevant to the implementation of this project. It is intended to be **reviewed and annotated by a human**, who will then provide it as context to an AI agent that will generate the actual step-by-step implementation plan. It does not itself need to be machine-readable or prescriptive. When in doubt, lean towards capturing nuance rather than brevity.

---

## 1. Repository Structure

### Decision: Standalone Repository, Monorepo Layout

The project will live in a **new, standalone GitHub repository** separate from the `ftn` monorepo. The repository will contain both the iOS iPad app and the Rust Cloudflare Worker backend as peer top-level folders.

**Proposed directory layout:**
```
stripe-toddler/              # repo root
├── ios/                     # SwiftUI iPad POS app (Xcode project)
│   └── StripeToddlerPOS/    # Xcode project package
├── worker/                  # Rust Cloudflare Worker
│   ├── src/
│   └── wrangler.toml
├── specs/                   # Spec artifacts (symlinked or copied from ftn)
├── .circleci/               # CI/CD pipeline (worker only initially)
├── .devcontainer/           # Node.js devcontainer for worker dev
├── doppler.yaml             # Doppler secrets config
└── README.md
```

### ⚠️ Constraint: iOS and Rust are Different Build Environments
The iOS Xcode project and the Rust worker have fundamentally different toolchains:
- **Rust Worker**: builds inside the Linux devcontainer via `cargo` + `wrangler`.
- **iOS App**: must be built natively on macOS via Xcode. It cannot be built inside the devcontainer.

Any implementation plan must clearly delineate which steps run **inside the devcontainer** vs. **on the host Mac**.

### Ordering: genproj First, Xcode Project Second

A key ordering decision is whether to create the Xcode project first and then scaffold the rest of the repo around it, or vice versa. **The correct order is genproj first, Xcode second**, for the following reasons:

- If you run genproj first, the repository already has an identity — a defined folder structure, a `.gitignore`, a `README`, a devcontainer — before Xcode touches it. Xcode then creates its project into the pre-existing `ios/` subfolder and it lands cleanly inside the established structure, immediately tracked by Git.
- If you run Xcode first, you end up with two things that independently want to define top-level repo structure, and someone has to reconcile them. Xcode is opinionated about what it puts at the root of a project directory.
- genproj can also commit the initial scaffold, so the very first commit in the repo is a clean, intentional baseline — not Xcode's generated boilerplate mixed with config files.

**The recommended bootstrap sequence is:**
1. Generate the repo via genproj (in the devcontainer or locally).
2. Push the initial commit to GitHub.
3. Clone the repo on the Mac Studio.
4. Open the repo in VS Code, which launches the devcontainer automatically.
5. With the devcontainer running and the xcode-native bridge active, open Xcode on the Mac and use `File → New → Project` — targeting the repo's `ios/` subfolder as the save location.
6. The Xcode project is now inside the repo, tracked by Git, and immediately accessible to the agent via the xcode-native MCP.

This avoids any merging step and ensures the repo structure is intentional from the first commit.

---

## 2. Bootstrap — genproj MCP

### Use genproj to Scaffold the Starter Repo

The `fintechnick` genproj MCP tool (`generate_project`) can scaffold a starter project with pre-configured capabilities. Before manually creating any configuration files, **always check if genproj can generate them**.

**Relevant capabilities available in genproj:**

| Capability ID | Provides |
|---------------|----------|
| `coding-agents` | Antigravity CLI, MCP config, SSE proxy |
| `devcontainer-node` | Full devcontainer with post-create scripts |
| `devcontainer-rust` | Rust toolchain devcontainer |
| `circleci` | `.circleci/config.yml` template |
| `doppler` | `doppler.yaml` config, `common` project secret injection |
| `cloudflare-wrangler` | Wrangler worker config (supports `rust` workerType), **`cloud_login.sh`** script that runs on devcontainer build to authenticate wrangler automatically |
| `dependabot` | Automated GitHub dependency updates |
| `editor-tools` | VS Code extensions and settings |
| `gitguardian` | Secret scanning in CI |

### ⚠️ genproj Gap — No iOS/Xcode Capability, and That's Fine

genproj has **no capability for bootstrapping an Xcode/iOS project**, but this is not really a gap worth filling. genproj's value is in generating portable, text-based config files (devcontainer JSON, CI YAML, Doppler config). An Xcode project is a fundamentally different kind of artifact:

- The `.xcodeproj` bundle (specifically `project.pbxproj`) is a complex Apple-proprietary format that encodes every file reference, build phase, signing configuration, capability, and target dependency. It is not sensibly hand-templated.
- Xcode's own "New Project" wizard is the correct tool for this — it handles the right defaults for device target, SwiftUI vs UIKit, deployment target, and entitlements interactively.
- Even `swift package init` produces something subtly different from a full Xcode project and still needs manual Xcode configuration afterward.

**Required manual step:** Create the Xcode project on the Mac host (`File → New → Project → App → SwiftUI`) before the agent workflow can take over via the `xcode-native` MCP. This is a one-time, five-minute manual action — not a gap that needs tooling to solve.

---

## 3. Xcode MCP — Capabilities and Boundaries

The `xcode-native` MCP bridge connects the agent to an **already-open Xcode project** on the macOS host via an SSE proxy running on port `9876`.

### What the Agent CAN Do via Xcode MCP

| Tool | Purpose |
|------|---------|
| `XcodeWrite` | Create new Swift source files |
| `XcodeUpdate` | Edit existing Swift source files (string replacement) |
| `XcodeRead` / `XcodeLS` / `XcodeGlob` | Navigate and read the project tree |
| `XcodeMakeDir` | Create source group folders |
| `XcodeRM` / `XcodeMV` | Delete/move files |
| `BuildProject` | Trigger a full Xcode build and capture errors |
| `RunAllTests` / `RunSomeTests` | Execute XCTest suites |
| `RunCodeSnippet` | Execute Swift snippets in the context of a file |
| `RenderPreview` | Render SwiftUI canvas previews |
| `XcodeListNavigatorIssues` | List current compiler errors/warnings |
| `GetBuildLog` | Read the full build log |

### ⚠️ What Requires Manual Intervention on the Mac Host

The following operations **cannot be performed by the agent** and require direct action by the developer on the macOS host:

| Action | Why Manual | Notes |
|--------|-----------|-------|
| Create the initial Xcode project | genproj has no Xcode capability | One-time setup |
| Add Swift Package Manager dependencies | No SPM management in MCP | Use Xcode SPM UI or `Package.swift` |
| Configure signing & provisioning profiles | Done in Xcode GUI / free Apple ID sufficient | See §4 |
| Set deployment target, bundle ID, entitlements | Project-level settings not editable via MCP | Set once in Xcode |
| Add Stripe Terminal SDK | SPM dependency | `https://github.com/stripe/stripe-terminal-ios` |
| Device pairing and physical test runs | Requires Mac UI interaction | See §6 |

### ⚠️ Constraint: MCP Connection Requires Active Xcode Session

The `xcode-native` bridge only functions when:
1. Xcode is **open** on the host Mac.
2. The **local Xcode bridge daemon** is running (exposing the SSE server on port `9876`).
3. The **relevant project/workspace is the active Xcode window**.

If the connection drops (`MCP error -32000: Connection closed`), it means the bridge is offline on the host — not a network issue inside the devcontainer. The fix is always to restart the bridge daemon on the Mac.

---

## 4. Apple Developer Account — Free Apple ID Sufficient to Start

### Clarified Status: Paid Membership Not Required for Personal Device

Installing the app on a **single, personally-owned iPad** does not require the paid Apple Developer Program ($99/year). A **free Apple ID** connected to Xcode is sufficient for sideloading onto your own device. The key constraint with a free account is that the signing certificate expires every **7 days**, after which the app will stop launching until you plug the iPad into the Mac and re-sign via Xcode. For a POS app used occasionally, this is probably acceptable.

The paid membership becomes relevant only if:
- You want to distribute to someone else's device (ad-hoc profile for a specific UDID).
- The 7-day re-signing cycle becomes genuinely disruptive.
- You want TestFlight as a distribution mechanism.

### Apple Pay — Not Required

Apple Pay in this context is **not an entitlement the app needs to hold**. When a customer taps their iPhone or Apple Watch to the Stripe Reader M2, that contactless transaction (including Apple Pay) is handled entirely by the Stripe Terminal SDK and the reader's own NFC hardware. The app developer needs no PassKit entitlement and no Merchant ID for this. PassKit would only be needed if the iPad *itself* were acting as a tap-to-pay terminal — that is not the architecture here.

### App Attest — Not Paywalled

App Attest (DeviceCheck) is available with a free developer account on real devices. It is not restricted to paid Developer Program members. The same 7-day certificate limitation applies, but there is no additional Apple paywall for this feature.

### Minimum Required Setup (Manual, One-Time)
These are the only steps genuinely required before running on a real iPad:

1. **Sign into Xcode with your Apple ID**: In Xcode → Settings → Accounts — add the Apple ID, Xcode handles certificate generation automatically.
2. **Register the iPad**: Plug the iPad into the Mac, Xcode will detect it and prompt to register.
3. **Set the bundle ID**: In the Xcode project settings → Signing & Capabilities, set a unique bundle identifier (e.g. `com.nickbrett.stripetoddler`).
4. **Trust the developer on the iPad**: First launch after sideload requires Settings → General → VPN & Device Management → trust the developer certificate.

That's it. No Apple Developer portal interaction, no provisioning profile management — Xcode handles all of this automatically with a free account.

> [!NOTE]
> If the 7-day re-signing cycle becomes a real annoyance after the app is working, enrolling in the paid program at that point is a straightforward upgrade. It does not need to be done upfront.

---

## 5. Secrets Management — Doppler

### Current State: Doppler is Active on this Machine
`doppler` CLI is installed and authenticated in this devcontainer. The existing `ftn` project uses Doppler for all secret injection.

### Doppler Access for Agent Workflows
The agent **can** run `doppler` CLI commands to:
- Create a new project (`doppler projects create`)
- Create environments (`doppler environments create`)
- Set secrets (`doppler secrets set KEY=VALUE`)
- Read secrets (`doppler secrets get KEY`)

> [!NOTE]
> The agent should confirm Doppler auth is active before attempting secret operations: `doppler me`

### Doppler 'common' Project — Shared Secrets

There is an existing Doppler project called **`common`** that holds secrets shared across all projects. The genproj post-create scripts automatically pull from `common` and inject these into any new project's Doppler config. This means several secrets do not need to be created manually for this project — they will be inherited.

**Secrets inherited from `common` (no action needed):**

| Secret Key | Purpose |
|------------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler deployment auth |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler config |

### Secrets Required — New for This Project

The following secrets are specific to the `stripe-toddler` Doppler project and must be created manually:

| Secret Key | Purpose | Source |
|------------|---------|--------|
| `STRIPE_SECRET_KEY` | Stripe API auth for payment intents | Stripe Dashboard |
| `STRIPE_PUBLISHABLE_KEY` | Client-side Stripe init | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Validate webhook payloads | Stripe CLI / Dashboard |
| `STRIPE_TERMINAL_LOCATION_ID` | Terminal location (see §7) | Stripe Dashboard |
| `ADMIN_API_KEY` | Admin portal auth for Worker | Generated |

> [!CAUTION]
> Never commit any of these values. All CI/CD steps must inject secrets via Doppler or CircleCI environment variables — never `.env` files checked into Git.

---

## 6. Cloudflare Worker — Wrangler is Already Configured

### Current State: Wrangler Available and Authenticated
The developer has an active Cloudflare account and has previously used Wrangler. Wrangler authentication inside the devcontainer is handled automatically — genproj generates a `cloud_login.sh` script that runs as part of the devcontainer post-create setup, so the container is authenticated to Cloudflare from the moment it starts. No manual `wrangler login` step is needed.

### Worker Development Workflow
The Rust worker can be developed entirely inside the devcontainer:
```bash
# Inside devcontainer
cargo build --target wasm32-unknown-unknown
wrangler dev    # local emulation only
```

Although `wrangler deploy` can be run from within the devcontainer, **the preferred deployment workflow is CircleCI only**. Deploying exclusively via CI ensures all tests and linting have passed before any code reaches production. Manual deploys from the devcontainer are reserved for emergencies only and should be treated as an exception, not a pattern.

### D1 Database Setup (Manual Step on First Deploy)
The `stripe_toddler_analytics` D1 database must be created via Wrangler before the Worker can access it in production:
```bash
wrangler d1 create stripe_toddler_analytics
# Note the database_id and add to wrangler.toml
wrangler d1 execute stripe_toddler_analytics --file ./migrations/initial.sql
```

### KV Namespace Setup (Manual Step on First Deploy)
```bash
wrangler kv:namespace create STRIPE_TODDLER_INVENTORY
# Note the id and add to wrangler.toml
```

### ⚠️ Miniflare Local Environment — Separate Datastores

`wrangler dev` uses **Miniflare** as a local emulation layer. Miniflare maintains its own local D1 (a SQLite file on disk) and KV (local filesystem store) that are **completely separate** from the production Cloudflare datastores. This has caused problems in the past and is worth planning for:

- Running migrations against the production D1 does **not** populate the local Miniflare D1. Migrations must be run separately against the local environment:
  ```bash
  wrangler d1 execute stripe_toddler_analytics --local --file ./migrations/initial.sql
  ```
- Similarly, any KV seed data (e.g. test inventory items) must be written to the local KV store explicitly:
  ```bash
  wrangler kv:key put --local --binding=STRIPE_TODDLER_INVENTORY "barcode-123" '{"name":"Duck","price":50}'
  ```
- The local Miniflare state is stored under `.wrangler/state/` in the project directory. This should be added to `.gitignore`.
- When switching between `wrangler dev` (local) and testing against staging/production, be aware which datastore you are actually hitting.

The implementation plan should include a local seed script or migration helper that initialises both the local D1 schema and a set of test KV inventory items, so the local dev environment is immediately usable without manual data entry.

---

## 7. Stripe Terminal — First-Time Setup Required

### Current Status: Stripe Account Exists, Terminal Not Configured

Before the iPad app can connect to the Stripe Reader M2, the following Stripe setup must be completed (all via Stripe Dashboard, manual):

1. **Enable Stripe Terminal** on the account.
2. **Create a Terminal Location**: A named physical location (e.g. "Home Studio") that the reader is assigned to.
3. **Register the Stripe Reader M2** to the location (done in-app via Terminal SDK on first launch).
4. **Obtain the Location ID** and store it in Doppler as `STRIPE_TERMINAL_LOCATION_ID`.

> [!NOTE]
> The Stripe Reader M2 does NOT pair via Bluetooth system settings. It pairs dynamically in-app via the Stripe Terminal iOS SDK. The first in-app pairing flow requires the reader to be powered on and in pairing mode, and the iPad to have network access to Stripe's API.

---

## 8. CI/CD Strategy — Backend Only

### Decision: CircleCI for Rust Worker; xcode-native MCP for iOS Build Verification

**CircleCI will be used for the Rust Worker only:**
- Lint (`cargo clippy` — Rust's official linter, catches non-idiomatic patterns and potential bugs beyond what the compiler enforces)
- Unit tests (`cargo test`)
- WASM build verification
- Wrangler deploy to production (on `main` merge)

**genproj can scaffold the initial `.circleci/config.yml`** using the `circleci` capability combined with `cloudflare-wrangler`.

### iOS Build and Test — via xcode-native MCP, Not Traditional CI

Traditional iOS CI (CircleCI macOS runners + Fastlane) is not needed for this project. The `xcode-native` MCP already provides the build and test feedback loop directly through the agent workflow:

- The agent writes Swift code and calls `BuildProject` to trigger a real Xcode build on the Mac host.
- `GetBuildLog` and `XcodeListNavigatorIssues` surface compiler errors immediately.
- `RunAllTests` and `RunSomeTests` execute the XCTest suite against the Simulator or a connected device.
- The agent iterates until the build is clean and tests pass before committing.

This is a better fit for a single-developer personal project than setting up Fastlane, paying for CircleCI macOS runners, and managing certificate distribution in CI — all of which assume a team distributing to many people. The trade-off is that it requires the Mac to be awake and Xcode open during development sessions, which it would be anyway.

The practical pre-push workflow is:
1. Agent runs `RunAllTests` via MCP as a final gate.
2. If green, commit and push.
3. Deploy to the iPad manually from Xcode when a new build is ready for device testing.

### If Traditional iOS CI Ever Becomes Necessary
If the project eventually needs unattended iOS CI (e.g. distributing to testers, integrating TestFlight), the options are:
- **Xcode Cloud** — Apple's native CI, tightly integrated with the Developer Portal, simpler signing story than third-party CI. Requires a paid Apple Developer account.
- **CircleCI macOS runners** — paid plan, more configuration, but Fastlane handles the signing and TestFlight upload workflow.

---

## 9. Hardware Testing — Barcode Scanner and Stripe Reader

### Current State: Devices Not Connected
Both the Tera Mini barcode scanner and the Stripe Reader M2 are physically present at the Mac Studio but not currently connected.

### Strategy: Manual Pairing for Physical Test Sessions
Hardware testing will require **manual intervention sessions** where the developer physically pairs the devices and runs the app on the iPad:

| Device | Pairing Method | Connection | Test Approach |
|--------|---------------|------------|---------------|
| Tera Mini Barcode Scanner | iPadOS System Bluetooth Settings | BLE/HID keyboard emulation | Manual session: scan real barcodes |
| Stripe Reader M2 | In-app SDK pairing flow | BLE | Manual session: run test payment flows |

### Barcode Scanner — Simulator Workaround
During development (before hardware sessions), the barcode scanner can be simulated:
- The scanner emits keystrokes followed by `\n`. Any text field in the iOS Simulator can receive test barcodes via keyboard input.
- Unit tests can inject mock barcode strings directly into the view model without hardware.

### Stripe Reader — Stripe Test Mode
The Stripe Terminal SDK has a **simulated reader** mode for development:
```swift
Terminal.shared.connectLocalMobileReader(
    DiscoveryConfiguration(discoveryMethod: .localMobile, simulated: true)
)
```
Use simulated mode throughout development. Switch to real hardware only for final end-to-end validation sessions.

---

## 10. DevContainer Boundary — iOS Cannot Be Built Inside the Container

### Critical Constraint
The devcontainer runs Linux. Xcode and the iOS toolchain are macOS-only. There is **no path** to building the iOS app inside the container.

### Development Model
```
┌─────────────────────────────────────────────────────────────┐
│ Mac Host (macOS)                                            │
│  • Xcode + iOS Simulator                                    │
│  • xcode-native MCP bridge on :9876                        │
│  • Stripe Reader M2, Tera Scanner (via BLE/USB)            │
│  • iPad device (USB-connected for deploy)                   │
└──────────────┬──────────────────────────────────────────────┘
               │  SSE bridge / shared filesystem
┌──────────────▼──────────────────────────────────────────────┐
│ VS Code DevContainer (Linux)                                │
│  • Rust/Wrangler development (Worker)                       │
│  • Agent workflow (Antigravity CLI)                         │
│  • Swift file authoring via xcode-native MCP tools         │
│  • All spec, docs, and config management                    │
└─────────────────────────────────────────────────────────────┘
```

The agent writes Swift files **from inside the container** via the `xcode-native` MCP (which transparently proxies to Xcode on the host). Compilation and running always happens on the host.

> [!WARNING]
> The iOS source files must live on a **shared/mounted filesystem path** that both the devcontainer and the Xcode project can access. If the Xcode project is created at a path that is not bind-mounted into the devcontainer, the `XcodeRead` and `XcodeWrite` MCP tools will proxy correctly — but direct filesystem access from within the container (`view_file`, `write_to_file`) will not work on those files. Resolve this by either:
> - Placing the Xcode project inside the shared workspace directory (`/workspaces/stripe-toddler/ios/`), or
> - Relying exclusively on the `xcode-native` MCP tools for all iOS file operations.

---

## 11. Implementation Phase Order and Dependencies

Given all the above constraints, the recommended phase order for a safe implementation plan is:

```
Phase 0: Prerequisites (All Manual — Must Complete Before Code)
  ├─ Set up Stripe Terminal location in Stripe Dashboard
  ├─ Create Doppler project + add initial secrets
  └─ Create new GitHub repository

Phase 1: Bootstrap Infrastructure
  ├─ Use genproj to scaffold devcontainer, circleci, doppler, wrangler
  ├─ Clone to Mac Studio, open in VS Code (launches devcontainer)
  ├─ Sign into Xcode with Apple ID (Settings → Accounts)
  ├─ Create Xcode project on Mac host into ios/ subfolder (SwiftUI, iPad target)
  └─ Verify xcode-native MCP connection

Phase 2: Rust Worker Backend
  ├─ D1 schema migrations
  ├─ KV namespace setup
  ├─ API routes (/api/pos/*, /api/admin/*)
  ├─ Stripe webhook handler
  └─ CircleCI pipeline for worker

Phase 3: iOS App Foundation
  ├─ SwiftUI project structure (via xcode-native MCP)
  ├─ Design system tokens from design-system.md
  ├─ Barcode scanner input handling (simulator-first)
  └─ Stripe Terminal SDK integration (simulated reader first)

Phase 4: Integration
  ├─ Connect iOS app to live Worker endpoints
  ├─ Apple Pay flow (requires Developer account + Merchant ID)
  └─ Admin portal wireframe implementation

Phase 5: Hardware Validation (Manual Sessions)
  ├─ Pair Tera scanner and validate scan-to-checkout flow
  ├─ Pair Stripe Reader M2 and run live payment test
  └─ Ad-hoc deploy to real iPad via Xcode
```

---

## 12. Open Questions and Flagged Risks

| # | Question / Risk | Owner | Urgency |
|---|----------------|-------|---------|
| 1 | Sign into Xcode with Apple ID and trust developer cert on iPad — simple but must happen before first device run. | Developer | 🟡 Pre-Phase 3 |
| 2 | Stripe Terminal location must be created in Stripe Dashboard before the Reader M2 can be registered. Merchant ID / PassKit not required. | Developer | 🟠 Needed for Phase 4+ |
| 3 | Confirm `doppler me` is authenticated before running secret-writing steps. | Agent | 🟡 Check at start of each session |
| 4 | Xcode project must exist on the Mac before `xcode-native` MCP can be used. | Developer | 🔴 Blocker for Phase 3 |
| 5 | iOS source path must be accessible from both host and container. Decide at project creation. | Developer + Agent | 🟡 Decide in Phase 1 |
| 6 | Stripe Reader M2 BLE pairing requires the first in-app pairing session — cannot be scripted. | Developer | 🟠 Needed for Phase 5 |
| 7 | CircleCI macOS runners (for future iOS CI) are paid. Alternatively evaluate Xcode Cloud. | Developer | 🟢 Deferred |
| 8 | App Attest requires a real device (not Simulator) but works with a free Apple ID. | Developer | 🟠 Phase 5 |
