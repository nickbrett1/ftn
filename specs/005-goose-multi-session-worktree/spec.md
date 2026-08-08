# Goose Multi-Session Worktree Workflow — Project Spec

Status: **Implemented (2026-08-04)** — ftn repo + genproj default. Decisions in §11.
Audience: anyone implementing or extending this workflow.

---

## 1. Problem

Multiple goose sessions run concurrently in one container (typically one per tmux window) on different features. Without isolation this causes:

- **File stomping** — two agents editing the same working tree clobber each other.
- **Combined commits** — unrelated changes land in one commit because everything shares one branch/working tree.
- **Agent confusion** — sessions see foreign edits and get distracted.

## 2. Core design decision

**Scope the worktree to the shell, not the goose session.**

- Per-**session** worktrees break on restart (each goose launch would create a new worktree). ❌ Rejected.
- Per-**shell** (tmux window) worktrees persist across goose restarts and crash recovery. The shell is the durable unit. ✅ Accepted.

The resulting one-to-one mapping is the whole win:

```
tmux window = shell = worktree = branch = feature
```

## 3. Repository layout

```
~/work/project/                 ← project root (main worktree, on main) — zsh lands here
~/work/project-wt/feat-a/       ← linked worktree, branch feat-a
~/work/project-wt/fix-login/    ← linked worktree, branch fix-login
```

- Linked worktrees live **parallel** to the project root, grouped under one sibling directory (`<project>-wt/`).
- Branch name == worktree directory name == feature name (see §6 naming).
- Configurable root via `WT_ROOT` (e.g. `export WT_ROOT=$HOME/ws` for a flat layout).

## 4. Key git facts this relies on

- A linked worktree shares the repo's object database but has its **own files on disk**, its own `git status`, its own staging area, its own branch checkout.
- Git **refuses to check out the same branch in two worktrees simultaneously** → stomp protection is enforced by git itself, not convention.
- **You cannot merge into `main` from a linked worktree** — `main` is checked out in the main worktree and that is the only place the merge can run.
- Worktrees do NOT share untracked files → each needs its own `node_modules` etc.

## 5. The goose wrapper (bash/zsh function)

Flow: **bound to this shell? → reuse. Already inside a worktree? → use it. Neither? → ask for a name, create one. Launch goose in the worktree.**

```zsh
# goose wrapper — one worktree per shell, auto-created on first run
goose() {
  local wt="${GOOSE_WT:-}"

  # 1) This shell already has a bound worktree → reuse it.
  if [[ -n "$wt" && -d "$wt" ]]; then
    ( cd "$wt" && command goose "$@" ); local rc=$?
    [[ -d "$wt" ]] && _wt_check "$wt"
    return $rc
  fi

  # 2) Already INSIDE a worktree? (cd'd there manually) → bind & use it.
  local top
  top="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "goose: not inside a git repository"; return 1
  }
  if [[ -f "$top/.git" ]]; then          # .git as a file ⇒ this is a linked worktree
    export GOOSE_WT="$top"
    ( cd "$top" && command goose "$@" ); local rc=$?
    _wt_check "$top"
    return $rc
  fi

  # 3) At project root, no binding → ask for a name, create (or reuse) a worktree.
  local WT_ROOT="${WT_ROOT:-$(dirname "$PWD")/$(basename "$PWD")-wt}"
  local feat
  print -n "Feature name (new worktree): "
  read -r feat || return 1
  feat="${feat:l}"; feat="${feat// /-}"      # lowercase, spaces → dashes
  [[ -z "$feat" ]] && { echo "goose: no name given, aborting"; return 1; }

  wt="$WT_ROOT/$feat"
  if [[ ! -d "$wt" ]]; then
    mkdir -p "$WT_ROOT"
    git worktree add "$wt" -b "$feat" || return 1
    echo "→ created worktree $wt (branch $feat)"
  else
    echo "→ reusing existing worktree $wt"
  fi

  export GOOSE_WT="$wt"
  ( cd "$wt" && command goose "$@" ); local rc=$?
  _wt_check "$wt"
  echo "Tip: this shell's worktree is $wt (branch $feat) — cd there to inspect."
  return $rc
}
```

