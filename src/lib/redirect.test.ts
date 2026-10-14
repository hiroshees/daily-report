import { DEFAULT_REDIRECT_PATH, safeRedirectPath } from '@/lib/redirect'

describe('safeRedirectPath（オープンリダイレクト対策）', () => {
  it.each([
    '/reports',
    '/reports/12',
    '/reports?page=2&start_date=2025-07-01',
    '/reports#top',
    '/customers',
    '/',
    '/a%2Fb',
  ])('同一オリジンの相対パス %s はそのまま使う', (path) => {
    expect(safeRedirectPath(path)).toBe(path)
  })

  it.each([
    ['未指定', undefined],
    ['null', null],
    ['空文字', ''],
  ])('%s は既定の遷移先', (_name, value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_REDIRECT_PATH)
  })

  it.each([
    ['絶対 URL', 'https://evil.example.com/reports'],
    ['プロトコル相対 URL', '//evil.example.com'],
    ['プロトコル相対 URL（パス付き）', '//evil.example.com/reports'],
    ['バックスラッシュ（ブラウザが / として扱う）', '/\\evil.example.com'],
    ['バックスラッシュの混在', '/\\/evil.example.com'],
    ['タブ入り（ブラウザが取り除いて // になる）', '/\t/evil.example.com'],
    ['改行入り', '/\n/evil.example.com'],
    ['復帰入り', '/\r/evil.example.com'],
    ['NUL 文字', '/\u0000/evil.example.com'],
    ['javascript スキーム', 'javascript:alert(1)'],
    ['data スキーム', 'data:text/html,<script>alert(1)</script>'],
    ['スキームなしのホスト名', 'evil.example.com'],
    ['相対パス（/ で始まらない）', 'reports'],
    ['空白で始まる', ' /reports'],
  ])('%s は拒否して既定の遷移先にする', (_name, value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_REDIRECT_PATH)
  })

  it('ログイン画面自身への遷移は、繰り返しを避けるため既定の遷移先にする', () => {
    expect(safeRedirectPath('/login')).toBe(DEFAULT_REDIRECT_PATH)
    expect(safeRedirectPath('/login?redirect=/reports')).toBe(DEFAULT_REDIRECT_PATH)
    expect(safeRedirectPath('/login/')).toBe(DEFAULT_REDIRECT_PATH)
  })

  it('/login で始まるだけの別のパスは許可する', () => {
    expect(safeRedirectPath('/loginx')).toBe('/loginx')
  })
})
