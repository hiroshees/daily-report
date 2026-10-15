# 営業日報システムAPI仕様書

## 1. API概要

### 1.1 基本情報

- **ベースURL**: `https://api.sales-report.example.com/v1`
- **認証方式**: JWT。ブラウザは **HttpOnly Cookie**（`session`、`SameSite=Lax`、本番は `Secure`）、API クライアントは `Authorization: Bearer {token}`。どちらも受け付ける（両方ある場合は Bearer を優先）
- **データ形式**: JSON
- **文字コード**: UTF-8

### 1.2 エンドポイント一覧

| カテゴリ   | メソッド | エンドポイント         | 説明                     |
| ---------- | -------- | ---------------------- | ------------------------ |
| 認証       | POST     | /auth/login            | ログイン                 |
| 認証       | POST     | /auth/logout           | ログアウト               |
| 認証       | GET      | /auth/me               | ログインユーザー情報取得 |
| 日報       | GET      | /reports               | 日報一覧取得             |
| 日報       | GET      | /reports/{id}          | 日報詳細取得             |
| 日報       | POST     | /reports               | 日報作成                 |
| 日報       | PUT      | /reports/{id}          | 日報更新                 |
| 日報       | DELETE   | /reports/{id}          | 日報削除                 |
| コメント   | GET      | /reports/{id}/comments | コメント一覧取得         |
| コメント   | POST     | /reports/{id}/comments | コメント作成             |
| 営業担当者 | GET      | /sales-persons         | 営業担当者一覧取得       |
| 営業担当者 | GET      | /sales-persons/{id}    | 営業担当者詳細取得       |
| 営業担当者 | POST     | /sales-persons         | 営業担当者作成           |
| 営業担当者 | PUT      | /sales-persons/{id}    | 営業担当者更新           |
| 営業担当者 | DELETE   | /sales-persons/{id}    | 営業担当者削除           |
| 顧客       | GET      | /customers             | 顧客一覧取得             |
| 顧客       | GET      | /customers/{id}        | 顧客詳細取得             |
| 顧客       | POST     | /customers             | 顧客作成                 |
| 顧客       | PUT      | /customers/{id}        | 顧客更新                 |
| 顧客       | DELETE   | /customers/{id}        | 顧客削除                 |

## 2. 共通仕様

### 2.1 リクエストヘッダー

```
Authorization: Bearer {token}   # ブラウザは Cookie で自動的に認証される
Content-Type: application/json
Accept: application/json
```

### 2.2 レスポンスヘッダー

```
Content-Type: application/json; charset=utf-8
X-Request-Id: {request-id}
```

### 2.3 HTTPステータスコード

| コード | 説明                   |
| ------ | ---------------------- |
| 200    | 成功                   |
| 201    | 作成成功               |
| 204    | 削除成功               |
| 400    | リクエストエラー       |
| 401    | 認証エラー             |
| 403    | 権限エラー             |
| 404    | リソースが見つからない |
| 409    | 競合エラー             |
| 500    | サーバーエラー         |

### 2.4 エラーレスポンス形式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      {
        "field": "フィールド名",
        "message": "詳細メッセージ"
      }
    ]
  }
}
```

### 2.5 ページネーション

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

## 3. API詳細

### 3.1 認証API

#### POST /auth/login

ログイン認証を行い、アクセストークンを発行する。レスポンスの `token` は API クライアント用で、ブラウザには同時に HttpOnly Cookie（`session`）が設定される。
メールアドレスが存在しない場合とパスワードが違う場合は区別せず、どちらも `401 AUTH_INVALID_CREDENTIALS` を返す（ユーザーの有無を推測されないため）。

**リクエスト**

```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

