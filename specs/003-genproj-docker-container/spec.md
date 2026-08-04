# Feature Specification: genproj "Docker Container" Deployment Capability

**Status**: Draft (v1 scope: capability only)
**Created**: 2026-08-03
**Supersedes**: `specs/001-genproj/spec.md` (stale — do not use for deployment scope)
**Motivating use case**: deploy a local MCP server for the Govee x PAC-MAN Gaming Pixel Light (H6631) to a Synology NAS via Docker, managed by Watchtower and surfaced in Homepage.

---

## 1. Problem

genproj today offers two deployment systems — `cloudflare-wrangler` (Cloudflare Workers) and `google-cloud`. There is no way to express *"deploy this as a Docker container to my own host/NAS"* as the project's deployment mechanism. The user wants to generate projects whose deployment story is:

```
git push → CircleCI builds image → push to GHCR → Watchtower (NAS) pulls & recreates → Homepage widget
```

Requirements that fall out:

- **Mutually exclusive deployment systems.** A project targets exactly one deployment mechanism. Selecting `docker-container` must deselect `cloudflare-wrangler` / `google-cloud` and vice-versa. (None of the current deployment capabilities declare `conflicts`, so this must be introduced.)
- **CircleCI-aware.** The generated `.circleci/config.yml` must contain the build + registry-publish job when `docker-container` is selected (instead of a wrangler/GCP deploy job).
- **NAS-ready artifacts.** Generated repo includes a runtime `Dockerfile`, `.dockerignore`, `docker-compose.yml` (with `network_mode: host` option — required for UDP/multicast workloads), Watchtower deploy notes, and a Homepage services snippet.
- **Registry choice.** Default GHCR (matches GitHub + CircleCI stack, free, public packages for public repos → no credentials needed on the NAS). `dockerhub` and `quay` as alternatives.

**Non-goals (v1)**

