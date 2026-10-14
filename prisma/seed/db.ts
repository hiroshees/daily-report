import { Prisma } from '@prisma/client'

/** $executeRawUnsafe だけを使うので、PrismaClient とトランザクション内クライアントの両方を渡せる */
type RawClient = { $executeRawUnsafe: (query: string) => Promise<number> }

type ModelTable = {
  table: string
  /** 自動採番（autoincrement）の主キー列。無い場合は null */
  serialColumn: string | null
}

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`

/**
 * Prisma スキーマ（dmmf）から、全モデルのテーブル名と採番列を取り出す。
 * テーブルを手書きしないので、モデルの追加・@@map の変更に追従できる。
 */
export function getModelTables(): ModelTable[] {
  return Prisma.dmmf.datamodel.models.map((model) => {
    const serial = model.fields.find(
      (field) =>
        field.isId &&
        typeof field.default === 'object' &&
        !Array.isArray(field.default) &&
        'name' in field.default &&
        field.default.name === 'autoincrement',
    )
    return {
      table: model.dbName ?? model.name,
      serialColumn: serial?.dbName ?? serial?.name ?? null,
    }
  })
}

/** 全モデルのテーブルを空にし、採番もリセットする */
export async function truncateAllTables(client: RawClient): Promise<void> {
  const tables = getModelTables()
    .map(({ table }) => quote(table))
    .join(', ')
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
}

/**
 * ID を明示して投入したテーブルのシーケンスを、既存の最大 ID に合わせる。
 * 空のテーブルは未使用の状態（次の採番が 1）にする。
 */
export async function syncSequences(client: RawClient): Promise<void> {
  for (const { table, serialColumn } of getModelTables()) {
    if (!serialColumn) continue

    const column = quote(serialColumn)
    await client.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${quote(table)}', '${serialColumn}'), ` +
        `COALESCE(MAX(${column}), 1), MAX(${column}) IS NOT NULL) FROM ${quote(table)}`,
    )
  }
}