**レスポンス**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": "2025-07-28T12:00:00Z",
  "user": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "department": "営業1課",
    "is_manager": false
  }
}
```

#### POST /auth/logout

ログアウト処理。トークンを失効させ（失効リストに登録）、Cookie を削除する。
ログイン状態でなくても `204` を返す（何度呼んでもよい）。

**レスポンス**

```
204 No Content
```

#### GET /auth/me

現在ログインしているユーザー情報を取得

**レスポンス**

```json
{
  "id": 1,
  "name": "山田太郎",
  "email": "yamada@example.com",
  "department": "営業1課",
  "is_manager": false
}
```

### 3.2 日報API

#### GET /reports

日報一覧を取得

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| start_date | string | - | 開始日（YYYY-MM-DD） |
| end_date | string | - | 終了日（YYYY-MM-DD） |
| sales_person_id | integer | - | 営業担当者ID |
| page | integer | - | ページ番号（デフォルト: 1） |
| per_page | integer | - | 1ページあたりの件数（デフォルト: 20） |

**レスポンス**

```json
{
  "data": [
    {
      "id": 1,
      "report_date": "2025-07-27",
      "sales_person": {
        "id": 1,
        "name": "山田太郎"
      },
      "visit_count": 3,
      "has_comments": true,
      "created_at": "2025-07-27T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

#### GET /reports/{id}

日報詳細を取得

**レスポンス**

```json
{
  "id": 1,
  "report_date": "2025-07-27",
  "sales_person": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com"
  },
  "problem": "新規開拓の進捗が遅れている...",
  "plan": "ABC商事への見積もり作成...",
  "visits": [
    {
      "id": 1,
      "customer": {
        "id": 10,
        "company_name": "ABC商事"
      },
      "visit_time": "10:00",
      "visit_content": "新商品の提案を実施..."
    }
  ],
  "comments": [
    {
      "id": 1,
      "manager": {
        "id": 2,
        "name": "田中部長"
      },
      "comment": "新規開拓については明日相談しましょう。",
      "created_at": "2025-07-27T18:00:00Z"
    }
  ],
  "created_at": "2025-07-27T09:00:00Z",
  "updated_at": "2025-07-27T17:30:00Z"
}
```

#### POST /reports

日報を作成

**リクエスト**

```json
{
  "report_date": "2025-07-27",
  "problem": "新規開拓の進捗が遅れている...",
  "plan": "ABC商事への見積もり作成...",
  "visits": [
    {
      "customer_id": 10,
      "visit_time": "10:00",
      "visit_content": "新商品の提案を実施..."
    }
  ]
}
```

**レスポンス**

```json
{
  "id": 1,
  "report_date": "2025-07-27",
  "sales_person_id": 1,
  "problem": "新規開拓の進捗が遅れている...",
  "plan": "ABC商事への見積もり作成...",
  "created_at": "2025-07-27T09:00:00Z"
}
```

#### PUT /reports/{id}

日報を更新（作成者本人のみ。管理者も他人の日報は更新不可）

- `report_date` / `sales_person_id` は変更不可（リクエストに含めても無視される）
- `visits` は差分更新：`id` あり=更新（その日報の訪問記録のみ。他日報の `id` は 400）、`id` なし=新規、送られなかった既存分=削除
- 作成から一定期間（環境変数 `REPORT_EDIT_LIMIT_DAYS`、既定 7 日。暫定・#27）を過ぎると 403 `EDIT_PERIOD_EXPIRED`

**リクエスト**

```json
{
  "problem": "新規開拓の進捗が遅れている（更新）...",
  "plan": "ABC商事への見積もり作成（更新）...",
  "visits": [
    {
      "id": 1,
      "customer_id": 10,
      "visit_time": "10:00",
      "visit_content": "新商品の提案を実施（更新）..."
    },
    {
      "customer_id": 11,
      "visit_time": "14:00",
      "visit_content": "既存システムの保守相談..."
    }
  ]
}
```

**レスポンス**

```json
{
  "id": 1,
  "report_date": "2025-07-27",
  "sales_person_id": 1,
  "problem": "新規開拓の進捗が遅れている（更新）...",
  "plan": "ABC商事への見積もり作成（更新）...",
  "updated_at": "2025-07-27T17:30:00Z"
}
```

#### DELETE /reports/{id}

日報を削除（作成者本人のみ。管理者も他人の日報は削除不可）。訪問記録・コメントも削除される

**レスポンス**

```
204 No Content
```

### 3.3 コメントAPI

#### GET /reports/{id}/comments

日報に対するコメント一覧を取得

**レスポンス**

```json
{
  "data": [
    {
      "id": 1,
      "manager": {
        "id": 2,
        "name": "田中部長"
      },
      "comment": "新規開拓については明日相談しましょう。",
      "created_at": "2025-07-27T18:00:00Z"
    }
  ]
}
```

#### POST /reports/{id}/comments

日報にコメントを追加（管理者のみ）

**リクエスト**

```json
{
  "comment": "新規開拓については明日相談しましょう。"
}
```

**レスポンス**

```json
{
  "id": 1,
  "report_id": 1,
  "manager_id": 2,
  "comment": "新規開拓については明日相談しましょう。",
  "created_at": "2025-07-27T18:00:00Z"
}
```

### 3.4 営業担当者API

#### GET /sales-persons

営業担当者一覧を取得（管理者のみ）

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| department | string | - | 部署名で絞り込み |
| is_manager | boolean | - | 管理者フラグで絞り込み |

**レスポンス**

```json
{
  "data": [
    {
      "id": 1,
      "name": "山田太郎",
      "email": "yamada@example.com",
      "department": "営業1課",
      "is_manager": false
    }
  ]
}
```

#### GET /sales-persons/{id}

営業担当者詳細を取得（管理者のみ）

**レスポンス**

```json
{
  "id": 1,
  "name": "山田太郎",
  "email": "yamada@example.com",
  "department": "営業1課",
  "is_manager": false,
  "created_at": "2025-01-01T09:00:00Z",
  "updated_at": "2025-07-01T10:00:00Z"
}
```

#### POST /sales-persons

営業担当者を作成（管理者のみ）

**リクエスト**

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "password123",
  "department": "営業1課",
  "is_manager": false
}
```

**レスポンス**

```json
{
  "id": 1,
  "name": "山田太郎",
  "email": "yamada@example.com",
  "department": "営業1課",
  "is_manager": false,
  "created_at": "2025-07-27T09:00:00Z"
}
```

#### PUT /sales-persons/{id}

営業担当者を更新（管理者のみ）

**リクエスト**

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "department": "営業2課",
  "is_manager": true
}
```

**レスポンス**

```json
{
  "id": 1,
  "name": "山田太郎",
  "email": "yamada@example.com",
  "department": "営業2課",
  "is_manager": true,
  "updated_at": "2025-07-27T10:00:00Z"
}
```

#### DELETE /sales-persons/{id}

営業担当者を削除（管理者のみ）

日報・コメントから参照されている場合、自分自身、および最後の管理者は削除できない（409 `RESOURCE_IN_USE`）。

**レスポンス**

```
204 No Content
```

### 3.5 顧客API

#### GET /customers

顧客一覧を取得

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| search | string | - | 会社名/担当者名で検索 |
| page | integer | - | ページ番号 |
| per_page | integer | - | 1ページあたりの件数 |

**レスポンス**

```json
{
  "data": [
    {
      "id": 10,
      "company_name": "ABC商事",
      "contact_person": "佐藤一郎",
      "phone": "03-1234-5678",
      "email": "sato@abc.co.jp"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

#### GET /customers/{id}

顧客詳細を取得

**レスポンス**

```json
{
  "id": 10,
  "company_name": "ABC商事",
  "contact_person": "佐藤一郎",
  "phone": "03-1234-5678",
  "email": "sato@abc.co.jp",
  "address": "東京都千代田区...",
  "created_at": "2025-01-01T09:00:00Z",
  "updated_at": "2025-07-01T10:00:00Z"
}
```

#### POST /customers

顧客を作成（管理者のみ）

**リクエスト**

```json
{
  "company_name": "ABC商事",
  "contact_person": "佐藤一郎",
  "phone": "03-1234-5678",
  "email": "sato@abc.co.jp",
  "address": "東京都千代田区..."
}
```

**レスポンス**

```json
{
  "id": 10,
  "company_name": "ABC商事",
  "contact_person": "佐藤一郎",
  "phone": "03-1234-5678",
  "email": "sato@abc.co.jp",
  "address": "東京都千代田区...",
  "created_at": "2025-07-27T09:00:00Z"
}
```

#### PUT /customers/{id}

顧客を更新（管理者のみ）

**リクエスト**

```json
{
  "company_name": "ABC商事",
  "contact_person": "佐藤一郎",
  "phone": "03-1234-5678",
  "email": "sato@abc.co.jp",
  "address": "東京都千代田区..."
}
```

**レスポンス**

```json
{
  "id": 10,
  "company_name": "ABC商事",
  "contact_person": "佐藤一郎",
  "phone": "03-1234-5678",
  "email": "sato@abc.co.jp",
  "address": "東京都千代田区...",
  "updated_at": "2025-07-27T10:00:00Z"
}
```

#### DELETE /customers/{id}

顧客を削除（管理者のみ）

訪問記録から参照されている場合は削除できない（409 `RESOURCE_IN_USE`）。

**レスポンス**

```
204 No Content
```

## 4. エラーコード一覧

| コード                   | HTTP | 説明                                             |
| ------------------------ | ---- | ------------------------------------------------ |
| AUTH_INVALID_CREDENTIALS | 401  | メールアドレスまたはパスワードが正しくありません |
| AUTH_TOKEN_EXPIRED       | 401  | トークンの有効期限が切れています                 |
| AUTH_UNAUTHORIZED        | 401  | 認証が必要です                                   |
| FORBIDDEN                | 403  | この操作を行う権限がありません                   |
| VALIDATION_ERROR         | 400  | 入力値が不正です                                 |
| DUPLICATE_REPORT         | 409  | 同じ日付の日報が既に存在します                   |
| DUPLICATE_EMAIL          | 409  | このメールアドレスは既に登録されています         |
| RESOURCE_IN_USE          | 409  | 他のデータから参照されているため削除できません   |
| EDIT_PERIOD_EXPIRED      | 403  | 編集可能な期間を過ぎています                     |
| NOT_FOUND                | 404  | リソースが見つかりません                         |
| INTERNAL_ERROR           | 500  | サーバーエラーが発生しました                     |

- リクエストボディが上限（1MB）を超えた場合、JSON として不正な場合、`Content-Type` が `application/json` でない場合は、`VALIDATION_ERROR`（400）を返す。

## 5. 制限事項

- APIレート制限：1時間あたり1000リクエスト/ユーザー
- リクエストボディサイズ：最大1MB
- レスポンスタイムアウト：30秒
- 同時接続数：100接続/ユーザー

