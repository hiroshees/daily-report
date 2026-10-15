/**
 * このファイルは自動生成されます。直接編集しないでください。
 * 再生成: pnpm api:generate（元: src/schemas/、出力元: openapi.json）
 */

export interface paths {
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * ログイン
         * @description ログイン認証を行い、アクセストークン（JWT）を発行する。ブラウザ向けに HttpOnly Cookie（session）も設定する。メールアドレスの不在とパスワード違いは区別しない（どちらも 401）
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["LoginRequest"];
                };
            };
            responses: {
                /** @description ログイン成功 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LoginResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * ログアウト
         * @description トークンを失効させ、Cookie を削除する。ログイン状態でなくても 204 を返す（何度呼んでもよい）
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description ログアウト成功 */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** ログインユーザー情報取得 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description ログインユーザー */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CurrentUser"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 日報一覧取得 */
        get: {
            parameters: {
                query?: {
                    /** @description ページ番号 */
                    page?: number;
                    /** @description 1ページあたりの件数 */
                    per_page?: number;
                    /** @description 開始日（含む） */
                    start_date?: string;
                    /** @description 終了日（含む） */
                    end_date?: string;
                    /** @description 営業担当者ID（管理者のみ有効） */
                    sales_person_id?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 日報一覧 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ReportListItem"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * 日報作成
         * @description 日報と訪問記録を同時に作成する。同一担当者・同一日付の日報は 1 件まで（409）
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ReportCreateRequest"];
                };
            };
            responses: {
                /** @description 作成した日報 */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReportCreateResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 競合（DUPLICATE_REPORT / DUPLICATE_EMAIL / RESOURCE_IN_USE） */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 日報詳細取得 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 日報詳細 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReportDetail"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        /**
         * 日報更新
         * @description 作成者本人のみ（管理者も他人の日報は不可）。訪問記録は差分更新（id あり=更新、id なし=新規、送られなかった既存分=削除。他日報の id は 400）。作成から一定期間（環境変数 REPORT_EDIT_LIMIT_DAYS、既定 7 日）を過ぎると 403 EDIT_PERIOD_EXPIRED
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ReportUpdateRequest"];
                };
            };
            responses: {
                /** @description 更新した日報 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReportUpdateResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        /**
         * 日報削除
         * @description 作成者本人のみ。訪問記録・コメントも削除される
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 削除成功 */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** コメント一覧取得 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description コメント一覧 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Comment"][];
                        };
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * コメント作成
         * @description 管理者のみ
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CommentCreateRequest"];
                };
            };
            responses: {
                /** @description 作成したコメント */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CommentCreateResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sales-persons": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 営業担当者一覧取得
         * @description 管理者のみ
         */
        get: {
            parameters: {
                query?: {
                    /** @description 部署名で絞り込み */
                    department?: string;
                    /** @description 管理者フラグで絞り込み（true / false） */
                    is_manager?: "true" | "false";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 営業担当者一覧 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["SalesPerson"][];
                        };
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * 営業担当者作成
         * @description 管理者のみ。メールアドレスが重複する場合は 409
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SalesPersonCreateRequest"];
                };
            };
            responses: {
                /** @description 作成した営業担当者 */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SalesPersonCreateResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 競合（DUPLICATE_REPORT / DUPLICATE_EMAIL / RESOURCE_IN_USE） */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sales-persons/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 営業担当者詳細取得
         * @description 管理者のみ
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 営業担当者詳細 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SalesPersonDetail"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        /**
         * 営業担当者更新
         * @description 管理者のみ
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["SalesPersonUpdateRequest"];
                };
            };
            responses: {
                /** @description 更新した営業担当者 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SalesPersonUpdateResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 競合（DUPLICATE_REPORT / DUPLICATE_EMAIL / RESOURCE_IN_USE） */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        /**
         * 営業担当者削除
         * @description 管理者のみ。日報・コメントから参照されている場合、自分自身、最後の管理者は削除できない（409）
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 削除成功 */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 競合（DUPLICATE_REPORT / DUPLICATE_EMAIL / RESOURCE_IN_USE） */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/customers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 顧客一覧取得 */
        get: {
            parameters: {
                query?: {
                    /** @description ページ番号 */
                    page?: number;
                    /** @description 1ページあたりの件数 */
                    per_page?: number;
                    /** @description 会社名/担当者名で検索（部分一致） */
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 顧客一覧 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CustomerSummary"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * 顧客作成
         * @description 管理者のみ
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CustomerCreateRequest"];
                };
            };
            responses: {
                /** @description 作成した顧客 */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CustomerCreateResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/customers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 顧客詳細取得 */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 顧客詳細 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Customer"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        /**
         * 顧客更新
         * @description 管理者のみ
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CustomerUpdateRequest"];
                };
            };
            responses: {
                /** @description 更新した顧客 */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CustomerUpdateResponse"];
                    };
                };
                /** @description 入力値が不正（VALIDATION_ERROR） */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        /**
         * 顧客削除
         * @description 管理者のみ。訪問記録から参照されている場合は削除できない（409）
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description 削除成功 */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description 認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED） */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED） */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description リソースが存在しない（NOT_FOUND） */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description 競合（DUPLICATE_REPORT / DUPLICATE_EMAIL / RESOURCE_IN_USE） */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        LoginResponse: {
            /**
             * @description Bearer トークン（API クライアント用）。ブラウザは Cookie で自動的に認証される
             * @example eyJhbGciOiJIUzI1NiIs...
             */
            token: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            expires_at: string;
            user: components["schemas"]["CurrentUser"];
        };
        CurrentUser: {
            /** @example 1 */
            id: number;
            /** @example 山田太郎 */
            name: string;
            /** @example yamada@example.com */
            email: string;
            /** @example 営業1課 */
            department: string;
            is_manager: boolean;
        };
        ErrorResponse: {
            error: {
                code: components["schemas"]["ErrorCode"];
                /** @example 入力値が不正です */
                message: string;
                details?: {
                    /** @example problem */
                    field: string;
                    /** @example 課題・相談は必須項目です */
                    message: string;
                }[];
            };
        };
        /** @enum {string} */
        ErrorCode: "AUTH_INVALID_CREDENTIALS" | "AUTH_TOKEN_EXPIRED" | "AUTH_UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "DUPLICATE_REPORT" | "DUPLICATE_EMAIL" | "RESOURCE_IN_USE" | "EDIT_PERIOD_EXPIRED" | "NOT_FOUND" | "INTERNAL_ERROR";
        LoginRequest: {
            /**
             * Format: email
             * @example yamada@example.com
             */
            email: string;
            /** Format: password */
            password: string;
        };
        ReportListItem: {
            /** @example 1 */
            id: number;
            /**
             * Format: date
             * @example 2025-07-27
             */
            report_date: string;
            sales_person: {
                /** @example 1 */
                id: number;
                /** @example 山田太郎 */
                name: string;
            };
            /** @example 3 */
            visit_count: number;
            has_comments: boolean;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
        };
        Pagination: {
            /** @example 100 */
            total: number;
            /** @example 1 */
            page: number;
            /** @example 20 */
            per_page: number;
            /** @example 5 */
            total_pages: number;
        };
        ReportDetail: {
            /** @example 1 */
            id: number;
            /**
             * Format: date
             * @example 2025-07-27
             */
            report_date: string;
            sales_person: {
                /** @example 1 */
                id: number;
                /** @example 山田太郎 */
                name: string;
                /** @example yamada@example.com */
                email: string;
            };
            problem: string;
            plan: string;
            visits: components["schemas"]["Visit"][];
            comments: components["schemas"]["Comment"][];
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            updated_at: string;
        };
        Visit: {
            /** @example 1 */
            id: number;
            customer: {
                /** @example 1 */
                id: number;
                /** @example ABC商事 */
                company_name: string;
            };
            /** @example 10:00 */
            visit_time: string | null;
            /** @example 新商品の提案を実施... */
            visit_content: string;
        };
        Comment: {
            /** @example 1 */
            id: number;
            manager: {
                /** @example 1 */
                id: number;
                /** @example 田中部長 */
                name: string;
            };
            /** @example 新規開拓については明日相談しましょう。 */
            comment: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
        };
        ReportCreateResponse: {
            /** @example 1 */
            id: number;
            /**
             * Format: date
             * @example 2025-07-27
             */
            report_date: string;
            /** @example 1 */
            sales_person_id: number;
            problem: string;
            plan: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
        };
        ReportCreateRequest: {
            /**
             * Format: date
             * @example 2025-07-27
             */
            report_date: string;
            problem: string;
            plan: string;
            visits: components["schemas"]["VisitCreateInput"][];
        };
        VisitCreateInput: {
            /**
             * @description 顧客ID
             * @example 1
             */
            customer_id: number;
            /** @example 10:00 */
            visit_time?: string | null;
            visit_content: string;
        };
        ReportUpdateResponse: {
            /** @example 1 */
            id: number;
            /**
             * Format: date
             * @example 2025-07-27
             */
            report_date: string;
            /** @example 1 */
            sales_person_id: number;
            problem: string;
            plan: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            updated_at: string;
        };
        ReportUpdateRequest: {
            problem: string;
            plan: string;
            visits: components["schemas"]["VisitUpdateInput"][];
        };
        VisitUpdateInput: {
            /**
             * @description 既存の訪問記録ID（新規は省略）
             * @example 1
             */
            id?: number;
            /**
             * @description 顧客ID
             * @example 1
             */
            customer_id: number;
            /** @example 10:00 */
            visit_time?: string | null;
            visit_content: string;
        };
        CommentCreateResponse: {
            /** @example 1 */
            id: number;
            /** @example 1 */
            report_id: number;
            /** @example 1 */
            manager_id: number;
            comment: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
        };
        CommentCreateRequest: {
            comment: string;
        };
        SalesPerson: {
            /** @example 1 */
            id: number;
            /** @example 山田太郎 */
            name: string;
            /** @example yamada@example.com */
            email: string;
            /** @example 営業1課 */
            department: string;
            is_manager: boolean;
        };
        SalesPersonDetail: components["schemas"]["SalesPerson"] & {
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            updated_at: string;
        };
        SalesPersonCreateResponse: components["schemas"]["SalesPerson"] & {
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
        };
        SalesPersonCreateRequest: {
            name: string;
            /**
             * Format: email
             * @example yamada@example.com
             */
            email: string;
            /** Format: password */
            password: string;
            department: string;
            /** @default false */
            is_manager: boolean;
        };
        SalesPersonUpdateResponse: components["schemas"]["SalesPerson"] & {
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            updated_at: string;
        };
        SalesPersonUpdateRequest: {
            name: string;
            /**
             * Format: email
             * @example yamada@example.com
             */
            email: string;
            department: string;
            is_manager: boolean;
        };
        CustomerSummary: {
            /** @example 1 */
            id: number;
            /** @example ABC商事 */
            company_name: string;
            /** @example 佐藤一郎 */
            contact_person: string | null;
            /** @example 03-1234-5678 */
            phone: string | null;
            /** @example sato@abc.co.jp */
            email: string | null;
        };
        Customer: components["schemas"]["CustomerSummary"] & {
            /** @example 東京都千代田区... */
            address: string | null;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            updated_at: string;
        };
        CustomerCreateResponse: {
            /** @example 1 */
            id: number;
            /** @example ABC商事 */
            company_name: string;
            /** @example 佐藤一郎 */
            contact_person: string | null;
            /** @example 03-1234-5678 */
            phone: string | null;
            /** @example sato@abc.co.jp */
            email: string | null;
            /** @example 東京都千代田区... */
            address: string | null;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            created_at: string;
        };
        CustomerCreateRequest: {
            company_name: string;
            contact_person?: string | null;
            phone?: string | null;
            /**
             * Format: email
             * @example yamada@example.com
             */
            email?: string | null;
            address?: string | null;
        };
        CustomerUpdateResponse: {
            /** @example 1 */
            id: number;
            /** @example ABC商事 */
            company_name: string;
            /** @example 佐藤一郎 */
            contact_person: string | null;
            /** @example 03-1234-5678 */
            phone: string | null;
            /** @example sato@abc.co.jp */
            email: string | null;
            /** @example 東京都千代田区... */
            address: string | null;
            /**
             * Format: date-time
             * @example 2025-07-27T09:00:00Z
             */
            updated_at: string;
        };
        CustomerUpdateRequest: {
            company_name: string;
            contact_person?: string | null;
            phone?: string | null;
            /**
             * Format: email
             * @example yamada@example.com
             */
            email?: string | null;
            address?: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
