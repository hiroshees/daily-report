import { parseBackHref, withBack } from '@/lib/report-back'

describe('parseBackHref', () => {
  it('検索条件つきの一覧 URL を返す', () => {
    expect(parseBackHref('/reports?start_date=2025-07-01&page=2')).toBe(
      '/reports?start_date=2025-07-01&page=2',
    )
  })

  it('未指定・空は既定の一覧', () => {
    expect(parseBackHref(undefined)).toBe('/reports')
    expect(parseBackHref('')).toBe('/reports')
  })

  it('配列は先頭だけを使う', () => {
    expect(parseBackHref(['/reports?page=3', '/other'])).toBe('/reports?page=3')
  })

  it('一覧以外・外部 URL は既定の一覧にする', () => {
    expect(parseBackHref('/reports/1')).toBe('/reports')
    expect(parseBackHref('/sales-persons')).toBe('/reports')
    expect(parseBackHref('//evil.example.com')).toBe('/reports')
    expect(parseBackHref('https://evil.example.com/reports')).toBe('/reports')
    expect(parseBackHref('/\\evil.example.com')).toBe('/reports')
  })
})

describe('withBack', () => {
  it('既定の一覧に戻るだけなら back を付けない', () => {
    expect(withBack('/reports/1', '/reports')).toBe('/reports/1')
  })

  it('検索条件つきの一覧は、エンコードして back に付ける', () => {
    expect(withBack('/reports/1', '/reports?page=2')).toBe('/reports/1?back=%2Freports%3Fpage%3D2')
  })

  it('エンコードした値を parseBackHref で元に戻せる', () => {
    const url = new URL(withBack('/reports/1', '/reports?a=1&b=2'), 'http://localhost')
    expect(parseBackHref(url.searchParams.get('back') ?? undefined)).toBe('/reports?a=1&b=2')
  })
})