Notes:
- `( cd ... )` subshell → goose runs inside the worktree, but the interactive shell stays at the project root after goose exits.
- `command goose` invokes the real binary so this can replace/merge into an existing wrapper.
- The binding lives in `GOOSE_WT`, lasting as long as that zsh is alive — across goose restarts and tmux detach/attach. Resets only when the shell exits.

## 6. Naming

- Branch = worktree dir = feature name, typed **once** at `goose` prompt: `auth-refactor`, `fix-login-bug` (lowercased, spaces → dashes).
- **No `feat/` prefix** by default — the mapping stays 1:1 with the directory name (most frictionless). Prefix is a possible later change; adding it later requires stripping the prefix from the dir name.
- Branch uniqueness is enforced by git (see §4) — collisions are impossible.
- Branch lifetime = feature lifetime, NOT shell lifetime.

Cleanup when a feature is done:
```bash
git worktree remove ~/work/project-wt/auth-refactor   # refuses if dirty (good)
git branch -d auth-refactor                           # after it's merged
```

## 7. Risk handling — the two risks, two mechanisms

**Risk A — WIP loss** (crash/close mid-edit, uncommitted changes orphaned).

**Risk B — forgotten branch** (committed but never merged to main).

Guiding rule: **on exit, check + ask — NEVER auto-merge.** Merging half-finished WIP into main on every goose shutdown is wrong for multi-session features.

### Mechanism 1: post-exit check in the wrapper (Risk A, clean exits)

The wrapper resumes after goose exits no matter how it exited (clean, error, crash), so it can check every time:

```zsh
_wt_check() {
  local wt="$1" MAIN_BRANCH="${MAIN_BRANCH:-main}"
  local branch dirty ahead behind
  branch="$(git -C "$wt" branch --show-current)"
  dirty="$(git -C "$wt" status --porcelain | wc -l | tr -d ' ')"
  ahead="$(git -C "$wt" rev-list --count "$MAIN_BRANCH..$branch" 2>/dev/null | tr -d ' ')"
  ahead="${ahead:-0}"

  if (( dirty == 0 && ahead == 0 )); then
    echo "✓ $branch: clean, merged to $MAIN_BRANCH"; return
  fi

  echo "⚠  $branch still has work:"
  (( dirty > 0 )) && echo "   • $dirty uncommitted file(s)"
  (( ahead  > 0 )) && echo "   • $ahead commit(s) not on $MAIN_BRANCH"
  [[ -t 0 ]] || { echo "   (non-interactive — left as-is)"; return; }

  print -n "   [c]ommit WIP  [m]erge to main  [s]kip: "; read -r ans
  case "${ans:l}" in
    c) git -C "$wt" add -A && git -C "$wt" commit -m "wip($branch): auto-save" \
         && echo "   ✓ WIP committed on $branch" ;;
    m) (( dirty > 0 )) && git -C "$wt" add -A && git -C "$wt" commit -m "wip($branch): auto-save"
       _wt_merge "$wt" "$branch" ;;
    *) echo "   ✓ left as-is — run 'wt audit' later" ;;
  esac
}
```

Merge must run from the **main worktree** (main is checked out there only):

```zsh
_wt_merge() {
  local wt="$1" branch="$2" MAIN_BRANCH="${MAIN_BRANCH:-main}"
  local main; main="$(git -C "$wt" worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
  [[ -n "$(git -C "$main" status --porcelain)" ]] && { echo "✗ main worktree dirty — stash there first"; return 1; }
  [[ "$(git -C "$main" branch --show-current)" != "$MAIN_BRANCH" ]] && { echo "✗ main not on $MAIN_BRANCH"; return 1; }
  git -C "$wt" merge "$MAIN_BRANCH" --no-edit && {            # resolve conflicts here, not in main
    git -C "$main" merge "$branch" --no-ff -m "Merge $branch"
  } || echo "✗ conflicts merging $MAIN_BRANCH into $branch — resolve in $wt, then re-run"
}
```

