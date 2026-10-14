import { PrismaClient } from '@prisma/client'

// 開発時のホットリロードで PrismaClient（= DB 接続）が増え続けないよう、globalThis に保持する
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : process.env.NODE_ENV === 'test'
          ? []
          : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
