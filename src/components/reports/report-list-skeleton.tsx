/** 一覧の取得中表示（shadcn の Skeleton は未導入のため animate-pulse で代用） */
export function ReportListSkeleton() {
  return (
    <div role="status" aria-label="読み込み中" className="space-y-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="bg-muted h-10 animate-pulse rounded-md" />
      ))}
    </div>
  )
}
