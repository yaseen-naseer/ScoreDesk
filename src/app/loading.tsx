export default function RootLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="space-y-2 w-full max-w-md">
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
        <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
      </div>
    </div>
  )
}


