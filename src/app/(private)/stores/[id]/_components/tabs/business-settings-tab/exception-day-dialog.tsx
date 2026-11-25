'use client';

import { useState } from 'react';

import { formatISODateLocal } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { OptionalMark, RequiredMark } from '@/components/common/field-marker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  adminStoreControllerCreateExceptionMutation,
  adminStoreControllerDeleteExceptionMutation,
  adminStoreControllerListExceptionsQueryKey,
  adminStoreControllerUpdateExceptionMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';

import {
  STORE_ERROR_CODE,
  getStoreErrorCode,
  isStoreNotFoundError,
} from '../../../../_utils/store-api.util';
import {
  type BusinessException,
  EXCEPTION_KIND_LABELS,
  type ExceptionKind,
  conflictingExceptionKind,
  exceptionConflictMessage,
  fromDateText,
  reasonError,
  toDisplayDate,
} from './business-hours-shared';

/** The prototype's defaults for a new 特別営業日 (FR-029b, `store-detail.tsx` L548-L549) */
const DEFAULT_OPEN = '10:00';
const DEFAULT_CLOSE = '17:00';

const DIALOG_COPY: Record<ExceptionKind, { description: string }> = {
  short_hours: {
    description: '祝日や年末年始など、通常と異なる営業時間で営業する日を設定します。',
  },
  closed: {
    description:
      '工事・清掃等で休業する日を設定します。営業カレンダーに臨時休業として反映されます。',
  },
};

/** Both kinds live in one paginated list; the key without `query` invalidates every page */
function useInvalidateExceptions(storeId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: adminStoreControllerListExceptionsQueryKey({ path: { id: storeId } }),
    });
}

type FormState = { date: string; openTime: string; closeTime: string; reason: string };

const formStateOf = (target: BusinessException | null): FormState => ({
  date: target?.date ?? '',
  openTime: target?.openTime ?? DEFAULT_OPEN,
  closeTime: target?.closeTime ?? DEFAULT_CLOSE,
  reason: target?.reason ?? '',
});

export type ExceptionDialogState = { kind: ExceptionKind; target: BusinessException | null };

type DialogProps = {
  storeId: string;
  /** `null` = closed */
  state: ExceptionDialogState | null;
  /** Both kinds of the one `/business-exceptions` list — the one-per-date rule spans them */
  exceptions: BusinessException[];
  onClose: () => void;
};

/**
 * Add / edit dialog shared by 特別営業日 (`short_hours`) and 臨時休業日 (`closed`) — FR-029b,
 * FR-029c, prototype `store-detail.tsx` L1572-L1615. The date is editable on edit too: the
 * `PATCH` moves the row (contract v0.6).
 */
