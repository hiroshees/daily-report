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
]

export default eslintConfig
