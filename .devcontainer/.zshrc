# Automatically heal/resolve VS Code Remote Containers IPC and SSH auth sockets
if [ -z "$REMOTE_CONTAINERS_IPC" ] || [ ! -S "$REMOTE_CONTAINERS_IPC" ]; then
  latest_ipc=$(ls -t /tmp/vscode-remote-containers-ipc-*.sock 2>/dev/null | head -n 1)
  if [ -n "$latest_ipc" ]; then
    export REMOTE_CONTAINERS_IPC="$latest_ipc"
  fi
fi
if [ -z "$SSH_AUTH_SOCK" ] || [ ! -S "$SSH_AUTH_SOCK" ]; then
  latest_ssh=$(ls -t /tmp/vscode-ssh-auth-*.sock 2>/dev/null | head -n 1)
  if [ -n "$latest_ssh" ]; then
    export SSH_AUTH_SOCK="$latest_ssh"
  fi
fi

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git web-search zsh-autosuggestions zsh-syntax-highlighting)

# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH=$HOME/.oh-my-zsh	

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
# Set Oh My Zsh theme conditionally to avoid Cursor hanging issues
# See https://forum.cursor.com/t/cursor-agent-mode-when-running-terminal-commands-often-hangs-up-the-terminal-requiring-a-click-to-pop-it-out-in-order-to-continue-commands/59969/15
# And https://forum.cursor.com/t/cursor-agent-terminal-doesn-t-work-well-with-powerlevel10k-oh-my-zsh/96808/12
# Final fix there: https://forum.cursor.com/t/agent-not-detecting-that-a-command-has-completed/65052/19
if [[ "$PAGER" == "sh -c \"head -n 10000 | cat\"" ]]; then
  ZSH_THEME=""  # Disable Powerlevel10k for Cursor chat terminals only
else
  ZSH_THEME="powerlevel10k/powerlevel10k"
fi

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME="codespaces"
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

source $ZSH/oh-my-zsh.sh

# Use a minimal prompt in Cursor chat terminals to avoid command detection issues
if [[ "$TERM_PROGRAM" == "vscode" && -n "$CURSOR_TRACE_ID" ]]; then
  PROMPT='%n@%m:%~%# '
  RPROMPT=''
