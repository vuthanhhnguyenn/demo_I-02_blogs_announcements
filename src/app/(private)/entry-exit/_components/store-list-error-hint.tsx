import { Button } from '@/components/ui/button';

/**
 * Error line + manual retry for the paged store selects on the entry-exit screens. Shown via
 * `SearchableSelect`'s `hint` while the store list query is in error, since auto-paging is
 * paused then (a failed page would otherwise re-fire the scroll sentinel in a loop).
 */
export function StoreListErrorHint({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-destructive">店舗の取得に失敗しました</span>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto shrink-0 p-0 text-[11px]"
        onClick={onRetry}
      >
        再読み込み
      </Button>
    </div>
  );
}