### Mechanism 2: `wt audit` — catches orphans (Risk A on hard-kill + Risk B)

The wrapper only runs while a shell is alive. A hard-killed tmux window never triggers it. Only a **scan** catches those. Run `wt audit` to take stock (new shell, end of day):

```zsh
wt() {
  case "${1:-audit}" in
    audit) _wt_audit ;;
    remove) _wt_remove "$2" ;;
    *) echo "usage: wt [audit|remove <name>]" ;;
  esac
}

_wt_audit() {
  local MAIN_BRANCH="${MAIN_BRANCH:-main}" w
  local -a wts
  wts=("${(@f)$(git worktree list --porcelain | awk '/^worktree /{print $2}')}")
  echo "ALL WORKTREES  (dirty=uncommitted files, ahead=commits not on $MAIN_BRANCH)"
  printf '%-4s %-28s %-9s %-8s %s\n' '' WORKTREE DIRTY AHEAD LAST-COMMIT
  for w in $wts; do
    local branch dirty ahead last mark=" "
    branch="$(git -C "$w" branch --show-current 2>/dev/null)"
    dirty="$(git -C "$w" status --porcelain | wc -l | tr -d ' ')"
    ahead="$(git -C "$w" rev-list --count "$MAIN_BRANCH..$branch" 2>/dev/null | tr -d ' ')"
    last="$(git -C "$w" log -1 --format='%cr' "$branch" 2>/dev/null)"
    (( dirty > 0 || ahead > 0 )) && mark="⚠"
    printf '%-4s %-28s %-9s %-8s %s\n' "$mark" "${w##*/}" "${dirty:-0}" "${ahead:-0}" "$last"
  done
}
```

Any row with ⚠ is a worktree to finish or clean up; `LAST-COMMIT` age flags possible orphans when the shell is gone.

### Risk-handling summary

| Risk | Mechanism | When it fires |
|---|---|---|
| WIP lost on clean/crash exit | wrapper post-exit check | every time goose returns |
| WIP lost on hard kill | `wt audit` (scan) | whenever you run it |
| Branch never merged | `wt audit` + `[m]` option | whenever you run it |

## 8. Configuration / knobs

- `MAIN_BRANCH` — default branch name (default `main`; confirm at implementation).
- `WT_ROOT` — worktree parent dir (default `<project>-wt/` beside project root).
- `GOOSE_WT` — runtime binding, exported per shell; not user-editable.
- Shell flavor — snippets above are zsh (`${feat:l}`, `${(@f)...}`, `print -n`); translate to bash if needed.

## 9. Open decisions for the implementer

1. **Shell flavor** — bash or zsh? (Affects the small syntax differences above.)
2. **Default branch** — is it `main`, or `master`/something else?
3. **Post-exit placement** — return to project root (current) vs. `cd` into the worktree after creating it (so subsequent manual edits also land on the feature branch, not main). Pick deliberately — this is the main footgun.
4. **`-wt` naming** — `<project>-wt/` default, or flat `WT_ROOT=$HOME/ws`?
5. **Naming scheme** — plain feature name (recommended) vs. `feat/` prefix vs. ticket-based.
6. **`node_modules` handling** — each worktree builds its own, or symlink to one shared copy (saves disk, shares untracked state — trade-off).
7. **Coordination server (deferred, optional)** — worktrees solve stomping + combined commits. Awareness of *same-file* concurrent edits is the only residual pain; a shared MCP coordination daemon could address it later as a pure add-on. **Do not build until same-file conflicts prove to be a real recurring annoyance.**

## 10. Scope of this spec

