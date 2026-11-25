'use client';

import { Button } from '@/components/ui/button';

interface UnsavedChangesBarProps {
  /** Left-hand copy; screens append what is pending, e.g. 「未保存の変更があります（位置 2台）」 */
  message?: string;
  onDiscard: () => void;
  onSave: () => void;
  /** Locks both buttons while the save is in flight, so a second click cannot double-write */
  isSaving?: boolean;
}

/**
 * The save bar a screen shows only while it holds unsaved changes. Ported from the prototype's
 * `components/unsaved-changes-bar.tsx` L60-L80.
 *
 * The caller decides visibility by rendering it or not, and places it after its scrolling body
 * (not inside it), so the bar never covers the content's last row. `sticky bottom-0` keeps it
 * pinned when a screen does put it at the end of a scroll container.
 */
export function UnsavedChangesBar({
  message = '未保存の変更があります',
  onDiscard,
  onSave,
  isSaving = false,
}: Readonly<UnsavedChangesBarProps>) {
  return (
    <div className="bg-background sticky bottom-0 z-30 flex shrink-0 items-center justify-between gap-4 border-t px-6 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="bg-warning size-2 shrink-0 rounded-full" aria-hidden="true" />
        <span className="text-sm">{message}</span>
      </div>
      {/* 破棄 sits beside 保存 — the prototype keeps both actions together at the right edge */}
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" disabled={isSaving} onClick={onDiscard}>
          破棄
        </Button>
        <Button disabled={isSaving} onClick={onSave}>
          {isSaving ? '保存中...' : '変更を保存'}
        </Button>
      </div>
    </div>
  );
}
