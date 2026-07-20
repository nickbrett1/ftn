# Agent Prompt: Generate Implementation Plan for Stripe Toddler

## Your Task

Generate a comprehensive, step-by-step implementation plan for the **Stripe Toddler** project and write it to `specs/stripe-toddler/plan.md`.

The plan must be consumable by **both a human developer and an AI agent workflow**. This means:

- Every step must be unambiguous and self-contained — no hand-waving or "set up X as appropriate"
- Steps that require human intervention must be explicitly flagged as **[MANUAL]**
- Steps that an agent can execute autonomously must be flagged as **[AGENT]**
- Steps that require both must be flagged as **[MANUAL + AGENT]**
- Where a specific tool or MCP should be used, name it explicitly
- Success criteria for each phase must be stated clearly

---

## Context — Read These Files First

Before generating the plan, read **all** of the following files in full. The plan must be grounded in their content and must not contradict them.

### Business Case and Scope

- `specs/stripe-toddler/description.md` — Project overview, goals, out-of-scope items

### ESDD Dependency Graph

- `specs/stripe-toddler/spec/dependency-map.yaml` — The full graph of intents, expectations, jobs, artifacts, contracts, and verifiers. The plan's phases should map to the `job.*` nodes and the success criteria should reference the `expectation.*` nodes.
- `specs/stripe-toddler/spec/event-flow.md` — Event schemas (ItemScanned, PaymentCaptured, etc.)

### Implementation Constraints

- `specs/stripe-toddler/spec/implementation-considerations.md` — **Read this with particular care.** It documents every known constraint, tooling decision, ordering dependency, and risk. The plan must not contradict or ignore anything captured here.

### Architecture and Data

- `specs/stripe-toddler/spec/topology/deployment-targets.md` — Infrastructure targets (iPad, Cloudflare Worker, D1, KV, R2)
- `specs/stripe-toddler/spec/data-architecture/d1-schema.sql` — The D1 relational schema (analytics database)
- `specs/stripe-toddler/spec/data-architecture/kv-layout.json` — The KV store layout (inventory)
- `specs/stripe-toddler/spec/data-architecture/domain-models.rs` — Rust domain model structs

### API

- `specs/stripe-toddler/spec/api/worker-openapi.yaml` — Full OpenAPI spec for the Rust Cloudflare Worker
- `specs/stripe-toddler/spec/api/swift-protocols.md` — Swift protocol definitions for the iOS app's network layer

### User Flows

- `specs/stripe-toddler/spec/flows/checkout-sequence.md` — The end-to-end checkout sequence
- `specs/stripe-toddler/spec/flows/payment-state-machine.md` — Payment state transitions

### UI

- `specs/stripe-toddler/spec/ui/design-system.md` — SwiftUI design system rules (mandatory constraints for all iOS UI code)
- `specs/stripe-toddler/spec/ui/wireframes/checkout-screen.excalidraw` — Checkout screen wireframe
- `specs/stripe-toddler/spec/ui/wireframes/admin-screen.excalidraw` — Admin screen wireframe

### Capacity

- `specs/stripe-toddler/spec/capacity/load-model.md` — Load and capacity model

---

## Key Constraints to Enforce in the Plan

These are the most critical constraints from `implementation-considerations.md`. The plan must reflect all of them:

1. **genproj first, Xcode second.** The repo is scaffolded via the `fintechnick` genproj MCP tool before any Xcode project is created. Use `generate_project` with capabilities: `coding-agents`, `devcontainer-rust`, `circleci`, `doppler`, `cloudflare-wrangler`, `dependabot`, `editor-tools`, `gitguardian`. The Xcode project is then created on the Mac host into the `ios/` subfolder of the already-cloned repo.

2. **Deployment is CircleCI-only.** `wrangler deploy` is never run manually from the devcontainer. The CI pipeline is the only deployment path for the Rust worker.

3. **iOS build and test via xcode-native MCP.** There is no iOS CI pipeline. The agent uses `BuildProject`, `RunAllTests`, and `GetBuildLog` from the `xcode-native` MCP as the build/test feedback loop. The Mac must be awake and Xcode open with the project loaded during any iOS development session.

