#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/worktree.sh NAME [--from BRANCH] [--branch BRANCH] [--no-shell] [--delete]

Creates, enters, or deletes a git worktree rooted in ../NAME relative to the repo.

Options:
  --from BRANCH    Base branch or ref to create the worktree from (default: main or $WORKTREE_DEFAULT_BASE).
  --branch BRANCH  Branch name to use for the worktree (default: NAME).
  --no-shell       Do not launch a shell in the target worktree; print its path instead.
  --delete         Remove the worktree and (optionally) its branch.
  --keep-branch    Keep the associated branch when deleting a worktree.
  -h, --help       Show this help message.
EOF
}

NAME=""
BASE_BRANCH="${WORKTREE_DEFAULT_BASE:-main}"
BRANCH_NAME=""
OPEN_SHELL=1
DELETE=0
KEEP_BRANCH=0

resolve_base_ref() {
  local ref="$1"
  if git rev-parse --verify --quiet "$ref" >/dev/null; then
    echo "$ref"
    return 0
  fi

  if [[ "$ref" != origin/* ]]; then
    local remote_ref="origin/$ref"
    if git rev-parse --verify --quiet "$remote_ref" >/dev/null; then
      echo "$remote_ref"
      return 0
    fi
  fi

  local fetch_target="$ref"
  if [[ "$ref" == origin/* ]]; then
    fetch_target="${ref#origin/}"
  fi

  echo "Fetching $fetch_target from origin to resolve base ref" >&2
  if ! git fetch origin "$fetch_target" >/dev/null 2>&1; then
    echo "Failed to fetch $fetch_target from origin" >&2
    exit 1
  fi

  if git rev-parse --verify --quiet "$ref" >/dev/null; then
    echo "$ref"
    return 0
  fi

  if [[ "$ref" != origin/* ]]; then
    local remote_ref="origin/$ref"
    if git rev-parse --verify --quiet "$remote_ref" >/dev/null; then
      echo "$remote_ref"
      return 0
    fi
  fi

  echo "Failed to resolve base ref: $ref" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)
      [[ $# -lt 2 ]] && { echo "Missing value for --from" >&2; exit 1; }
      BASE_BRANCH="$2"
      shift 2
      ;;
    --branch|-b)
      [[ $# -lt 2 ]] && { echo "Missing value for --branch" >&2; exit 1; }
      BRANCH_NAME="$2"
      shift 2
      ;;
    --no-shell)
      OPEN_SHELL=0
      shift
      ;;
    --delete)
      DELETE=1
      OPEN_SHELL=0
      shift
      ;;
    --keep-branch)
      KEEP_BRANCH=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
    *)
      if [[ -z "$NAME" ]]; then
        NAME="$1"
        shift
      else
        echo "Only one NAME argument is supported" >&2
        usage
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$NAME" ]]; then
  echo "Worktree NAME is required" >&2
  usage
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "This command must be run within a git repository" >&2
  exit 1
fi

cd "$REPO_ROOT"

WORKTREE_PARENT="$(cd "$REPO_ROOT/.." && pwd)"
TARGET_PATH="$WORKTREE_PARENT/$NAME"
TARGET_BRANCH="${BRANCH_NAME:-$NAME}"

delete_worktree() {
  local path="$1"
  local branch="$2"

  if ! git worktree list --porcelain | grep -Fxq "worktree $path"; then
    echo "No worktree registered at $path" >&2
    exit 1
  fi

  local current_branch="$branch"
  if [[ -z "$current_branch" ]]; then
    current_branch="$(git worktree list --porcelain | awk -v target="$path" '
      $1=="worktree" { wt=$2 }
      $1=="branch" && wt==target { sub("^branch ", "", $0); print; exit }
    ')"
    current_branch="${current_branch#refs/heads/}"
  fi

  local status=""
  if [[ -d "$path" ]]; then
    status="$(git -C "$path" status --porcelain 2>/dev/null || true)"
  fi

  local remove_args=()
  if [[ -n "$status" ]]; then
    printf "Worktree %s has uncommitted changes:\n%s\n" "$path" "$status"
    read -r -p "Delete anyway? [y/N] " answer
    case "$answer" in
      [yY][eE][sS]|[yY]) remove_args+=(--force) ;;
      *) echo "Aborting delete."; exit 1 ;;
    esac
  fi

  echo "Removing worktree at $path"
  git worktree remove "${remove_args[@]}" "$path"

  if [[ "$KEEP_BRANCH" -eq 0 && -n "$current_branch" ]]; then
    if git show-ref --verify --quiet "refs/heads/$current_branch"; then
      echo "Branch $current_branch remains. Use --keep-branch to skip deleting it."
      read -r -p "Delete branch $current_branch as well? [y/N] " delete_branch
      case "$delete_branch" in
        [yY][eE][sS]|[yY])
          git branch -D "$current_branch"
          ;;
        *)
          echo "Branch retained."
          ;;
      esac
    fi
  fi
}

if [[ "$DELETE" -eq 1 ]]; then
  delete_worktree "$TARGET_PATH" "$BRANCH_NAME"
  exit 0
fi

if git worktree list --porcelain | grep -Fxq "worktree $TARGET_PATH"; then
  echo "Worktree already exists: $TARGET_PATH"
else
  if [[ -e "$TARGET_PATH" ]]; then
    echo "Path already exists but is not registered as a worktree: $TARGET_PATH" >&2
    exit 1
  fi

  if git rev-parse --verify --quiet "$TARGET_BRANCH" >/dev/null; then
    echo "Using existing branch $TARGET_BRANCH"
    git worktree add "$TARGET_PATH" "$TARGET_BRANCH"
  else
    BASE_REF="$(resolve_base_ref "$BASE_BRANCH")"
    echo "Creating worktree $TARGET_PATH from $BASE_REF (branch: $TARGET_BRANCH)"
    git worktree add -b "$TARGET_BRANCH" "$TARGET_PATH" "$BASE_REF"
  fi
fi

if [[ "$OPEN_SHELL" -eq 0 ]]; then
  echo "$TARGET_PATH"
  exit 0
fi

if [[ ! -d "$TARGET_PATH" ]]; then
  echo "Expected worktree directory does not exist: $TARGET_PATH" >&2
  exit 1
fi

echo "Entering worktree: $TARGET_PATH"
cd "$TARGET_PATH"
exec "${SHELL:-/bin/sh}"