export function ExceptionDayDialog({ storeId, state, exceptions, onClose }: DialogProps) {
  const invalidate = useInvalidateExceptions(storeId);
  const run = useInFlightGuard();
  const [form, setForm] = useState<FormState>(() => formStateOf(null));
  const [seededFrom, setSeededFrom] = useState<ExceptionDialogState | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  // A 409 for a date the list on screen did not show as taken (another operator got there first)
  const [serverTakenDate, setServerTakenDate] = useState<string | null>(null);
  // Set on save: the refetch that follows a success lists the saved row itself, which the
  // on-screen duplicate check would otherwise flag until the dialog has closed
  const [submitted, setSubmitted] = useState(false);

  // Re-seed whenever the dialog opens for another target
  if (state && seededFrom !== state) {
    setSeededFrom(state);
    setForm(formStateOf(state.target));
    setShowErrors(false);
    setServerTakenDate(null);
    setSubmitted(false);
  }

  // The last state stays on screen while the dialog animates out
  const current = state ?? seededFrom;
  const kind = current?.kind ?? 'short_hours';
  const kindLabel = EXCEPTION_KIND_LABELS[kind];
  const isEdit = Boolean(current?.target);

  const onMutationError = (error: unknown) => {
    // Every other failure is toasted by the shared MutationCache `onError`
    if (getStoreErrorCode(error) === STORE_ERROR_CODE.duplicateExceptionDate) {
      setServerTakenDate(form.date);
      void invalidate();
    }
  };

  const createMutation = useMutation({
    ...adminStoreControllerCreateExceptionMutation(),
    onSuccess: async () => {
      await invalidate();
    },
    onError: onMutationError,
  });
  const updateMutation = useMutation({
    ...adminStoreControllerUpdateExceptionMutation(),
    onSuccess: async () => {
      await invalidate();
    },
    onError: onMutationError,
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const conflictKind =
    form.date && !submitted
      ? conflictingExceptionKind(form.date, exceptions, state?.target?.id ?? null)
      : null;
  const conflictMessage = conflictKind
    ? exceptionConflictMessage(EXCEPTION_KIND_LABELS[conflictKind])
    : serverTakenDate && serverTakenDate === form.date
      ? exceptionConflictMessage('特別営業日または臨時休業日')
      : null;

  // Spec rules without a V0 source (FR-029b): both times, and the close after the open
  const timeError =
    kind !== 'short_hours'
      ? null
      : !form.openTime || !form.closeTime
        ? '開店時刻と閉店時刻を入力してください'
        : form.closeTime <= form.openTime
          ? '閉店時刻は開店時刻より後の時刻を入力してください'
          : null;
  const reasonMessage = kind === 'closed' ? reasonError(form.reason) : null;

  const submit = () => {
    if (!state || !form.date || conflictMessage) return;
    if (timeError || reasonMessage) {
      setShowErrors(true);
      return;
    }
    const displayDate = toDisplayDate(form.date);
    const onSuccess = () => {
      if (kind === 'short_hours') {
        toast.success(isEdit ? '特別営業日を更新しました' : '特別営業日を追加しました', {
          description: `${displayDate} ${form.openTime} 〜 ${form.closeTime}`,
        });
      } else {
        toast.success(isEdit ? '臨時休業日を更新しました' : '臨時休業日を追加しました', {
          description: displayDate,
        });
      }
      onClose();
    };
    // research R4 — 特別営業日 carries hours and no reason; 臨時休業日 a reason and no hours
    const body =
      kind === 'short_hours'
        ? { date: form.date, openTime: form.openTime, closeTime: form.closeTime }
        : { date: form.date, reason: form.reason.trim() || null };

    // Failures are toasted by the shared MutationCache; the catch re-arms the duplicate check
    const target = state.target;
    setSubmitted(true);
    void run(async () => {
      if (target) {
        await updateMutation.mutateAsync({
          path: { id: storeId, exceptionId: target.id },
          body,
        });
      } else {
        await createMutation.mutateAsync({
          path: { id: storeId },
          body: { ...body, exceptionType: kind },
        });
      }
      onSuccess();
    }).catch(() => setSubmitted(false));
  };

  return (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? `${kindLabel}を編集` : `${kindLabel}を追加`}</DialogTitle>
          <DialogDescription>{DIALOG_COPY[kind].description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm">
              日付
              <RequiredMark />
            </Label>
            <DatePicker
              date={form.date ? fromDateText(form.date) : undefined}
              onDateChange={(date) =>
                setForm((prev) => ({ ...prev, date: date ? formatISODateLocal(date) : '' }))
              }
              placeholder="日付を選択"
              hasError={Boolean(conflictMessage)}
              className="w-[240px]"
            />
            {conflictMessage && <p className="text-destructive text-[11px]">{conflictMessage}</p>}
          </div>
          {kind === 'closed' ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="exception-reason" className="text-sm">
                理由
                <OptionalMark />
              </Label>
              <Input
                id="exception-reason"
                placeholder="例: 設備点検"
                value={form.reason}
                aria-invalid={showErrors && Boolean(reasonMessage)}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
              {showErrors && reasonMessage && (
                <p className="text-destructive text-[11px]">{reasonMessage}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label className="text-sm">
                営業時間
                <RequiredMark />
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  className="h-8 w-28 text-xs"
                  value={form.openTime}
                  aria-invalid={showErrors && Boolean(timeError)}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, openTime: event.target.value }))
                  }
                  aria-label="開店時刻"
                />
                <span className="text-muted-foreground text-xs">〜</span>
                <Input
                  type="time"
                  className="h-8 w-28 text-xs"
                  value={form.closeTime}
                  aria-invalid={showErrors && Boolean(timeError)}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, closeTime: event.target.value }))
                  }
                  aria-label="閉店時刻"
                />
              </div>
              {showErrors && timeError && (
                <p className="text-destructive text-[11px]">{timeError}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={!form.date || Boolean(conflictMessage) || isPending}>
            {isEdit ? '変更を保存' : '追加する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeleteProps = {
  storeId: string;
  /** `null` = closed */
  target: BusinessException | null;
  onClose: () => void;
};

/** Delete confirmation for either kind — FR-029e, prototype `store-detail.tsx` L1618-L1633 */
export function ExceptionDayDeleteDialog({ storeId, target, onClose }: DeleteProps) {
  const invalidate = useInvalidateExceptions(storeId);
  const run = useInFlightGuard();
  const deleteMutation = useMutation({
    ...adminStoreControllerDeleteExceptionMutation(),
    onSuccess: async () => {
      await invalidate();
    },
  });

  // Keep the last target while the dialog animates out, so the copy does not blank mid-close
  const [shown, setShown] = useState<BusinessException | null>(target);
  if (target && target !== shown) setShown(target);

  const kindLabel = EXCEPTION_KIND_LABELS[shown?.exceptionType ?? 'short_hours'];
  const displayDate = shown ? toDisplayDate(shown.date) : '';

  const confirm = () => {
    if (!target) return;
    // Failures are toasted by the shared MutationCache; the catch only avoids an unhandled rejection
    void run(async () => {
      try {
        await deleteMutation.mutateAsync({ path: { id: storeId, exceptionId: target.id } });
        toast.success(`${kindLabel}を削除しました`, { description: displayDate });
        onClose();
      } catch (error) {
        // Already deleted elsewhere: the row is gone, so close and refresh the stale list
        if (isStoreNotFoundError(error)) {
          onClose();
          await invalidate();
        }
      }
    });
  };

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{kindLabel}を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            {displayDate} の設定を削除します。この日は祝日・曜日の設定に従います。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={confirm}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
