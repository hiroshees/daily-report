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
cp .env.example .env.local    # 値を設定する（JWT_SECRET など）
docker compose up -d          # ローカル PostgreSQL（ポート 5433）を起動
pnpm db:migrate               # マイグレーションを適用
pnpm db:seed                  # 開発用データを投入
pnpm dev                      # http://localhost:3000
```

- 環境変数は `.env.local`（git 管理外）に設定します。項目は `.env.example` を参照してください（DB 接続情報、JWT の設定）。
- `JWT_SECRET` は 32 文字以上のランダム文字列にします（`openssl rand -base64 48`）。未設定・短い場合は起動時にエラーになります。
- 本番・Preview の DB は Neon（Vercel Marketplace 経由）です。`DATABASE_URL` はプール接続、`DIRECT_URL` は直接接続（マイグレーション用）を設定します。

### データベース

- スキーマは `prisma/schema.prisma`（ER 図は `doc/ER_DIAGRAM.md`）。変更したら `pnpm db:migrate` でマイグレーションを作成します。
- Prisma CLI は `.env` しか自動で読まないため、`prisma` を直接実行せず `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:studio`（`.env.local` を読み込むラッパー）を使ってください。
- ローカル DB は `docker compose down` で停止、`docker compose down -v` でデータごと削除します。
- DB を使うテスト（`*.db.test.ts`）は `pnpm test:db` で実行します。テスト専用の DB（`daily_report_test`）を使い、
  データベース名が `_test` で終わらない場合は実行を拒否します。通常の `pnpm test` は DB を必要としません。

### シードデータ（開発用）

`pnpm db:seed` で、`doc/TEST_DEFINITION.md` 2.3 に沿った開発用データを投入します。

| データ     | 件数                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| 営業担当者 | 10 名（管理者 2・一般 8）                                                   |
| 顧客       | 100 社                                                                      |
| 日報       | 実行日の前日から過去 3 ヶ月分の営業日（約 600 件）、訪問記録は 1〜5 件/日報 |
| コメント   | 約 3 割の日報に管理者がコメント                                             |

- 実行日の日報は作りません（日報作成の動作確認ができるようにするため）。
- 固定の乱数シードを使うため、同じ日に実行すれば同じ内容になります。
- **実行のたびに全テーブルを空にして入れ直します**（手で追加したデータも消えます）。何度実行しても重複しません。
- 本番では実行できません。接続先がローカル以外（Neon など）の場合は、`SEED_ALLOW_REMOTE=true` を付けた場合のみ実行できます。

ログイン用アカウント（パスワードは全員共通で `Test1234!`）:

| 権限   | メールアドレス       | 氏名      |
| ------ | -------------------- | --------- |
| 一般   | `yamada@example.com` | 山田 太郎 |
| 管理者 | `tanaka@example.com` | 田中 部長 |

他に一般: `suzuki` / `sato` / `takahashi` / `ito` / `watanabe` / `kato` / `yoshida`、管理者: `kobayashi`（いずれも `@example.com`）。
ログイン API（`POST /api/v1/auth/login`）は利用できます。ログイン画面は #8 で実装します。

### API スキーマ（Zod → OpenAPI）

Zod スキーマ（`src/schemas/`）が唯一の情報源です。リクエストの検証、`openapi.json`、フロントの型付き API クライアントは、すべてここから作られます。

```
src/schemas/*.ts ──▶ openapi.json ──▶ src/lib/api-schema.d.ts ──▶ src/lib/api-client.ts（openapi-fetch）
   （Zod: 検証・唯一の情報源）  （pnpm openapi:generate）    （pnpm api:types）
```

- スキーマや API を変更したら **`pnpm api:generate`** を実行し、`openapi.json` と `src/lib/api-schema.d.ts` を**一緒にコミット**します（自動生成物のため直接編集しない）。
- 実行し忘れると `pnpm test` の「生成物が最新であること」が失敗します。
- Route Handler では `src/schemas/` の Zod スキーマで入力を検証し、エラーメッセージは画面定義書（`doc/SCREEN_DESIGN.md` 6 章）の形式に揃えています。
- 文字数は**コードポイント単位**で数えます（絵文字を 2 文字として数えません）。

### 認証

JWT を使い、トークンの保持方式は **HttpOnly Cookie**（ブラウザ）と **Bearer**（API クライアント）の両方に対応しています。

| 項目         | 内容                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cookie       | `session`。`HttpOnly`（JavaScript から読めない）・`SameSite=Lax`・本番は `Secure`                                                     |
| トークン     | HS256 の JWT（`jose`）。ペイロードは `sub`（ユーザー ID）・`jti`・`iss`・`iat`・`exp` のみ。有効期間は `JWT_EXPIRES_IN`（既定 24h）   |
| 毎回の確認   | 署名・期限に加え、DB で「ユーザーが存在するか」「失効していないか」を確認。管理者フラグの変更やユーザー削除が即時に反映される         |
| ログアウト   | トークンの `jti` を失効リスト（`revoked_token`）に登録し、Cookie を削除。他の端末のトークンには影響しない。期限切れの記録は自動で削除 |
| CSRF         | `Origin` が自分のホストと違う状態変更リクエスト（POST/PUT/DELETE）は 403                                                              |
| ログイン失敗 | メールアドレスが無い場合もパスワード違いと同じ応答・同じ処理時間（ユーザーの有無を推測されない）                                      |

- API: `POST /api/v1/auth/login`・`POST /api/v1/auth/logout`・`GET /api/v1/auth/me`
- Server Component では `getSessionUser()`、Route Handler では `requireAuth(request)` / `requireManager(request)` を使います。
- ログイン画面は #8 で実装します。それまでは、ブラウザの開発者ツールのコンソールで次を実行するとログインできます（シードのアカウント）。

```js
await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'tanaka@example.com', password: 'Test1234!' }),
})
```

### Route Handler の書き方

API は `defineRoute`（`src/server/http.ts`）で定義します。認証・入力検証・エラー変換・共通ヘッダー（`X-Request-Id`、`Content-Type`）をまとめて面倒を見ます。

```ts
// src/app/api/v1/customers/route.ts
export const GET = defineRoute({
  query: CustomerListQuerySchema, // 検証済みの値が handler に渡る（失敗は 400 VALIDATION_ERROR）
  handler: async ({ query }) => {
    const [rows, total] = await listCustomers(query)
    return paginatedResult(rows, total, query)
  },
})

export const POST = defineRoute({
  auth: 'manager', // 'user'（既定: ログイン必須）| 'manager' | 'none'
  body: CustomerCreateRequestSchema,
  status: 201,
  handler: async ({ body }) => createCustomer(body),
})
```

- 認証は**既定でログイン必須**です。公開 API だけ `auth: 'none'` を明示します。認証は入力検証より先に行います。
- エラーは `throw new ApiError('NOT_FOUND')` のようにコードで投げます。HTTP ステータスとメッセージは `doc/API_SCHEME.md` 4 章と一致します（テストで検証）。
- 想定外の例外は 500 `INTERNAL_ERROR` になり、詳細（スタックトレースなど）はレスポンスに出さずログにだけ残ります。
- 権限チェックは `requireAuth()` / `requireManager()` / `canEditReport()`（`src/server/auth.ts`）、一覧は `toSkipTake()` と `paginatedResult()`（`src/server/pagination.ts`）を使います。
- リクエストボディは 1MB までで、`Content-Type: application/json` が必要です。

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
│       ├── http.ts          # defineRoute（Route Handler の共通処理）
│       ├── errors.ts        # ApiError・エラーコードと HTTP ステータス
│       ├── auth.ts          # 認可ヘルパー（requireAuth / requireManager）
│       ├── session.ts       # リクエストからログイン状態を判定
│       ├── jwt.ts           # JWT の発行・検証
│       ├── cookies.ts       # セッション Cookie の発行・取り出し
│       ├── env.ts           # 認証の環境変数の検証
│       ├── pagination.ts    # ページネーション
│       ├── services/        # ビジネスロジック
│       └── repositories/    # DB アクセス
├── scripts/                 # 生成スクリプト（OpenAPI・API 型）
├── openapi.json             # 自動生成（pnpm api:generate）
├── prisma/                  # Prisma スキーマ・マイグレーション・シード
├── docker/                  # ローカル DB の初期化スクリプト（docker-compose.yml は直下）
├── tests/                   # E2E・結合テスト
├── doc/                     # 仕様書（ER 図・画面設計・API・テスト）
└── vitest.config.ts         # `@/` は `src/` に解決される
```

単体テストは対象ファイルの隣に `*.test.ts(x)` として置きます。

## 開発フロー

- 作業は Issue 単位でブランチを切る（例: `feature/issue-1-project-setup`）
- `main` へは Pull Request 経由でマージする
