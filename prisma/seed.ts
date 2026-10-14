import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateSeedData, SEED_PASSWORD } from './seed/data'
import { assertSeedAllowed } from './seed/guard'

const prisma = new PrismaClient()

/** createMany を一定件数ずつに分けて実行する（パラメータ数の上限を避ける） */
async function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size))
  }
}

async function main() {
  assertSeedAllowed(process.env)

  const data = generateSeedData({ passwordHash: await bcrypt.hash(SEED_PASSWORD, 10) })

  await prisma.$transaction(
    async (tx) => {
      // 再実行しても重複しないよう、全データを削除して採番もリセットしてから投入する
      await tx.$executeRawUnsafe(
        'TRUNCATE TABLE "manager_comment", "visit_record", "daily_report", "customer", "sales_person" RESTART IDENTITY CASCADE',
      )

      await tx.salesPerson.createMany({ data: data.salesPersons })
      await tx.customer.createMany({ data: data.customers })
      await insertInChunks(data.reports, (chunk) => tx.dailyReport.createMany({ data: chunk }))
      await insertInChunks(data.visits, (chunk) => tx.visitRecord.createMany({ data: chunk }))
      await insertInChunks(data.comments, (chunk) => tx.managerComment.createMany({ data: chunk }))

      // ID を明示して投入したため、以降の自動採番が衝突しないようシーケンスを進める
      for (const [table, column] of [
        ['sales_person', 'sales_person_id'],
        ['customer', 'customer_id'],
        ['daily_report', 'report_id'],
        ['visit_record', 'visit_id'],
        ['manager_comment', 'comment_id'],
      ]) {
        await tx.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE(MAX("${column}"), 1)) FROM "${table}"`,
        )
      }
    },
    { timeout: 60_000 },
  )

  console.log(
    `シード完了: 営業担当者 ${data.salesPersons.length} / 顧客 ${data.customers.length} / ` +
      `日報 ${data.reports.length} / 訪問記録 ${data.visits.length} / コメント ${data.comments.length}`,
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