IN: shell-scoped worktrees; wrapper with create/reuse/bind; post-exit WIP check with commit/merge/skip; `wt audit`; cleanup flow.

OUT (explicitly not this phase): per-feature containers; coordination server; auto-merge behavior; any git hook installation.

---

### Implementation checklist (do in order)

- [x] Confirm §9 decisions (at minimum: shell flavor, default branch, post-exit placement).
- [x] Create wrapper with §5 logic + §7 `_wt_check` + `_wt_merge`.
- [x] Add `wt audit` / `wt remove` (§7 Mechanism 2).
- [x] Verify `node_modules`/generated dirs are gitignored in worktrees (or the dirty-count is noisy).
- [x] Test matrix: fresh shell → `goose` → create; same shell → `goose` again → reuse; new shell → same name → reuse; manual `cd` into worktree → bind; hard-kill a window → `wt audit` shows the orphan; feature done → remove.

---

## 11. Implementation decisions (ratified 2026-08-04)

Resolved the §9 open decisions. All wrappers are zsh and live in the shell rc
(`.zshrc`), following the memo's snippets with two additions:
`_wt_remove` (referenced but undefined in §7) and `MAIN_BRANCH` defaulted via
`: "${MAIN_BRANCH:=main}"`.

| # | Decision | Choice | Notes |
|---|---|---|---|
| 1 | Shell flavor | **zsh** | Environment default; snippets already zsh. |
| 2 | Default branch | **main** | Both ftn and genproj templates default to `main`; override via `export MAIN_BRANCH`. |
| 3 | Post-exit placement | **cd into the worktree** after creating it | Main footgun resolved deliberately: subsequent manual edits land on the feature branch, not `main`. Reuse/bind paths (cases 1–2) intentionally do not re-`cd`. |
| 4 | Worktree root | **`<parent>/<project>-wt/`** default | Configurable via `WT_ROOT`. In the ftn devcontainer `/workspaces` is a persistent btrfs volume, so `/workspaces/ftn-wt` survives container restarts. |
| 5 | Naming scheme | **Plain feature name** | `feat-a`, `fix-login-bug` — no `feat/` prefix; branch == dir == feature. |
| 6 | `node_modules` | **Each worktree builds its own** | Isolation wins over disk savings; `node_modules` is gitignored so the dirty-count stays clean. |
| 7 | Coordination server | **Deferred — not built** | Revisit only if same-file conflicts become a real recurring annoyance. |
| 8 | (addition) Existing launcher | **`goose()` is the single entry point** | The Doppler wrapper (common + goose secrets, recipe pull on ftn) *is* `goose()` and routes through `_wt_ensure`; the template only installs the plain `command goose` wrapper behind a `typeset -f` guard when no Doppler wrapper was injected. The old `goose-dev` entry point is gone. |

### 11.1 genproj enhancement (default, not opt-in)

The worktree workflow is appended to the generated `.devcontainer/.zshrc`
(`webapp/src/lib/templates/devcontainer-zshrc-full.template`), so **every**
generated devcontainer project gets it by default (per user decision — not a
selectable capability). Covered by
`webapp/tests/lib/utils/devcontainer-generation.test.js`
("includes the multi-session worktree workflow in the generated .zshrc by default").

### 11.2 zsh gotcha fixed during implementation

`local x y mark=" "` inside a `for` loop re-prints prior values on subsequent
iterations (zsh `local` re-declaration behavior). All loop-local variables are
now declared once before the loop in `_wt_audit`.

### 11.3 Main-tree escape hatch (added 2026-08-04)

For quick tasks (reading specs, small chores) where a worktree is overkill, the
"Feature name" prompt now accepts **Enter** (empty name): the wrapper skips
worktree creation, runs goose in the current (main) tree, leaves `GOOSE_WT`
unset, and applies no post-exit `_wt_check`/`cd`. The prompt reads
"Feature name (Enter for main tree, no worktree): ". The worktree path is
unchanged for any non-empty name.