else
  [[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh
fi

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
DISABLE_AUTO_UPDATE=true
DISABLE_UPDATE_PROMPT=true

# A robust function to run Antigravity with Doppler, ensuring no stale SonarQube containers exist.
# Secrets are loaded from the 'common' project first, then the current project's secrets layer on
# top (project-specific secrets take precedence over common ones).
agy-dev() {
  # Define the name of the container to check for
  local container_name="sonarqube-mcp-server"

  # Find the container ID using Docker's filter. The -q flag means "quiet" (ID only).
  local container_id=$(docker ps -a -q --filter "name=${container_name}")

  # Check if the container_id variable is not empty
  if [ -n "$container_id" ]; then
    echo "Found stale container '${container_name}' ($container_id). Removing it..."
    # Force remove the container. The -f flag stops it if it's running.
    docker rm -f "$container_id"
  fi

  echo "Starting Antigravity with Doppler (common + webapp)..."
  # Load common secrets first, then layer project-specific secrets on top.
  # --forward-signals ensures SIGINT/SIGTERM are correctly passed through to agy.
  doppler run --project common --config dev -- doppler run --forward-signals --project webapp --config dev -- agy "$@"
}

# A robust function to run goose with Doppler, ensuring all secrets are available.
# Secrets are loaded from the 'common' project first, then the 'goose' project's secrets layer on
# top (project-specific secrets take precedence over common ones).
goose-dev() {
  echo "Starting goose with Doppler (common + goose)..."
  # Pull latest goose recipes (nickbrett1/goose-recipes) so recipe updates are
  # picked up on every launch without waiting for a container restart.
  if [ -d "$HOME/.config/goose/recipes/.git" ]; then
    (cd "$HOME/.config/goose/recipes" && git pull --ff-only --quiet) \
      || echo "WARN: Could not update goose-recipes (offline?); using existing copy."
  else
    echo "WARN: goose recipes not installed; run goose-config-bootstrap.sh to install."
  fi
  # Load common secrets first, then layer goose project secrets on top.
  # Uses 'prd' config for the goose project to pick up LITELLM endpoint env vars.
  # --forward-signals ensures SIGINT/SIGTERM are correctly passed through to goose.
  # Runs inside this shell's feature worktree (see "Multi-Session Worktree Workflow" below).
  _wt_ensure doppler run --project common --config dev -- doppler run --forward-signals --project goose --config prd -- goose "$@"
}

# Change directory to the workspace if starting in the home directory
if [[ "$PWD" == "$HOME" ]]; then
  cd /workspaces/ftn 2>/dev/null
fi

# Automatically start or attach to a tmux session for interactive shells
if command -v tmux &> /dev/null && [[ -z "$TMUX" && -z "$CURSOR_TRACE_ID" && $- == *i* && -t 0 && -t 1 ]]; then
  # Determine a session name. If we are in /workspaces/something, use that folder name. Else default to "main".
  session_name="main"
  if [[ "$PWD" =~ ^/workspaces/([^/]+) ]]; then
    session_name="${match[1]}"
  fi

  if [[ -n "$SSH_CONNECTION" || -n "$MOSH_CLIENT" ]]; then
    if tmux has-session -t "$session_name" 2>/dev/null; then
      exec tmux attach-session -t "$session_name"
    else
      exec tmux new-session -s "$session_name"
    fi
  elif tmux has-session -t "$session_name" 2>/dev/null; then
    # Add a new window (tab) to the existing session
    tmux new-window -t "$session_name"
    exit
  else
    # First terminal: start the main session
    exec tmux new-session -s "$session_name"
  fi
fi

# Automatically restore VS Code sockets from /tmp if missing or stale
restore_vscode_sockets() {
  local current_user
  current_user=$(whoami)

  # 1. REMOTE_CONTAINERS_IPC (Git credential helper socket)
  if [[ -z "$REMOTE_CONTAINERS_IPC" || ! -S "$REMOTE_CONTAINERS_IPC" ]]; then
    local sockets
    sockets=($(find /tmp -maxdepth 1 -user "$current_user" -type s -name "vscode-remote-containers-ipc-*.sock" 2>/dev/null))
    if [ ${#sockets[@]} -gt 0 ]; then
      local socket
      socket=$(ls -t "${sockets[@]}" 2>/dev/null | head -n 1)
      if [[ -n "$socket" ]]; then
        export REMOTE_CONTAINERS_IPC="$socket"
      fi
    fi
  fi

  # 2. SSH_AUTH_SOCK (SSH Agent forwarding socket)
  if [[ -z "$SSH_AUTH_SOCK" || ! -S "$SSH_AUTH_SOCK" ]]; then
    local sockets
    sockets=($(find /tmp -maxdepth 1 -user "$current_user" -type s -name "vscode-ssh-auth-*.sock" 2>/dev/null))
    if [ ${#sockets[@]} -gt 0 ]; then
      local socket
      socket=$(ls -t "${sockets[@]}" 2>/dev/null | head -n 1)
      if [[ -n "$socket" ]]; then
        export SSH_AUTH_SOCK="$socket"
      fi
    fi
  fi

  # 3. VSCODE_IPC_HOOK_CLI (VS Code CLI communication socket)
  if [[ -z "$VSCODE_IPC_HOOK_CLI" || ! -S "$VSCODE_IPC_HOOK_CLI" ]]; then
    local sockets
    sockets=($(find /tmp -maxdepth 1 -user "$current_user" -type s -name "vscode-ipc-*.sock" 2>/dev/null))
    if [ ${#sockets[@]} -gt 0 ]; then
      local socket
      socket=$(ls -t "${sockets[@]}" 2>/dev/null | head -n 1)
      if [[ -n "$socket" ]]; then
        export VSCODE_IPC_HOOK_CLI="$socket"
      fi
    fi
  fi
}

# Run once on shell startup
restore_vscode_sockets

# Automatically update environment variables from tmux session inside tmux
tmux_update_environment() {
  if [ -n "$TMUX" ]; then
    eval $(tmux show-environment -s 2>/dev/null | grep -E "VSCODE|GIT|SSH")
    # Also verify and restore sockets if they became stale/missing after tmux update
    restore_vscode_sockets
  fi
}
if [ -n "$TMUX" ]; then
  # Run once on startup
  tmux_update_environment
  # Run before every command
  autoload -Uz add-zsh-hook
  add-zsh-hook preexec tmux_update_environment
fi
# ============================================================================

# ============================================================================
# Goose Multi-Session Worktree Workflow
# spec: specs/005-goose-multi-session-worktree/spec.md
# One worktree per shell:  tmux window = shell = worktree = branch = feature
# ----------------------------------------------------------------------------
# Commands:
#   goose            → run goose in this shell's feature worktree; Enter = main tree
#   wt audit         → list all worktrees, flag dirty/unmerged ones
#   wt remove <name> → remove a finished worktree and its branch
# Knobs:
#   MAIN_BRANCH  (default: main)
#   WT_ROOT      (default: <parent-of-project>/<project>-wt)
#   GOOSE_WT     (runtime binding, set per shell — do not edit)
# ============================================================================

: "${MAIN_BRANCH:=main}"   # default branch name (override with export MAIN_BRANCH)

# --- Core worktree logic: ensure a worktree is bound to this shell, then run ---
_wt_ensure() {
  local wt="${GOOSE_WT:-}"

  # 1) This shell already has a bound worktree → reuse it.
  if [[ -n "$wt" && -d "$wt" ]]; then
    _wt_run "$wt" "$@"
    return $?
  fi

  # 2) Already INSIDE a linked worktree (cd'd there manually) → bind & use it.
  local top
  top="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "goose: not inside a git repository"; return 1
  }
  if [[ -f "$top/.git" ]]; then
    export GOOSE_WT="$top"
    _wt_run "$top" "$@"
    return $?
  fi

  # 3) At project root, no binding → ask for a feature name and create/reuse a
  #    worktree, OR press Enter to run in the main tree (no worktree).
  local WT_ROOT="${WT_ROOT:-$(dirname "$PWD")/$(basename "$PWD")-wt}"
  local feat
  print -n "Feature name (Enter for main tree, no worktree): "
  read -r feat || return 1
  feat="${feat:l}"; feat="${feat// /-}"          # lowercase, spaces → dashes
  if [[ -z "$feat" ]]; then
    unset GOOSE_WT
    echo "→ running in the main tree (no worktree)"
    "$@"
    return $?
  fi

  wt="$WT_ROOT/$feat"
  if [[ ! -d "$wt" ]]; then
    mkdir -p "$WT_ROOT"
    git worktree add "$wt" -b "$feat" || return 1
    echo "→ created worktree $wt (branch $feat)"
  else
    echo "→ reusing existing worktree $wt"
  fi

  export GOOSE_WT="$wt"
  _wt_run "$wt" "$@"
  local rc=$?
  _wt_check "$wt"
  cd "$wt" || return $rc                       # post-exit: land on the feature branch
  echo "Tip: now in $wt (branch $feat) — 'wt audit' lists all worktrees."
  return $rc
}

_wt_run() {
  local wt="$1"; shift
  ( cd "$wt" && "$@" )                         # subshell: goose runs in the worktree
}

# --- Post-exit WIP check: commit / merge / skip (never auto-merge) ---
_wt_check() {
  local wt="$1"
  local branch dirty ahead
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

# Merge must run from the main worktree (main is only checked out there).
_wt_merge() {
  local wt="$1" branch="$2"
  local main
  main="$(git -C "$wt" worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
  [[ -n "$(git -C "$main" status --porcelain)" ]] && { echo "✗ main worktree dirty — stash there first"; return 1; }
  [[ "$(git -C "$main" branch --show-current)" != "$MAIN_BRANCH" ]] && { echo "✗ main not on $MAIN_BRANCH"; return 1; }
  git -C "$wt" merge "$MAIN_BRANCH" --no-edit && {
    git -C "$main" merge "$branch" --no-ff -m "Merge $branch"
  } || echo "✗ conflicts merging $MAIN_BRANCH into $branch — resolve in $wt, then re-run"
}

# --- wt audit / wt remove: catch orphans (hard-killed shells, forgotten branches) ---
wt() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "wt: not inside a git repository"; return 1; }
  case "${1:-audit}" in
    audit)  _wt_audit ;;
    remove) _wt_remove "$2" ;;
    *) echo "usage: wt [audit|remove <name>]" ;;
  esac
}

_wt_audit() {
  local w branch dirty ahead last mark
  local -a wts
  wts=("${(@f)$(git worktree list --porcelain | awk '/^worktree /{print $2}')}")
  echo "ALL WORKTREES  (dirty=uncommitted files, ahead=commits not on $MAIN_BRANCH)"
  printf '%-4s %-28s %-9s %-8s %s\n' '' WORKTREE DIRTY AHEAD LAST-COMMIT
  for w in $wts; do
    mark=" "
    branch="$(git -C "$w" branch --show-current 2>/dev/null)"
    dirty="$(git -C "$w" status --porcelain | wc -l | tr -d ' ')"
    ahead="$(git -C "$w" rev-list --count "$MAIN_BRANCH..$branch" 2>/dev/null | tr -d ' ')"
    last="$(git -C "$w" log -1 --format='%cr' "$branch" 2>/dev/null)"
    (( dirty > 0 || ahead > 0 )) && mark="⚠"
    printf '%-4s %-28s %-9s %-8s %s\n' "$mark" "${w##*/}" "${dirty:-0}" "${ahead:-0}" "$last"
  done
}

_wt_remove() {
  local name="$1"
  [[ -z "$name" ]] && { echo "usage: wt remove <name>"; return 1; }
  local WT_ROOT="${WT_ROOT:-$(dirname "$PWD")/$(basename "$PWD")-wt}"
  local wt="$WT_ROOT/$name"
  [[ -d "$wt" ]] || { echo "✗ no worktree at $wt"; return 1; }
  if ! git -C "$wt" worktree remove "$wt"; then
    echo "✗ remove refused (dirty?) — commit or discard changes first"
    return 1
  fi
  if git branch -d "$name" 2>/dev/null; then
    echo "✓ removed worktree $wt and deleted branch $name"
  else
    echo "✓ worktree removed; branch $name kept (unmerged?)"
  fi
}

# --- Entry point: run goose inside this shell's worktree ---
goose() { _wt_ensure command goose "$@"; }
