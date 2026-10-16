import { useEffect } from 'react'

/**
 * 未保存の入力がある間、ページからの離脱を確認する。
 * - リロード・タブを閉じる: `beforeunload`
 * - アプリ内リンク（ヘッダーのナビなど）: クリックを捕捉して `confirm`
 * App Router には遷移を止める標準 API がないため、ブラウザの「戻る」操作は対象外。
 */
export function useUnsavedChangesGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      // 新しいタブ・別オリジン・同一ページ内のリンクは、このページの離脱ではない
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      if (!window.confirm(message)) {
        // Next.js の Link の遷移処理に届く前に止める
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    // キャプチャ段階で受け、React / Next.js のクリック処理より先に判定する
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [active, message])
}
