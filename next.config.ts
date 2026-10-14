import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // このプロジェクトのディレクトリを、ファイルトレースの基準にする。
  // 指定しないと、リポジトリ内に作った git worktree（.claude/worktrees/）で、
  // 親ディレクトリの pnpm-lock.yaml を見つけて基準を誤認し、警告が出る
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig
