/** 日報詳細の読み込み中表示 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy aria-label="読み込み中">
      <div className="bg-muted h-7 w-32 animate-pulse rounded-md" />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="bg-muted h-28 animate-pulse rounded-md" />
      ))}
    </div>
  )
}
