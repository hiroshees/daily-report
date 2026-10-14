#!/usr/bin/env bash
# 開発用の git worktree を、すぐ使える状態で作る。
#
#   pnpm worktree:add <ブランチ名> [ベース（既定: main）]
#
# - メインのチェックアウトの `.claude/worktrees/<ブランチ名>` に作成する（どの worktree から実行しても同じ場所）
# - git 管理外の `.env.local` をコピーする
# - `pnpm install` を実行する。依存に加えて pre-commit の hook（husky）もここで入る。
#   これを忘れると、その worktree では hook が実行されず、lint エラーのままコミットできてしまう
set -euo pipefail

branch="${1:?使い方: pnpm worktree:add <ブランチ名> [ベース（既定: main）]}"
base="${2:-main}"

# 共通の .git の親 = メインのチェックアウト
main_root="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
dir="$main_root/.claude/worktrees/${branch//\//-}"

if [ -e "$dir" ]; then
  echo "既に存在します: $dir" >&2
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$branch"; then
  git worktree add "$dir" "$branch"
else
  git worktree add -b "$branch" "$dir" "$base"
fi

# .env.local は git 管理外。実行元 → メインの順で探してコピーする
for source in "$(git rev-parse --show-toplevel)/.env.local" "$main_root/.env.local"; do
  if [ -f "$source" ]; then
    cp "$source" "$dir/.env.local"
    echo ".env.local をコピーしました（$source）"
    break
  fi
done
[ -f "$dir/.env.local" ] || echo "注意: .env.local が見つかりません。.env.example を参考に作成してください。" >&2

(cd "$dir" && pnpm install)

cat <<MESSAGE

worktree を作成しました: $dir
  cd "$dir"

注意:
  - 開発サーバーは別のポートで起動してください（例: pnpm dev -p 3001）。
  - ローカルの DB（docker compose）は全 worktree で共有です。pnpm test:db は同時に 1 つの worktree でだけ実行してください。
MESSAGE