- No scaffolding of application code (e.g., no generation of the govee-mcp server itself — see `specs/004-govee-mcp/` for that project's design notes).
- No webhook/SSH push-deploy from CircleCI to the NAS (Watchtower poll model only).
- No automation for self-hosted registries (Harbor etc.).
- No changes to the `docker` capability itself — it stays an *internal* dependency used by devcontainers; `docker-container` is a distinct *deployment* capability.

---

## 2. Capability Definition

Source of truth: the **fintechnick MCP capability catalog** (the catalog served by the MCP that exposes genproj as a tool, and consumed by the webapp UI at `/projects/genproj`). The machine-readable contract is in `contracts/docker-container.capability.json` (drop-in entry for the catalog).

```json
{
  "id": "docker-container",
  "name": "Docker Container",
  "description": "Containerize the project and publish to a container registry (GHCR, Docker Hub, or Quay) for deployment to a NAS or self-hosted host via Docker Compose. Mutually exclusive with other deployment systems.",
  "category": "deployment",
  "dependencies": ["docker"],
  "conflicts": ["cloudflare-wrangler", "google-cloud"],
  "requiresAuth": [],
  "configurationSchema": {
    "type": "object",
    "properties": {
      "registry":        { "type": "string", "enum": ["ghcr", "dockerhub", "quay"], "default": "ghcr" },
      "imageVisibility": { "type": "string", "enum": ["public", "private"], "default": "public" },
      "tagStrategy":     { "type": "string", "enum": ["commit-sha", "semver", "latest"], "default": "commit-sha" },
      "networkMode":     { "type": "string", "enum": ["bridge", "host"], "default": "bridge" },
      "exposePort":      { "type": "integer", "minimum": 1, "maximum": 65535, "default": 3000 },
      "watchtower":      { "type": "boolean", "default": true },
      "homepage":        { "type": "boolean", "default": true }
    }
  },
  "benefits": [
    "Deploy to any Docker host (Synology, Unraid, TrueNAS, VPS) — not tied to a cloud vendor",
    "Auto-updates via Watchtower polling the registry",
    "Surfaced in Homepage dashboard with a health-widget",
    "Full local/private control of the container"
  ],
  "templates": [
    { "id": "dockerfile",         "filePath": "Dockerfile",                  "templateId": "dockerfile" },
    { "id": "dockerignore",       "filePath": ".dockerignore",               "templateId": "dockerignore" },
    { "id": "docker-compose",     "filePath": "docker-compose.yml",          "templateId": "docker-compose" },
    { "id": "deploy-readme",      "filePath": "deploy/README.md",            "templateId": "deploy-readme" },
    { "id": "homepage-snippet",   "filePath": "deploy/homepage-services.yaml", "templateId": "homepage-services" }
  ],
  "externalServices": [
    {
      "type": "registry",
      "name": "GHCR",
      "actions": [
        { "type": "create",  "description": "GHCR package is created on first push from CircleCI" },
        { "type": "configure", "description": "Create a fine-grained PAT with Packages: read & write; add GHCR_USERNAME and GHCR_TOKEN to the CircleCI context" }
      ]
    }
  ],
  "links": [{ "label": "Docker", "url": "https://www.docker.com/" }]
}
```

### 2.1 Symmetric conflicts (required change)

Add `"docker-container"` to the `conflicts` arrays of the existing deployment capabilities:

- `cloudflare-wrangler.conflicts = ["docker-container"]`
- `google-cloud.conflicts = ["docker-container"]`

The generator/UI must treat conflicts as symmetric regardless of declaration order (defensive: normalize `A.conflicts ∋ B ⇔ B.conflicts ∋ A`).

---

## 3. Template Specifications

All templates are parameterized by selected capabilities/config (name, registry, port, network mode, runtime).

### 3.1 `Dockerfile` (repo root)

Runtime image for the app — distinct from `.devcontainer/Dockerfile` (dev image). Runtime is inferred from framework selection, mirroring the existing automatic-zsh behavior:

| Framework selected | Base |
|---|---|
| `sveltekit` / any Node project | `node:22-alpine` multi-stage (builder → runner) |
| `devcontainer-python` / Python project | `python:3.12-slim` |
| unknown | `node:22-alpine` multi-stage (default) |

Must include: `ENV NODE_ENV=production` (Node), non-root user, `HEALTHCHECK` hitting `exposePort`/`/health` when the app exposes HTTP.

### 3.2 `.dockerignore`

Standard: `node_modules`, `.git`, build artifacts, `.env*`, test/cache dirs, `specs/` (if present).

### 3.3 `docker-compose.yml`

```yaml
services:
  app:
    image: ghcr.io/<owner>/<project>:latest      # from registry + repo name
    container_name: <project>
    restart: unless-stopped
    # network_mode: host   # required for UDP/multicast workloads (e.g., Govee LAN: 4001/4002/4003)
    ports:
      - "3000:3000"        # only when networkMode=bridge
    environment:
      # placeholder — env values are provided at deploy time (NAS .env), never committed
    labels:
      - "homepage.group=Services"
      - "homepage.name=<project>"
      - "homepage.href=http://<nas-host>:<port>/"
      - "homepage.widget.type=customapi"
      - "homepage.widget.url=http://localhost:<port>/health"
    volumes: []
```

Rules:
- `networkMode=host` → emit `network_mode: host`, omit `ports`.
- `watchtower=true` → add `labels: com.centurylinklabs.watchtower.enable=true` (explicit opt-in).
- Never inline secrets; comment pointing to a NAS-side `.env`.

### 3.4 `deploy/README.md`

NAS deploy runbook for the target host class (Synology Container Manager as the canonical example):

1. Create project in Container Manager (or `docker compose up -d` on other hosts).
2. Set environment variables in the NAS `.env`.
3. Watchtower poll flow: `docker login` only needed if `imageVisibility=private`; for public GHCR packages no credentials are required.
4. Homepage: append `deploy/homepage-services.yaml` snippet to `services.yaml` and enable the `homepage` docker provider.
5. Note for host-networking apps: bind the container to the NAS IP; only one Govee-LAN client per IP (fixed UDP ports 4001–4003).

### 3.5 `deploy/homepage-services.yaml`

```yaml
- <Project>:
    icon: sh-docker
    href: http://<nas-host>:<port>/
    description: <project description>
    widget:
      type: customapi
      url: http://<nas-host>:<port>/health
```

---

## 4. CircleCI Integration (deployment-aware config)

The existing `circleci-config` template (templateId `circleci-config`) becomes **deployment-aware**: the publish job is chosen by the selected deployment capability. Today the template presumably assumes wrangler; it must branch:

| Deployment capability selected | CircleCI publish job |
|---|---|
| `docker-container` | build + push image to registry |
| `cloudflare-wrangler` | wrangler deploy (existing) |
| `google-cloud` | gcloud deploy (existing) |
| none | test-only workflow |

**Docker publish job sketch** (only when `docker-container` selected):

```yaml
jobs:
  docker-publish:
    docker:
      - image: cimg/base:stable
    environment:
      IMAGE: ghcr.io/<< parameters.owner >>/<< project >>   # registry per config
    steps:
      - checkout
      - setup_remote_docker
      - run:
          name: Login to registry
          command: |
            echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
      - run:
          name: Build & push
          command: |
            docker build -t "$IMAGE:$CIRCLE_SHA1" -t "$IMAGE:latest" .
            docker push "$IMAGE:$CIRCLE_SHA1"
            docker push "$IMAGE:latest"
workflows:
  main:
    jobs:
      - test
      - docker-publish:
          requires: [test]
          filters: { branches: { only: [main] } }
```

- Secrets live in the CircleCI context named by the `circleci` capability config (`context.name`, default `common`): `GHCR_USERNAME`, `GHCR_TOKEN` (PAT, `packages:write`). For `dockerhub` registry: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`. For `quay`: `QUAY_ROBOT_USERNAME`, `QUAY_ROBOT_TOKEN`.
- `tagStrategy=commit-sha` → tag with `$CIRCLE_SHA1` + `latest`; `semver` → tag from `$CIRCLE_TAG` on tag pushes; `latest` → `latest` only.
- RequiresAuth note: `GHCR_TOKEN` push auth is a CircleCI env-var concern; genproj should surface it as an external-service action, not a user OAuth flow.

---

## 5. Registry Flows

| Registry | Image ref | NAS pull | CircleCI push | Notes |
|---|---|---|---|---|
| `ghcr` (default) | `ghcr.io/<owner>/<project>` | Free for **public** packages (no auth); private needs `docker login` on NAS | PAT `packages:write` | Matches GitHub + CircleCI stack; public repo → public package |
| `dockerhub` | `<owner>/<project>` | `docker login` or public image | `DOCKERHUB_TOKEN` | 1 free private repo |
| `quay` | `quay.io/<owner>/<project>` | Robot account token | Robot token | No pull rate limits |

**Default flow (GHCR + public repo + public package)**: zero credentials on the NAS — Watchtower polls `ghcr.io/<owner>/<project>:latest` anonymously. If `imageVisibility=private`, `deploy/README.md` instructs `docker login ghcr.io` on the NAS host (Watchtower uses the Docker daemon's credentials).

---

## 6. Webapp UI Changes (this repo)

Touchpoints found in this repo (`webapp/src/`):

- `src/routes/projects/genproj/` — two-tab UI (`CapabilitySelector.svelte`, `PreviewMode.svelte`).
- `src/routes/projects/genproj/api/conflicts/+server.js` → `ProjectGeneratorService.checkConflicts()` — conflict check endpoint already exists; wire `docker-container` into the conflict rules it evaluates.
- `src/lib/server/project-generator.js`, `preview-generator.js`, `template-engine.js`, `capability-config.js` — generation/preview plumbing. Note: `capability-config.js` appears to be a parallel/bundled catalog; reconcile with the fintechnick MCP catalog as the single source of truth or keep in sync deliberately.
- `src/routes/projects/genproj/api/preview/+server.js`, `api/generate/+server.js` — must render the new templates.
- Tests: `webapp/tests/contract/test_capabilities_api.js` (structure + unique-ID contract — new capability must satisfy), `webapp/tests/integration/test_capability_browsing.js`, `webapp/tests/e2e/genproj_tabs.spec.js`.

**UI behavior — mutual exclusion:**

- Deployment capabilities (`cloudflare-wrangler`, `google-cloud`, `docker-container`) render as mutually exclusive: selecting one unchecks the others (radio-like behavior within the category), with a tooltip explaining why ("A project targets exactly one deployment system").
- Selecting `docker-container` auto-selects its dependency `docker` (devcontainer `docker` capability) — standard dependency auto-select behavior.
- Config form renders only relevant fields: registry, image visibility, tag strategy, network mode, exposed port, watchtower, homepage.
- Preview tab lists the 5 new files + the CircleCI publish job.

**Acceptance criteria:**

1. `GET /api/projects/genproj/api/capabilities` returns `docker-container` with valid structure and unique ID (contract test passes).
2. Selecting `docker-container` deselects `cloudflare-wrangler`/`google-cloud` (and vice-versa) in the UI; `POST /api/conflicts` reports the conflict set.
3. Preview with `docker-container` + `circleci` selected shows Dockerfile, .dockerignore, docker-compose.yml, deploy/README.md, deploy/homepage-services.yaml, and a CircleCI config containing a `docker-publish` job (and no wrangler job).
4. Generate produces those files with correct parameterization (registry, port, network mode, project name).
5. `docker-container` without `circleci` still emits compose/deploy artifacts (no CI job).

---

## 7. Implementation Touchpoints (summary)

| Change | Where |
|---|---|
| Capability definition | fintechnick MCP capability catalog (source of truth) — `contracts/docker-container.capability.json` |
| Conflicts (symmetric) | `cloudflare-wrangler` + `google-cloud` entries in catalog |
| Template store entries | `dockerfile`, `dockerignore`, `docker-compose`, `deploy-readme`, `homepage-services` in fintechnick MCP template store |
| CircleCI config branching | `circleci-config` template (fintechnick MCP) |
| UI + conflict enforcement + config form | `webapp/src/routes/projects/genproj/`, `CapabilitySelector.svelte`, `ProjectGeneratorService.checkConflicts` |
| Tests | `webapp/tests/contract|integration|e2e` for genproj |

## 8. Open Questions

- Should `docker-container` also emit a GitHub Actions variant? **No** — v1 is CircleCI-only (matches genproj's CI capability). Revisit if a `github-actions` CI capability is ever added.
- Should conflict enforcement be surfaced in the fintechnick MCP itself (generation-time guard) in addition to the webapp UI? Recommended yes (defense in depth) — confirm with fintechnick MCP maintainer.
