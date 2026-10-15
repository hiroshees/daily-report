import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { findReportIdByDate } from '@/server/services/report-list'

/** 「新規日報作成」ボタン。本日分が作成済みなら、重複エラーにならないよう既存の日報へ誘導する */
export async function NewReportButton({ userId, today }: { userId: number; today: string }) {
  let todayReportId: number | null = null
  try {
    todayReportId = await findReportIdByDate(userId, today)
  } catch (error) {
    // 誘導は補助機能。失敗しても作成画面へ進めるようにし、重複は作成 API 側のエラーで防ぐ
    console.error('本日の日報の確認に失敗しました', error)
  }

  return (
    <Button asChild>
      <Link href={todayReportId ? `/reports/${todayReportId}` : '/reports/new'}>
        {todayReportId ? '本日の日報を開く' : '新規日報作成'}
      </Link>
    </Button>
  )
}
