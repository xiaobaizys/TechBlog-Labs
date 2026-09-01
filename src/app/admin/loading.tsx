export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        {/* 加载动画 */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-[rgb(var(--muted))]" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-amber" />
        </div>

        {/* 加载文字 */}
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          加载中...
        </p>
      </div>
    </div>
  );
}
