#!/usr/bin/env bash
#
# agent-dev.sh - start, stop and inspect THIS devcontainer's own a2a-goose agent.
#
# Every generated devcontainer brings up and registers its own agent, named
# "ftn-dev" (the repo name plus the "-dev"
# suffix). ONE AGENT PER REPO IS THE CONTRACT: the registry row is keyed by that
# name, so a `start` RECLAIMS the row a previous container left behind rather
# than adding a second one - a stale "ftn-dev" is overwritten by
# name, never duplicated.
#
# The agent is not baked into the image. The payload comes from the newest
# a2a-goose GitHub Release, installed by nickbrett1/a2a-goose's own launcher
# `fetch-launch.sh`, which lays itself down and self-updates on every start:
#
#   $DEPLOY_DIR/releases/<version>/   an unpacked payload; entry point bin/a2a-goose
#   $DEPLOY_DIR/current -> releases/<version>
#
# A host that has never run the launcher is the one case the launcher cannot fix
# for itself, so this script puts the first copy down (see cold_start) and then
# runs it, backgrounded, with its output in the state log.
#
# FAIL OPEN IS THE FIRST RULE. A project is still usable without an agent, so a
# first start with no network prints loudly that the agent did not start and
# why, and exits 0. It never leaves the devcontainer unusable.
#
# Secrets are never baked in and never go on a command line: they live in
# $ENV_FILE (mode 0600), sourced by the launcher with `set -a`. Doppler is the
# source of truth for them.
#
# Subcommands:
#   scripts/agent-dev.sh start    write env + config, fetch the launcher, run it
#   scripts/agent-dev.sh stop     SIGTERM, wait for a clean shutdown, confirm gone
#   scripts/agent-dev.sh status   running or not, the card URL, a log tail
#
# Run `scripts/agent-dev.sh help` for the post-start hook to wire it into the
# devcontainer.
set -uo pipefail # deliberately no -e: a first start with no network exits 0

PROJECT_NAME="ftn"
AGENT_NAME="ftn-dev"
WORKSPACE="/workspaces/ftn"
REPO_SLUG="nickbrett1/a2a-goose"

DEPLOY_DIR="${DEPLOY_DIR:-${HOME}/.local/share/a2a-goose}"
CONFIG_DIR="${HOME}/.config/a2a-goose"
# The agent reads its config from $A2A_GOOSE_CONFIG; the default it would use is
# exactly the path written below, so either spelling lands on the same file.
CONFIG_FILE="${A2A_GOOSE_CONFIG:-${CONFIG_DIR}/config.yaml}"
ENV_FILE="${ENV_FILE:-${CONFIG_DIR}/env}"
STATE_DIR="${HOME}/.local/state/a2a-goose"
LOG_FILE="${STATE_DIR}/agent.log"
PID_FILE="${STATE_DIR}/agent.pid"

LAUNCHER="${DEPLOY_DIR}/fetch-launch.sh"
LAUNCHER_URL="https://github.com/${REPO_SLUG}/releases/latest/download/fetch-launch.sh"
MANIFEST_URL="${MANIFEST_URL:-https://github.com/${REPO_SLUG}/releases/latest/download/manifest.json}"
TIMEOUT="${TIMEOUT:-10}"

CARD_PORT=10001
ACP_URL="http://127.0.0.1:3284/acp"
LITELLM_BASE_URL="http://nas:4000"

# The card's public URL MUST NOT be loopback - the agent refuses to start on one
# - and it must name an address the LiteLLM container can resolve: the
# container's Tailscale name. A configured value wins; an empty one is derived
# from `tailscale status --json` at start time.
TAILNET_NAME="${A2A_GOOSE_TAILNET_NAME:-}"

log() {
  printf '%s agent-dev[%s]: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$$" "$*" >&2
}

# A visible, multi-line warning. Reserved for the things a human has to read.
loud() {
  printf '\n============================================================\n' >&2
  for line in "$@"; do printf '  %s\n' "$line" >&2; done
  printf '============================================================\n\n' >&2
}

