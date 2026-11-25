'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminStoreControllerChangeHistoryQueryKey,
  adminStoreControllerDetailQueryKey,
  adminStoreControllerListQueryKey,
  adminStoreControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreDetailDto } from '@/lib/api-real/types.gen';

import {
  STORE_STATUS_BADGE_CLASSES,
  STORE_STATUS_DOT_CLASSES,
  STORE_STATUS_LABELS,
  STORE_STATUS_VALUES,
  type StoreStatus,
} from '../../_constants/constants';
import { STORE_ERROR_CODE, getStoreErrorCode } from '../../_utils/store-api.util';

/**
 * The moves the operator may make by hand (「開発回答（2026/08/24 §4-1）」, detail FR-015c):
 * 準備中 → 営業中 (opening) and 営業中 ⇄ 休業中 (suspending / resuming). 閉店 is never chosen here —
 * the daily batch sets it once `closedAt` has passed (Y-02 FR-007).
 */
const STORE_STATUS_TRANSITIONS: Record<StoreStatus, readonly StoreStatus[]> = {
  preparing: ['operating'],
  operating: ['temporarily_closed'],
  temporarily_closed: ['operating'],
  closed: [],
};

/** Why `target` cannot be chosen from `current` (null = allowed), in the prototype's order */
function statusBlockReason(current: StoreStatus, target: StoreStatus): string | null {
  if (target === current) return '現在のステータスです';
  if (current === 'closed') return '閉店した店舗のステータスは変更できません';
  if (target === 'preparing') return '開業準備中には戻せません';
  if (target === 'closed') return '閉店日を設定すると自動的に閉店になります';
  return STORE_STATUS_TRANSITIONS[current].includes(target) ? null : 'この遷移はできません';
}

/** 422 E-STR-006 — the backend refused a move the matrix above allowed (the store changed elsewhere) */
const TRANSITION_REFUSED_MESSAGE =
  'このステータスには変更できません。画面を更新して最新の状態をご確認ください。';

function StoreStatusBadge({ status }: { status: StoreStatus }) {
  return (
    <Badge
      variant="outline"
      className={`${STORE_STATUS_BADGE_CLASSES[status]} gap-1 text-xs font-medium`}
    >
      <span className={`size-1.5 rounded-full ${STORE_STATUS_DOT_CLASSES[status]}`} />
      {STORE_STATUS_LABELS[status]}
    </Badge>
  );
}

interface StoreStatusChangeDialogProps {
  store: Pick<StoreDetailDto, 'id' | 'name' | 'status'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ステータス変更 dialog of the store detail screen (detail FR-015b–FR-015d) — a separate action
 * from the edit form, System / Headquarter only. All four values are listed and the unreachable
 * ones stay visible but disabled with their reason, as the prototype does.
 */
export function StoreStatusChangeDialog({
  store,
  open,
  onOpenChange,
}: StoreStatusChangeDialogProps) {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<StoreStatus | ''>('');
  const currentStatus = store.status;
  // `disabled={isPending}` lands a render late: two clicks in one tick sent two PATCHes (BUG-U3-10)
  const runGuarded = useInFlightGuard();

  const statusMutation = useMutation({
    ...adminStoreControllerUpdateMutation(),
    // Every failure is shown inside the dialog instead (the operator is still looking at it), so
    // the shared MutationCache toast would only repeat it.
    meta: { suppressErrorToast: true },
    onSuccess: (_data, variables) => {
      const label = STORE_STATUS_LABELS[variables.body?.status ?? currentStatus];
      // Detail drives the header badge and StatusCard; the list shows the status column; the
      // history tab gains a `status_change` entry. Prefix keys, so every page / filter matches.
      void queryClient.invalidateQueries({
        queryKey: adminStoreControllerDetailQueryKey({ path: { id: store.id } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminStoreControllerListQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: adminStoreControllerChangeHistoryQueryKey({ path: { id: store.id } }),
      });
      toast.success(`${store.name}のステータスを「${label}」に変更しました`);
      handleOpenChange(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setNewStatus('');
      statusMutation.reset();
    }
    onOpenChange(nextOpen);
  }

  const errorMessage = statusMutation.error
    ? getStoreErrorCode(statusMutation.error) === STORE_ERROR_CODE.transitionRefused
      ? TRANSITION_REFUSED_MESSAGE
      : resolveApiErrorMessage(statusMutation.error)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ステータス変更</DialogTitle>
          <DialogDescription>店舗のステータスを変更します。</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* 対象店舗情報 (read-only) */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* `min-w-0` + break-anywhere: an unbroken 255-char name wraps inside its cell (capped
                  with its own scroll) instead of being clipped (BUG-U3-08) */}
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-xs">店舗名</p>
                <p className="max-h-32 overflow-y-auto text-sm font-medium [overflow-wrap:anywhere]">
                  {store.name}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-xs">現在のステータス</p>
                <StoreStatusBadge status={currentStatus} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>新しいステータス</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => {
                setNewStatus((value as StoreStatus | null) ?? '');
                statusMutation.reset();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="ステータスを選択">
                  {newStatus ? <StoreStatusBadge status={newStatus} /> : 'ステータスを選択'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STORE_STATUS_VALUES.map((status) => {
                  const reason = statusBlockReason(currentStatus, status);
                  return (
                    <SelectItem key={status} value={status} disabled={reason !== null}>
                      <span className="flex items-center gap-2">
                        <StoreStatusBadge status={status} />
                        {reason && <span className="text-muted-foreground text-xs">{reason}</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {errorMessage && (
            <p className="text-destructive text-xs" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={statusMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            disabled={!newStatus || statusMutation.isPending}
            onClick={() => {
              if (!newStatus) return;
              // A failure is rendered in the dialog from `statusMutation.error`; the rejection is
              // only swallowed here so it does not surface as an unhandled one.
              void runGuarded(() =>
                statusMutation.mutateAsync({ path: { id: store.id }, body: { status: newStatus } }),
              ).catch(() => undefined);
            }}
          >
            変更する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
