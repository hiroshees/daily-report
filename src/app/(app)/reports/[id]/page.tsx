import { notFound } from 'next/navigation'
import { ReportDetailView } from '@/components/reports/report-detail'
import { parseBackHref } from '@/lib/report-back'
import { IdParamSchema } from '@/schemas/common'
import { ApiError } from '@/server/errors'
import { requirePageUser } from '@/server/page-auth'
import { getReport } from '@/server/services/report'

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  // レイアウトの確認に頼らず、ページでも確認する
  const user = await requirePageUser()

  const parsedId = IdParamSchema.safeParse(await params)
  if (!parsedId.success) notFound()

  let report: Awaited<ReturnType<typeof getReport>>
  try {
    report = await getReport(parsedId.data.id)
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound()
    throw error
  }

  // 閲覧は全員分が可能（doc/SCREEN_DESIGN.md 4章）。編集・コメントの可否は表示側とサーバー側で別に判定する
  return (
    <ReportDetailView
      report={report}
      user={user}
      backHref={parseBackHref((await searchParams).back)}
    />
  )
}
