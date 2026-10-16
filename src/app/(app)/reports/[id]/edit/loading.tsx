/** 日報編集の読み込み中表示（詳細画面用の loading.tsx とは形が違うため、別に用意する） */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy aria-label="読み込み中">
      <div className="bg-muted h-7 w-32 animate-pulse rounded-md" />
      <div className="bg-muted h-16 animate-pulse rounded-md" />
      <div className="bg-muted h-56 animate-pulse rounded-md" />
      <div className="bg-muted h-40 animate-pulse rounded-md" />
      <div className="bg-muted h-40 animate-pulse rounded-md" />
    </div>
  )
}
