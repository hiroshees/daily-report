import type { NextConfig } from 'next'
import { buildSecurityHeaders } from './src/server/security-headers'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // このプロジェクトのディレクトリを、ファイルトレースの基準にする。
  // 指定しないと、リポジトリ内に作った git worktree（.claude/worktrees/）で、
  // 親ディレクトリの pnpm-lock.yaml を見つけて基準を誤認し、警告が出る
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(process.env.NODE_ENV !== 'production'),
      },
    ]
  },
}

export default nextConfig
