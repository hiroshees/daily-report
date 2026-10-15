import { prisma } from '@/lib/prisma'
import type { CommentCreateRequest } from '@/schemas/comment'
import { ApiError } from '@/server/errors'

const toIso = (date: Date) => date.toISOString().replace('.000Z', 'Z')

async function assertReportExists(reportId: number) {
  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true },
  })
  if (!report) throw new ApiError('NOT_FOUND')
}

/** コメント一覧（作成日時の昇順）。日報が無ければ 404 */
export async function listComments(reportId: number) {
  await assertReportExists(reportId)

  const comments = await prisma.managerComment.findMany({
    where: { reportId },
    include: { manager: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return {
    data: comments.map((comment) => ({
      id: comment.id,
      manager: comment.manager,
      comment: comment.comment,
      created_at: toIso(comment.createdAt),
    })),
  }
}

/** コメント追加。managerId は認証済みユーザーから渡す（リクエストからは受け取らない） */
export async function createComment(
  reportId: number,
  managerId: number,
  input: CommentCreateRequest,
) {
  await assertReportExists(reportId)

  // TODO(#27): 自分自身の日報へのコメントを許可するか未決定のため、現状は許可している
  const created = await prisma.managerComment.create({
    data: { reportId, managerId, comment: input.comment },
  })
  return {
    id: created.id,
    report_id: created.reportId,
    manager_id: created.managerId,
    comment: created.comment,
    created_at: toIso(created.createdAt),
  }
}