usage() {
  cat >&2 <<'USAGE'
agent-dev.sh - start, stop and inspect this devcontainer's own a2a-goose agent.

  scripts/agent-dev.sh start    write env + config, fetch the launcher, run it
  scripts/agent-dev.sh stop     SIGTERM, wait for a clean shutdown, confirm gone
  scripts/agent-dev.sh status   running or not, the card URL, a log tail

Environment passthrough:
  DEPLOY_DIR    default: $HOME/.local/share/a2a-goose
  ENV_FILE      default: $HOME/.config/a2a-goose/env  (sourced with set -a)
  MANIFEST_URL  default: the a2a-goose release manifest
  TIMEOUT       default: 10 (seconds per HTTP request)
  NO_FETCH=1    skip the fetch and start what is installed

To start it automatically with the container, add this to
.devcontainer/post-start-setup.sh:
USAGE
  cat <<'POST_START_HOOK'

if [ -x "/workspaces/ftn/scripts/agent-dev.sh" ]; then
  "/workspaces/ftn/scripts/agent-dev.sh" start >/dev/null 2>&1 || true
fi
POST_START_HOOK
}

# The agent's Tailscale name, resolved locally (no network needed). Fails rather
# than falling back to something loopback, which the agent would refuse anyway:
# a wrong publicUrl must not be written and then discovered as a startup refusal.
resolve_tailnet_name() {
  [ -n "${TAILNET_NAME}" ] && return 0
  command -v tailscale >/dev/null 2>&1 || return 1
  local json name
  json="$(tailscale status --json 2>/dev/null || true)"
  [ -n "${json}" ] || return 1
  if command -v jq >/dev/null 2>&1; then
    name="$(printf '%s' "${json}" | jq -r '.Self.DNSName // empty' 2>/dev/null || true)"
  else
    name="$(
      printf '%s' "${json}" |
        tr ',' '\n' |
        sed -n 's/.*"DNSName"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
        head -1
    )"
  fi
  name="${name%.}"
  [ -n "${name}" ] || return 1
  TAILNET_NAME="${name}"
  return 0
}

# One secret, straight out of Doppler. Empty on any failure (not logged in, no
# network, key absent) so a caller can tell "no value" from "not fetched".
read_secret() {
  local key="$1" value=""
  if command -v doppler >/dev/null 2>&1; then
    value="$(doppler secrets get "${key}" --plain 2>/dev/null || true)"
  fi
  printf '%s' "${value}"
}

# $ENV_FILE holds ONLY secrets, mode 0600, and is sourced by the launcher with
# `set -a`. It is never carried on a command line and never placed in
# `containerEnv`. A failed fetch keeps whatever is already there - it must not
# overwrite a working file with emptiness.
write_env_file() {
  mkdir -p "${CONFIG_DIR}" || return 1
  local content="" key value
  for key in A2A_GOOSE_BEARER_TOKEN LITELLM_MASTER_KEY LITELLM_BASE_URL GOOSE_SERVER__SECRET_KEY; do
    value="$(read_secret "${key}")"
    if [ -n "${value}" ]; then
      content="${content}${key}=${value}"$'\n'
    fi
  done
  if [ -z "${content}" ]; then
    if [ -f "${ENV_FILE}" ]; then
      log "Doppler returned no secrets - keeping the existing ${ENV_FILE}"
      chmod 600 "${ENV_FILE}" 2>/dev/null || true
      return 0
    fi
    umask 077
    : >"${ENV_FILE}"
    chmod 600 "${ENV_FILE}" 2>/dev/null || true
    loud "No secrets were available from Doppler, so ${ENV_FILE} is empty." \
      "The agent will start without its bearer/registry tokens and will likely" \
      "fail to register. Run 'doppler login' and retry when you can."
    return 0
  fi
  umask 077
  printf '%s' "${content}" >"${ENV_FILE}"
  chmod 600 "${ENV_FILE}" 2>/dev/null || true
  log "wrote ${ENV_FILE} (mode 0600)"
}

