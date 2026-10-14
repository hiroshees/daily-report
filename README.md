# 営業日報システム

営業担当者が日々の活動を報告し、上長がフィードバックを行うための営業日報管理システムです。

## 🚀 技術スタック

- **フレームワーク**: Next.js 15.5.2 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 3.4 + shadcn/ui
- **データベース**: SQLite + Prisma ORM (開発環境)
- **認証**: JWT (実装済み)
- **グラフ**: Recharts
- **テスト**: Vitest + Testing Library + Playwright (E2E)
- **コード品質**: ESLint + Prettier + Husky

## 📋 前提条件

- Node.js 18.0.0 以上
- npm 9.0.0 以上
- SQLite (開発環境)

## 🛠 セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/hiroshees/daily-report.git
cd daily-report
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、必要な値を設定してください。

```bash
cp .env.example .env
```

必要な環境変数:

- `DATABASE_URL`: SQLite接続文字列 (デフォルト: `file:./dev.db`)
- `JWT_SECRET`: JWT署名用シークレットキー
- `JWT_REFRESH_SECRET`: リフレッシュトークン用シークレットキー

### 4. データベースのセットアップ

```bash
# Prismaのマイグレーション実行
npx prisma migrate dev

# 初期データの投入
npx prisma db seed
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## 🔐 テストアカウント

### 一般ユーザー
- **メールアドレス**: yamada@example.com
- **パスワード**: Password123

### 管理者
- **メールアドレス**: tanaka@example.com
- **パスワード**: Password123

## 📁 プロジェクト構成

```
daily-report/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # ルートレイアウト
│   │   ├── page.tsx          # ホームページ
│   │   ├── error.tsx         # エラーハンドリング
│   │   ├── loading.tsx       # ローディング状態
│   │   ├── not-found.tsx     # 404ページ
│   │   └── globals.css       # グローバルスタイル
│   ├── components/           # 共通コンポーネント (今後追加)
│   ├── lib/                  # ユーティリティ関数 (今後追加)
│   └── types/                # TypeScript型定義
├── prisma/
│   └── schema.prisma         # データベーススキーマ (今後追加)
├── tests/                    # テストファイル
├── doc/                      # ドキュメント
│   ├── API_SCHEME.md         # API仕様書
│   ├── ER_DIAGRAM.md         # ER図
│   ├── SCREEN_DESIGN.md      # 画面設計書
│   └── TEST_DEFINITION.md    # テスト仕様書
└── public/                   # 静的ファイル
```

## 🔧 利用可能なスクリプト

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# TypeScript型チェック
npm run typecheck

# ESLintチェック
npm run lint

# ESLint自動修正
npm run lint:fix

# Prettierフォーマット
npm run format

# Prettierチェック
npm run format:check

# テスト実行
npm run test

# テスト（ウォッチモード）
npm run test:watch

# テストカバレッジ
npm run test:coverage
```

## 🎨 スタイルガイド

### Tailwindカスタムコンポーネント

プロジェクトでは以下のカスタムユーティリティクラスを定義しています：

- `.btn` - 基本ボタンスタイル
- `.btn-primary` - プライマリボタン
- `.btn-secondary` - セカンダリボタン
- `.btn-danger` - 削除・危険操作用ボタン
- `.input` - フォーム入力フィールド
- `.label` - フォームラベル
- `.card` - カードコンポーネント

## 🧪 テスト

```bash
# 単体テスト実行
npm run test

# カバレッジレポート生成
npm run test:coverage

# UIモードでテスト実行
npm run test:ui
```

## 📝 開発ガイドライン

### ブランチ戦略

- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正
- `docs/*`: ドキュメント更新

### コミットメッセージ規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・設定変更
```

### Pull Requestフロー

1. featureブランチを作成
2. 変更を実装
3. テストを追加・実行
4. Pull Requestを作成
5. レビュー・承認
6. mainブランチへマージ

## ✅ 実装済み機能

- [] Prismaデータベース設定 (SQLite)
- [] shadcn/uiコンポーネント導入
- [] JWT認証システム
- [] ログイン/ログアウト機能
- [] 日報CRUD機能
- [] 訪問記録管理
- [] 上長コメント機能
- [] 顧客マスタ管理 (管理者のみ)
- [] 営業担当者マスタ管理 (管理者のみ)
- [] 分析・レポート機能
- [] 権限管理 (一般ユーザー/管理者)

## 🚧 今後の実装予定

- [ ] OpenAPI仕様定義
- [ ] Google Cloud Runへのデプロイ
- [ ] 月次レポート機能
- [ ] エクスポート機能

## 📄 ライセンス

プライベートプロジェクト

## 👥 コントリビューター

- [@hiroshees](https://github.com/hiroshees)

## 📞 お問い合わせ

Issues: [GitHub Issues](https://github.com/hiroshees/daily-report/issues)