4. **Miniflare local datastores must be seeded separately.** After writing D1 migrations, they must be applied to both the production D1 (`wrangler d1 execute`) and the local Miniflare environment (`wrangler d1 execute --local`). Same for KV seed data. A local seed script should be created.

5. **No Apple Developer Program membership required.** A free Apple ID in Xcode is sufficient. The plan must not include enrollment steps or paid account setup.

6. **Doppler `common` project provides `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.** These do not need to be created. The new Doppler project (`stripe-toddler`) needs only the Stripe-specific secrets listed in §5 of the considerations doc.

7. **Payment is handled by the Stripe Reader M2, not native Apple Pay.** No `PKPaymentButton`, no `PassKit` entitlement. The iPad UI shows a confirm button; the Stripe Terminal SDK and reader handle everything else.

8. **Design system rules in `design-system.md` are mandatory.** Every SwiftUI view the plan calls for writing must conform to those rules. The plan should reference the design system document as a constraint rather than restating all the rules inline.

---

## Tooling Available to the Agent

The plan should specify which tools to use at each step:

| Tool                                                | What it does                                               |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `fintechnick` MCP → `generate_project`              | Scaffold the starter repo with genproj capabilities        |
| `fintechnick` MCP → `list_genproj_capabilities`     | Inspect available capabilities before scaffolding          |
| `xcode-native` MCP → `BuildProject`                 | Trigger an Xcode build and capture success/failure         |
| `xcode-native` MCP → `GetBuildLog`                  | Read the full build log to diagnose errors                 |
| `xcode-native` MCP → `XcodeListNavigatorIssues`     | List current compiler errors/warnings                      |
| `xcode-native` MCP → `RunAllTests` / `RunSomeTests` | Run XCTest suite                                           |
| `xcode-native` MCP → `XcodeWrite`                   | Create new Swift source files                              |
| `xcode-native` MCP → `XcodeUpdate`                  | Edit existing Swift source files                           |
| `xcode-native` MCP → `XcodeMakeDir`                 | Create source group folders                                |
| `xcode-native` MCP → `XcodeRead` / `XcodeLS`        | Read and navigate the Xcode project                        |
| `xcode-native` MCP → `RenderPreview`                | Render SwiftUI previews to verify layout                   |
| `run_command` (devcontainer terminal)               | Cargo builds, wrangler dev, doppler CLI, git               |
| `write_to_file` / `view_file`                       | Create and read non-Xcode files (Rust, config, migrations) |

Note: `xcode-native` MCP tools are **only available when Xcode is open on the Mac host** with the project loaded. If the connection is unavailable (`MCP error -32000: Connection closed`), the bridge daemon needs to be restarted on the Mac — this is a [MANUAL] step.

---

## Required Structure of `plan.md`

The plan should follow this phase structure (derived from §11 of the considerations doc). Each phase must have numbered steps. Expand each phase into concrete, executable tasks — do not leave any phase as a high-level summary.

```
Phase 0: Prerequisites
Phase 1: Repository Bootstrap
Phase 2: Rust Worker Backend
Phase 3: iOS App Foundation
Phase 4: Integration
Phase 5: Hardware Validation
```

For each step, include:

- The **action** to take
- The **tool or mechanism** to use
- Whether it is **[MANUAL]**, **[AGENT]**, or **[MANUAL + AGENT]**
- The **success condition** — how to know the step is complete
- Any **dependencies** on previous steps that must be complete first

Where a step involves writing code, the plan should specify:

- Which file(s) to create or modify
- What the code must implement (referencing the relevant spec, schema, or OpenAPI endpoint)
- What test or verification to run to confirm correctness

---

## Output

Write the completed plan to: `specs/stripe-toddler/plan.md`

The plan should be thorough enough that it could be handed to either a developer with no prior context on this project, or a fresh AI agent session with access to this repository, and they could execute it from start to finish without needing to ask clarifying questions. Where genuine ambiguity remains, document it explicitly as an open decision within the plan rather than guessing.
