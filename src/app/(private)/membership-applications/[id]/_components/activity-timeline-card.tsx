'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { useCallback, useMemo, useRef, useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminApplicationControllerAddMemoMutation,
  adminApplicationControllerDeleteMemoMutation,
  adminApplicationControllerDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ApplicationTimelineItemDto } from '@/lib/api-real/types.gen';

import { BOUNDED_TEXTAREA_CLASS } from '../../_constants/constants';
import { memoSchema, textError } from '../../_schemas/application-text.schema';
import { toTimelineRows } from './membership-application.utils';

interface ActivityTimelineCardProps {
  timeline: ApplicationTimelineItemDto[];
  applicationId: string;
  rejectReasonLabel?: string;
}

export function ActivityTimelineCard({
  timeline,
  applicationId,
  rejectReasonLabel,
}: Readonly<ActivityTimelineCardProps>) {
  const rows = useMemo(
    () => toTimelineRows(timeline, rejectReasonLabel),
    [timeline, rejectReasonLabel],
  );
  const queryClient = useQueryClient();
  const [memoText, setMemoText] = useState('');
  const [deletingMemoId, setDeletingMemoId] = useState<string | null>(null);

  function invalidateApplication() {
    void queryClient.invalidateQueries({
      queryKey: adminApplicationControllerDetailQueryKey({ path: { applicationId } }),
    });
  }

  // A double-click lands before isPending disables 追加 — the ref blocks the second POST (BUG-B-03).
  const isAddingRef = useRef(false);

  // Failures surface through the shared MutationCache error toast — no local onError.
  const addMemoMutation = useMutation({
    ...adminApplicationControllerAddMemoMutation(),
    onSuccess: () => {
      setMemoText('');
      invalidateApplication();
      toast.success('メモを追加しました');
    },
    onSettled: () => {
      isAddingRef.current = false;
    },
  });

  const deleteMemoMutation = useMutation({
    ...adminApplicationControllerDeleteMemoMutation(),
    onSuccess: () => {
      invalidateApplication();
      toast.success('メモを削除しました');
    },
    // Already deleted elsewhere (404): refetch so the stale entry disappears (BUG-B-05).
    onError: (error) => {
      if (getApiErrorStatus(error) === 404) invalidateApplication();
    },
    onSettled: () => setDeletingMemoId(null),
  });

  const memoError = textError(memoSchema, memoText.trim());

  const handleAddMemo = useCallback(() => {
    const trimmed = memoText.trim();
    if (!trimmed || memoError || isAddingRef.current) return;
    isAddingRef.current = true;
    addMemoMutation.mutate({ path: { applicationId }, body: { memo: trimmed } });
  }, [memoText, memoError, applicationId, addMemoMutation]);

  const handleDeleteMemo = useCallback(
    (memoId: string) => {
      setDeletingMemoId(memoId);
      deleteMemoMutation.mutate({ path: { applicationId, memoId } });
    },
    [applicationId, deleteMemoMutation],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">対応履歴・メモ</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-0">
          {rows.map((entry, i) => {
            const isSystem = entry.kind === 'system';
            return (
              <div key={entry.id} className="group flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-2 size-2.5 shrink-0 rounded-full ${isSystem ? 'bg-muted-foreground' : 'bg-primary'}`}
                  />
                  {i < rows.length - 1 && <div className="bg-border mt-1 w-px flex-1" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {formatDateYYYYMMDD_HHMM(entry.occurredAt, '—')}
                    </span>
                    <span className="min-w-0 text-xs font-medium wrap-anywhere">
                      {entry.operator}
                    </span>
                    {!isSystem && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        メモ
                      </Badge>
                    )}
                    {/* `canDelete` is evaluated per caller: own memo, or the delete-others permission. */}
                    {!isSystem && entry.canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive ml-auto h-6 shrink-0 px-2 text-xs opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => handleDeleteMemo(entry.id)}
                        disabled={deletingMemoId === entry.id || deleteMemoMutation.isPending}
                      >
                        <Trash2 className="size-3" />
                        削除
                      </Button>
                    )}
                  </div>
                  <p className="text-sm wrap-anywhere">{entry.content}</p>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <div className="bg-muted/30 flex flex-col gap-2 rounded-lg p-4">
          <Label className="text-muted-foreground text-xs font-medium">メモを追加</Label>
          <p className="text-muted-foreground text-[11px]">
            システム記録・操作ログは削除できません。追加したメモのみ後から削除できます。
          </p>
          <Textarea
            placeholder="メモを入力してください..."
            rows={3}
            className={BOUNDED_TEXTAREA_CLASS}
            aria-invalid={!!memoError}
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            disabled={addMemoMutation.isPending}
          />
          {memoError && <p className="text-destructive text-xs">{memoError}</p>}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleAddMemo}
              disabled={!memoText.trim() || !!memoError || addMemoMutation.isPending}
            >
              {addMemoMutation.isPending ? '追加中...' : '追加'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