# The agent's config, schema = a2a-goose config/config.example.yaml, written to
# $CONFIG_FILE and pointed at by $A2A_GOOSE_CONFIG.
write_config_file() {
  mkdir -p "${CONFIG_DIR}" || return 1
  umask 077
  cat >"${CONFIG_FILE}" <<YAML
server:
  bind: "0.0.0.0:${CARD_PORT}"
  publicUrl: "http://${TAILNET_NAME}:${CARD_PORT}"
  bearerTokenEnv: "A2A_GOOSE_BEARER_TOKEN"

card:
  name: "${AGENT_NAME}"
  description: "goose in the devcontainer for ${PROJECT_NAME}"
  protocolVersion: "1.0"

goose:
  acp:
    url: "${ACP_URL}"
    secretEnv: "GOOSE_SERVER__SECRET_KEY"
    serve: "own"
  defaults:
    cwd: "${WORKSPACE}"
    allowedRoots:
      - "${WORKSPACE}"

registry:
  litellmBaseUrl: "${LITELLM_BASE_URL}"
  masterKeyEnv: "LITELLM_MASTER_KEY"
  agentName: "${AGENT_NAME}"
  # Re-registering by name is what reclaims the row a previous container left.
  reRegisterOnCardChange: true
YAML
  chmod 600 "${CONFIG_FILE}" 2>/dev/null || true
  log "wrote ${CONFIG_FILE}"
}

pid_of() {
  [ -f "${PID_FILE}" ] || return 1
  local pid
  pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  [ -n "${pid}" ] || return 1
  printf '%s' "${pid}"
}

# Alive *and* ours: a recycled PID must not be mistaken for the agent.
is_running() {
  local pid
  pid="$(pid_of)" || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  if [ -r "/proc/${pid}/cmdline" ]; then
    tr '\0' ' ' <"/proc/${pid}/cmdline" 2>/dev/null | grep -q "a2a-goose" || return 1
  fi
  return 0
}

# The one case the launcher cannot fix for itself: a host that has never run it.
cold_start() {
  [ -x "${LAUNCHER}" ] && return 0
  log "no launcher at ${LAUNCHER} - fetching one (cold start)"
  mkdir -p "${DEPLOY_DIR}" 2>/dev/null || return 1
  local tmp="${LAUNCHER}.tmp.$$"
  if ! curl -fsSL --max-time "${TIMEOUT}" "${LAUNCHER_URL}" -o "${tmp}"; then
    rm -f "${tmp}"
    return 1
  fi
  chmod +x "${tmp}" 2>/dev/null || true
  mv -f "${tmp}" "${LAUNCHER}" || {
    rm -f "${tmp}"
    return 1
  }
  log "installed the launcher at ${LAUNCHER}"
  return 0
}

