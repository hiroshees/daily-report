import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
})

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.claude/**',
      'coverage/**',
      'playwright-report/**',
      'next-env.d.ts',
      'src/lib/api-schema.d.ts',
    ],
  },
  ...compat.config({
    // prettier は最後に置き、フォーマット関連のルールを無効化する
    extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
  }),
  {
    // セキュリティ対策（#22）：XSS・SQL インジェクションにつながる書き方を禁止する
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'dangerouslySetInnerHTML は使用禁止です（XSS 対策）。React のエスケープに任せてください。',
        },
        {
          selector: 'MemberExpression[property.name=/^\\$(query|execute)RawUnsafe$/]',
          message:
            '$queryRawUnsafe / $executeRawUnsafe は使用禁止です（SQL インジェクション対策）。タグ付きテンプレートの $queryRaw を使ってください。',
        },
      ],
    },
  },
  {
    // テーブル名・列名（識別子）はパラメータ化できない。値は Prisma のスキーマ定義由来で、ユーザー入力は含まない
    files: ['prisma/seed/db.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]

export default eslintConfig
