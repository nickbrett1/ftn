# ESDD & SpecDAG Case Study: Catching Scope Gaps and Spec Ambiguities Early

This document outlines the workflow and case study of applying **Event-Spec-Driven Development (ESDD)** and the **SpecDAG** tool to the **Stripe Toddler** payment point-of-sale project. It serves as a reference for writing articles or documentation on spec-first development.

---

## 1. Context & Philosophy
**Event-Spec-Driven Development (ESDD)** is a spec-first methodology. It posits that application design (intents, success criteria, database models, event catalogs, and api schemas) should be mapped as a **Directed Acyclic Graph (DAG)** of dependencies *before* writing production code.

This prevents common development pitfalls:
*   **Scope creep**: Coding features that were never formally agreed on.
*   **Gap slip**: Forgetting to implement verification mechanisms for business requirements.
*   **Ambiguity**: Leaving API boundaries undefined between modular systems.

**SpecDAG** is a CLI tool and validator that enforces the structural schema, cycle detection, and directory completeness rules of an ESDD graph.

---

## 2. Step-by-Step ESDD Workflow

### Step 2.1: Bootstrapping the Specs
In the `specs/stripe-toddler/` directory, we established the initial design specifications:
*   `description.md`: The parent business case, outlining toddler POS checkout requirements and executive admin tools.
*   `spec/`: Subdirectories for system architecture, including database schemas (`d1-schema.sql`), key layouts (`kv-layout.json`), sequence diagrams, and UI wireframes.

### Step 2.2: Mapping the DAG (`dependency-map.yaml`)
To validate the completeness of the design, we created a `dependency-map.yaml` file. The map specifies nodes and edges categorized by ESDD semantics:
1.  **Intents (`intent`)**: High-level business/user goals (e.g. toddler scans items, admin manages inventory).
2.  **Expectations (`expectation`)**: Testable success criteria defining each intent.
3.  **Jobs (`job`)**: Implementation components (Cloudflare Rust Worker, iOS POS app, Admin portal).
4.  **Artifacts & Contracts (`artifact`, `contract`)**: The design documentation and API specs.
5.  **Verifiers (`verifier`)**: Verification routines (Vitest suite, OpenAPI validators, load testing checks) that prove implementation correctness.

```yaml
# Example ESDD strict edge directions:
edges:
  - from: intent.scan-item
    to: expectation.scan-item-success
    type: defines_success_for
  - from: verifier.component-graph
    to: expectation.scan-item-success
    type: verifies
  - from: artifact.component-graph
    to: verifier.component-graph
    type: verified_by
```

### Step 2.3: Structural Validation and ESDD Linting
Using the `specdag` CLI, we executed strict checks to verify the design logic:
```bash
specdag validate specs/stripe-toddler/spec/dependency-map.yaml --strict
```
During this stage, `specdag` caught several structural errors, including:
*   **Strict edge direction violations**: Enforcing that `defines_success_for` must only point from `intent -> expectation` (never reverse) and that `verified_by` must only link `artifact/event/job -> verifier`.
*   **Cycle detection**: Preventing circular verification logic (e.g. `Verifier A` -> `Expectation B` -> `Verifier A`).

### Step 2.4: Traceability Audit & Identifying the Gap
By trace-matching our documented goals in `description.md` against our DAG nodes in `dependency-map.yaml`, we performed a completeness audit:
*   *Observation*: The spec required that the system provide a view into transaction history and sales analytics for executives.
*   *Finding*: The dependency map had **no intent** mapped for transaction analytics (`intent.view-analytics` was missing). The requirement was unfulfilled.

---

## 3. Reconciling Scope & Interface Boundaries
When the missing intent was identified, it triggered a key architectural clarification:
1.  **Scope Boundary**: The visual transaction history display screen will **not** be built in this codebase; it is out-of-scope and belongs in `fintechnick.com`.
2.  **In-Scope Deliverable**: However, the **backend API services and D1 database storage tables** powering that screen *are* in-scope.
3.  **Spec Reconciliation**: We modified both artifacts to align with this boundary:
    *   **In [description.md](file:///workspaces/ftn/specs/stripe-toddler/description.md)**: Added a scope disclaimer noting that the visual frontend lives on `fintechnick.com`, but the service APIs and a visual design mockup are provided here.
    *   **In [dependency-map.yaml](file:///workspaces/ftn/specs/stripe-toddler/spec/dependency-map.yaml)**: Created a corrected intent: `intent.provide-analytics-api`. This maps to `expectation.analytics-api-success`, verified by our `worker-openapi` and `d1-schema` specs.

This resolved the gap and aligned the development goals perfectly before writing code.

---

## 4. SpecDAG Tool Reference

*   **Assembly**:
    Assembles multiple feature maps and checks for conflicts:
    ```bash
    specdag assemble specs/stripe-toddler -o specs/stripe-toddler/_generated/assembled-map.json
    ```
*   **Doctor check**:
    Validates folder layout and checks for missing files (e.g. ensuring `event-flow.md` exists):
    ```bash
    specdag doctor specs/stripe-toddler/
    ```
*   **Visualizing the DAG**:
    Generates Mermaid markup of the graph:
    ```bash
    specdag render specs/stripe-toddler/spec/dependency-map.yaml > specs/stripe-toddler/spec/dependency-map.mmd
    ```
*   **Review Report**:
    Generates a static HTML audit report:
    ```bash
    specdag report specs/stripe-toddler/spec/dependency-map.yaml -o specs/stripe-toddler/_generated/report.html
    ```