cmd_start() {
  mkdir -p "${CONFIG_DIR}" "${STATE_DIR}" 2>/dev/null || true

  if ! resolve_tailnet_name; then
    loud "The agent was NOT started: no tailnet name could be resolved." \
      "server.publicUrl must not be loopback, so the agent is not started on a" \
      "guess. Join the container to the tailnet (or set tailnetName in the" \
      "container-agent capability) and retry."
    return 0
  fi

  write_env_file
  write_config_file

  if is_running; then
    log "the agent ${AGENT_NAME} is already running (pid $(pid_of)) - nothing to do"
    return 0
  fi

  if ! cold_start; then
    loud "The agent ${AGENT_NAME} was NOT started: the launcher is absent and" \
      "could not be fetched from ${LAUNCHER_URL} (no network?)." \
      "A first start needs the network once. The project is still usable -" \
      "retry when online."
    return 0
  fi

  {
    printf '%s agent-dev[%s]: starting %s for agent %s\n' \
      "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$$" "${LAUNCHER}" "${AGENT_NAME}"
  } >>"${LOG_FILE}" 2>/dev/null || true

  # Backgrounded, output to the state log. NO_FETCH (and the rest of the
  # environment) is inherited by the launcher. A PID file records the process
  # the launcher `exec`s into, so it is the agent itself.
  if command -v setsid >/dev/null 2>&1; then
    A2A_GOOSE_CONFIG="${CONFIG_FILE}" DEPLOY_DIR="${DEPLOY_DIR}" \
      ENV_FILE="${ENV_FILE}" MANIFEST_URL="${MANIFEST_URL}" TIMEOUT="${TIMEOUT}" \
      setsid "${LAUNCHER}" >>"${LOG_FILE}" 2>&1 &
  elif command -v nohup >/dev/null 2>&1; then
    A2A_GOOSE_CONFIG="${CONFIG_FILE}" DEPLOY_DIR="${DEPLOY_DIR}" \
      ENV_FILE="${ENV_FILE}" MANIFEST_URL="${MANIFEST_URL}" TIMEOUT="${TIMEOUT}" \
      nohup "${LAUNCHER}" >>"${LOG_FILE}" 2>&1 &
  else
    A2A_GOOSE_CONFIG="${CONFIG_FILE}" DEPLOY_DIR="${DEPLOY_DIR}" \
      ENV_FILE="${ENV_FILE}" MANIFEST_URL="${MANIFEST_URL}" TIMEOUT="${TIMEOUT}" \
      "${LAUNCHER}" >>"${LOG_FILE}" 2>&1 &
  fi
  local pid=$!
  printf '%s' "${pid}" >"${PID_FILE}" 2>/dev/null || true

  # A launcher that dies at once has a reason in the log; surface it instead of
  # reporting a start that is already over.
  sleep 1
  if ! kill -0 "${pid}" 2>/dev/null; then
    rm -f "${PID_FILE}"
    loud "The agent exited immediately. Last lines of ${LOG_FILE}:"
    tail -n 20 "${LOG_FILE}" >&2 2>/dev/null || true
    return 0
  fi

  log "the agent ${AGENT_NAME} is starting (pid ${pid})"
  log "card: http://${TAILNET_NAME}:${CARD_PORT}/"
  return 0
}

cmd_stop() {
  local pid
  if ! pid="$(pid_of)"; then
    log "no pid file at ${PID_FILE} - nothing to stop"
    return 0
  fi
  if ! kill -0 "${pid}" 2>/dev/null; then
    log "the agent (pid ${pid}) is not running - clearing the stale pid file"
    rm -f "${PID_FILE}"
    return 0
  fi

  log "sending SIGTERM to the agent (pid ${pid}); a clean shutdown deregisters it and stops its goose child"
  kill -TERM "${pid}" 2>/dev/null || true

  local waited=0
  while kill -0 "${pid}" 2>/dev/null; do
    if [ "${waited}" -ge 60 ]; then
      loud "The agent (pid ${pid}) is still running ${waited}s after SIGTERM." \
        "It has not confirmed a clean shutdown; not claiming it stopped."
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  rm -f "${PID_FILE}"
  log "the agent stopped cleanly after ~${waited}s and is gone"
  return 0
}

cmd_status() {
  local pid
  if pid="$(pid_of)" && kill -0 "${pid}" 2>/dev/null; then
    printf 'agent %s: running (pid %s)\n' "${AGENT_NAME}" "${pid}"
  else
    printf 'agent %s: not running\n' "${AGENT_NAME}"
  fi

  if [ -z "${TAILNET_NAME}" ]; then resolve_tailnet_name >/dev/null 2>&1 || true; fi
  if [ -n "${TAILNET_NAME}" ]; then
    printf 'card: http://%s:%s/\n' "${TAILNET_NAME}" "${CARD_PORT}"
  else
    printf 'card: unknown (no tailnet name resolved)\n'
  fi

  if [ -f "${LOG_FILE}" ]; then
    printf '\nlast 20 lines of %s:\n' "${LOG_FILE}"
    tail -n 20 "${LOG_FILE}" || true
  else
    printf '\nno log yet at %s\n' "${LOG_FILE}"
  fi
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  -h | --help | help | "") usage ;;
  *)
    printf 'agent-dev.sh: unknown subcommand: %s\n\n' "$1" >&2
    usage
    exit 2
    ;;
esac
