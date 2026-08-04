# Project Notes: govee-mcp — MCP server for the Govee x PAC-MAN Gaming Pixel Light (H6631)

**Status**: Draft / not started (design notes only)
**Created**: 2026-08-03
**Language**: Python (user preference)
**Deployment**: Docker container on Synology NAS, Watchtower-managed, surfaced in Homepage
**Relationship to genproj**: this project is the motivating use case for the `docker-container` deployment capability (`specs/003-genproj-docker-container/`). It is **not** scaffolded through genproj in v1 — captured here so the work is ready when the capability lands.

---

## 1. Context & Goals

- Control the **Govee x PAC-MAN Gaming Pixel Light (H6631)** — a 16×16 LED panel with "real-time info display" — from AI clients (goose CLI, Open WebUI) via a local MCP server.
- **LAN Control is already enabled** on the device (per-device toggle in the Govee app).
- Server runs as a Docker container on the NAS (Synology Container Manager), pulls updates via **Watchtower poll mode**, and gets a **Homepage** widget.
- Repo will be **public on GitHub**; image published to **GHCR as a public package** (no registry credentials needed on the NAS).
- No auth on the MCP endpoint (LAN-only access).

**Goal ladder (in priority order):**

1. LAN basics: discover, on/off, brightness, color — reliable, local, offline-capable.
2. Cloud scenes/effects via the Govee Platform API (requires a Govee API key — user will apply).
3. **Custom content on the panel** (pixel drawing / real-time info display) — feasibility unproven; needs a research spike.

---

## 2. What the H6631 Exposes (verified facts + open questions)

| Capability | Path | Status |
|---|---|---|
| Power / brightness / color | LAN API (gen-2 AES-encrypted protocol) | LAN Control enabled; **assume gen-2** (modern device) — verify key derivation |
| Scenes & effects | Govee Platform API (developer.govee.com, API key) | Key not yet obtained; apply |
| Live status updates | LAN and/or undocumented AWS IoT MQTT | Optional later |
| Custom pixel / info-display content | **No public API** — likely cloud-only or undocumented MQTT (app sends commands; capture & replay, cf. govee-lan-api-plus) | Research spike |

**LAN protocol facts (from community projects — wez/govee-lan-hass, govee2mqtt):**

- Discovery: multicast UDP `239.255.255.250:4001`.
- Device replies on UDP `4002`; commands are sent to UDP `4003`.
- Fixed ports → **only one LAN API client per IP**. Our container binds the NAS IP; the HAOS VM has its own IP (VMM), so a future govee2mqtt inside HAOS would not conflict.
- gen-1 (older devices): plain JSON over UDP. gen-2 (newer): AES-128-CBC, key/IV derived from the per-device key shown in the app.
- **Open question**: confirm H6631 is gen-2 and obtain the device key from the app's LAN Control settings.

---

## 3. Architecture

```
goose CLI / Open WebUI ── MCP Streamable HTTP (http://nas:<port>/mcp) ──▶ govee-mcp (Python)
                                                                              │  UDP 4001/4002/4003
                                                                              ▼
                                                                        Govee H6631 (LAN)
```

- **Transport**: MCP **Streamable HTTP** (`@modelcontextprotocol` Python SDK or `FastMCP`). Both goose CLI and Open WebUI connect to MCP servers by URL — no stdio.
- **Structure** (Python):
  ```
  govee-mcp/
  ├── src/govee_mcp/
  │   ├── __init__.py
  │   ├── server.py          # MCP server (FastMCP), tool registration, /health route
  │   ├── lan.py             # discovery + gen-2 encrypted LAN client (UDP 4001-4003)
  │   ├── crypto.py          # AES-128-CBC key/iv derivation from device key
  │   ├── cloud.py           # (later) Govee Platform API client for scenes
  │   └── models.py          # device state dataclasses
  ├── Dockerfile             # python:3.12-slim
  ├── docker-compose.yml     # network_mode: host (UDP ports!)
  ├── pyproject.toml
  └── tests/
  ```

### Proposed MCP tools (v1 LAN scope)

| Tool | Args | Notes |
|---|---|---|
| `govee_discover` | — | multicast scan; returns MAC, model, IP, LAN-API support |
| `govee_get_state` | `mac` | power, brightness, color (LAN state, polled) |
| `govee_set_power` | `mac`, `on: bool` | |
| `govee_set_brightness` | `mac`, `percent: 0-100` | |
| `govee_set_color` | `mac`, `hex` or `r,g,b` | |
| `govee_set_scene` | `mac`, `scene` | (later) cloud API |
| `govee_status` | — | server/device health — also backs the Homepage `customapi` widget at `/health` |

### Config (env, set on the NAS — never committed)

```
GOVEE_DEVICE_MAC=...
GOVEE_DEVICE_KEY=...     # from app LAN Control settings (gen-2)
GOVEE_API_KEY=...        # optional, for scenes (later)
GOVEE_PORT=4002          # listen socket (fixed by protocol)
MCP_PORT=8899            # HTTP endpoint port (host network → this is the host port)
```

---

## 4. Docker / NAS Deployment

- **`network_mode: host` is required** — fixed UDP ports 4001–4003 + multicast do not work on a bridge network. On Synology Container Manager this is a compose-file option (`network_mode: host`), not visible in the GUI — documented in `deploy/README.md`.
- **Watchtower poll flow**: CircleCI (or manual `docker buildx build --push`) publishes `ghcr.io/<owner>/govee-mcp:latest`; Watchtower on the NAS detects the digest change, pulls, recreates. Public package → no `docker login` needed.
- **Homepage**: `customapi` widget pointing at `http://<nas>:8899/health`.
- Healthcheck in Dockerfile (`HEALTHCHECK` hitting `/health`) so Watchtower/Container Manager can report liveness.

---

## 5. Research Spikes (before or during build)

1. **Gen-2 key derivation for H6631** — confirm AES-128-CBC scheme (key/IV from device key; see community implementations) and that the app exposes the key for this model.
2. **Custom content feasibility** — can the app's "real-time info display" content be captured (MQTT interception, cf. govee-lan-api-plus Frida approach) and replayed locally? If yes, add a `govee_draw` / `govee_set_text` tool behind the pluggable transport. If no, scope v1 to LAN basics + cloud scenes.
3. **Panel specifics** — does LAN expose per-segment/16×16 color, or only a single color+brightness? (Affects `govee_set_color` semantics and any DIY-scene tools.)

---

## 6. Phased Plan (when started)

| Phase | Scope | Depends on |
|---|---|---|
| 0 | Spike: gen-2 protocol + H6631 LAN capabilities + device key | — |
| 1 | LAN basics tools, Docker image, compose (host net), Homepage widget, Watchtower wiring | 0 |
| 2 | Cloud API scenes (`govee_set_scene`) | Govee API key |
| 3 | Custom content (`govee_draw`/`govee_set_text`) if feasible | 0 (spike 2) |

## 7. Open Questions

- Confirm H6631 gen-2 protocol + obtain device key (user action in app).
- Confirm whether LAN exposes per-pixel/segment color for this panel.
- Port preference for the MCP HTTP endpoint (proposed `8899`; user has no preference).
- Whether to enable MCP bearer auth later if access expands beyond the LAN.
