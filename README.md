# 営業日報システム

営業担当者が日々の活動を報告し、上長がフィードバックを行うための営業日報管理システムです。
仕様は [CLAUDE.md](CLAUDE.md) と `doc/` 配下を参照してください。

## 技術スタック

| 区分           | 技術                                      |
| -------------- | ----------------------------------------- |
| 言語           | TypeScript                                |
| フレームワーク | Next.js 15 (App Router) / React 19        |
| UI             | Tailwind CSS 4 + shadcn/ui                |
| API スキーマ   | OpenAPI（Zod による検証）                 |
| DB             | Neon (PostgreSQL) + Prisma                |
| テスト         | Vitest / Testing Library / Playwright     |
| コード品質     | ESLint 9 / Prettier / husky / lint-staged |
| デプロイ       | Vercel                                    |
| パッケージ管理 | pnpm                                      |

## 前提条件

- Node.js 22 以上
- pnpm 10 以上（`corepack enable` で `package.json` の `packageManager` が使われます）

## セットアップ

```bash
pnpm install
cp .env.example .env   # 値を設定する
pnpm dev               # http://localhost:3000
```

環境変数は `.env.example` を参照してください（DB 接続情報、JWT の設定）。
認証の実装（#7, #8）までは、`.env` に `DEV_STUB_USER=member`（一般）または `manager`（管理者）を設定すると、
ログイン状態を仮定して認証後の画面を確認できます（開発モードのみ有効）。
データベースのセットアップは Prisma スキーマ導入後（#3）に追記します。

## スクリプト

| コマンド                                | 内容                                        |
| --------------------------------------- | ------------------------------------------- |
| `pnpm dev` / `build` / `start`          | 開発サーバー / 本番ビルド / 本番サーバー    |
| `pnpm lint` / `lint:fix`                | ESLint チェック / 自動修正                  |
| `pnpm format` / `format:check`          | Prettier による整形 / チェック              |
| `pnpm typecheck`                        | TypeScript の型チェック                     |
| `pnpm test` / `test:watch`              | Vitest（ウォッチ / 単発は `pnpm test run`） |
| `pnpm test:coverage`                    | カバレッジ計測                              |
| `pnpm test:e2e`                         | Playwright による E2E テスト                |
| `pnpm db:generate` / `migrate` / `seed` | Prisma（スキーマ導入後に利用可能）          |
| `pnpm api:generate`                     | OpenAPI と API 型の生成                     |

コミット時に husky が lint-staged（ESLint・Prettier）と `pnpm typecheck` を実行します。

## ディレクトリ構成

```
daily-report/
├── src/
│   ├── app/                 # Next.js App Router（ページ・Route Handler）
│   ├── components/          # UI コンポーネント（ui/: shadcn/ui, layout/: ヘッダー等, common/: 共通表示）
│   ├── lib/                 # 共通ユーティリティ（Prisma Client など）
│   ├── schemas/             # Zod スキーマ（API の入出力・OpenAPI 生成元）
│   └── server/
│       ├── services/        # ビジネスロジック
│       └── repositories/    # DB アクセス
├── prisma/                  # Prisma スキーマ・マイグレーション・シード
├── tests/                   # E2E・結合テスト
├── doc/                     # 仕様書（ER 図・画面設計・API・テスト）
└── vitest.config.ts         # `@/` は `src/` に解決される
```

単体テストは対象ファイルの隣に `*.test.ts(x)` として置きます。

## 開発フロー

- 作業は Issue 単位でブランチを切る（例: `feature/issue-1-project-setup`）
- `main` へは Pull Request 経由でマージする
