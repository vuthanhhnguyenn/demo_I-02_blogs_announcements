'use client';

import { useState } from 'react';

import { parseDate } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

import {
  adminStoreControllerDetailQueryKey,
  adminStoreControllerUpdateMutation,
  adminStoreSettingsControllerGetMutualUseQueryKey,
  adminStoreSettingsControllerUpdateMutualUseMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { MutualUseSettingsDto } from '@/lib/api-real/types.gen';

/**
 * The Sheet's working copy. Dates are `YYYY-MM-DD` (what the API reads and writes), times `HH:mm`
 * (`<input type="time">`), and the YOGA fee stays the raw input text until it is validated on save.
 */
type MutualUseDraft = {
  isAcceptEnabled: boolean;
  payLaterEnabled: boolean;
  yogaUsageFee: string;
  acceptPeriodStart: string;
  acceptPeriodEnd: string;
  minorEntryAllowedStart: string;
  minorEntryAllowedEnd: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  /** D20 — FIT365 hides the どこでもJOY-only controls (post-pay, YOGA fee) */
  isFit365: boolean;
  /** The values read from `GET …/mutual-use`; the draft starts from them on every mount */
  settings: MutualUseSettingsDto;
  minorEntryAllowedStart: string | null;
  minorEntryAllowedEnd: string | null;
};

/**
 * `YYYY-MM-DD` → local `Date` for the DatePicker. The explicit `T00:00:00` keeps a date-only
 * string from being read as UTC midnight, which would shift the day.
 */
function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  return parseDate(`${value}T00:00:00`) ?? undefined;
}

/** `Date` → the `YYYY-MM-DD` the API stores, built from local parts so the day never shifts */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Upper bound of the YOGA fee (decided 2026-10: 999,999,999 yen) */
const YOGA_FEE_MAX = 999_999_999;

/** The API refuses a negative or fractional fee (`E-VAL-001`); blank is refused too */
function parseYogaFee(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

/**
 * 相互利用設定を編集する — FR-075, D21 (`store-detail.tsx` L2543-L2617).
 *
 * Mounted fresh for each opening (the parent keys it), so the draft is initialised from the read
 * values once and never needs an effect to resync.
 */
export function MutualUseSheet({
  open,
  onOpenChange,
  storeId,
  isFit365,
  settings,
  minorEntryAllowedStart,
  minorEntryAllowedEnd,
}: Readonly<Props>) {
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<MutualUseDraft>(() => ({
    isAcceptEnabled: settings.isAcceptEnabled,
    payLaterEnabled: settings.payLaterEnabled,
    yogaUsageFee: String(settings.yogaUsageFee),
    acceptPeriodStart: settings.acceptPeriodStart ?? '',
    acceptPeriodEnd: settings.acceptPeriodEnd ?? '',
    minorEntryAllowedStart: minorEntryAllowedStart ?? '',
    minorEntryAllowedEnd: minorEntryAllowedEnd ?? '',
  }));
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateMutualUseMutation = useMutation({
    ...adminStoreSettingsControllerUpdateMutualUseMutation(),
  });
  // B10 — the store PATCH is HQ-only on the backend. By the user's decision of 2026-09-22 the FE
  // adds no extra gating for it: a 403 surfaces through the shared mutation-error toast.
  const updateStoreMutation = useMutation({
    ...adminStoreControllerUpdateMutation(),
  });

  const patch = (next: Partial<MutualUseDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  // FR-075 — end ≥ start (spec rule, no V0 source). Both are `YYYY-MM-DD`, so a string
  // comparison orders them.
  const isPeriodReversed = Boolean(
    draft.acceptPeriodStart &&
    draft.acceptPeriodEnd &&
    draft.acceptPeriodEnd < draft.acceptPeriodStart,
  );
  const yogaFee = parseYogaFee(draft.yogaUsageFee);
  // FIT365 never edits the fee, so its echoed value is never the reason a save is refused
  const isYogaFeeTooLarge = !isFit365 && yogaFee !== null && yogaFee > YOGA_FEE_MAX;
  const isYogaFeeInvalid = !isFit365 && (yogaFee === null || isYogaFeeTooLarge);

  /**
   * Two writes from one Sheet (research R6): the acceptance settings, then the under-18 window on
   * the store row. They run in sequence and the first failure stops the run — the shared
   * `MutationCache` toast names it and the Sheet stays open so nothing typed is lost.
   */
  const handleSave = async () => {
    setSubmitted(true);
    if (isPeriodReversed || isYogaFeeInvalid) return;

    setIsSaving(true);
    try {
      await updateMutualUseMutation.mutateAsync({
        path: { id: storeId },
        body: {
          isAcceptEnabled: draft.isAcceptEnabled,
          acceptPeriodStart: draft.acceptPeriodStart || null,
          acceptPeriodEnd: draft.acceptPeriodEnd || null,
          // The PUT is a replace: an omitted field reverts to its default (true / 3000). So both
          // always travel — a FIT365 store, which never shows them, echoes the values it read.
          payLaterEnabled: isFit365 ? settings.payLaterEnabled : draft.payLaterEnabled,
          yogaUsageFee: isFit365 || yogaFee === null ? settings.yogaUsageFee : yogaFee,
        },
      });

      // Sent only when it actually changed. The store PATCH is a different endpoint with a
      // different permission (B10), so firing it on every save would make an untouched under-18
      // window refuse a save that had nothing to do with it.
      if (
        draft.minorEntryAllowedStart !== (minorEntryAllowedStart ?? '') ||
        draft.minorEntryAllowedEnd !== (minorEntryAllowedEnd ?? '')
      ) {
        await updateStoreMutation.mutateAsync({
          path: { id: storeId },
          body: {
            minorEntryAllowedStart: draft.minorEntryAllowedStart || null,
            minorEntryAllowedEnd: draft.minorEntryAllowedEnd || null,
          },
        });
      }

      toast.success('相互利用設定を保存しました');
      onOpenChange(false);
    } catch {
      // Already surfaced by the shared mutation-error toast
    } finally {
      setIsSaving(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminStoreSettingsControllerGetMutualUseQueryKey({ path: { id: storeId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: adminStoreControllerDetailQueryKey({ path: { id: storeId } }),
        }),
      ]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <SheetContent side="right" className="flex flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="size-4" />
              相互利用設定を編集する
            </SheetTitle>
            <SheetDescription className="sr-only">
              他店舗利用の受入可否と運用パラメータを設定します
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="mutual-accept" className="text-sm">
                  {isFit365 ? '相互利用オプション（¥500）の受入' : 'どこでもJOYの受入'}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {isFit365
                    ? '他のFIT365店舗の相互利用オプション契約者を受け入れる'
                    : '他のJOYFIT店舗のどこでもJOY利用会員を受け入れる'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                <span className="text-muted-foreground text-sm">受入不可</span>
                <Switch
                  id="mutual-accept"
                  checked={draft.isAcceptEnabled}
                  onCheckedChange={(checked) => patch({ isAcceptEnabled: Boolean(checked) })}
                />
                <span className="text-sm font-medium">受入可</span>
              </div>
            </div>

            {!isFit365 && (
              <>
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label htmlFor="mutual-deferred" className="text-sm">
                      1日単位の後払い設定
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      他店舗利用分を1日単位の後払いで請求する
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                    <span className="text-muted-foreground text-sm">無効</span>
                    <Switch
                      id="mutual-deferred"
                      checked={draft.payLaterEnabled}
                      onCheckedChange={(checked) => patch({ payLaterEnabled: Boolean(checked) })}
                    />
                    <span className="text-sm font-medium">有効</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t pt-4">
                  <Label htmlFor="mutual-yoga-fee" className="text-sm">
                    YOGA利用料金（1日・税別）
                  </Label>
                  <div className="relative w-40">
                    <Input
                      id="mutual-yoga-fee"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="h-9 pr-8 text-xs tabular-nums"
                      aria-invalid={(submitted && isYogaFeeInvalid) || undefined}
                      value={draft.yogaUsageFee}
                      onChange={(event) => patch({ yogaUsageFee: event.target.value })}
                    />
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                      円
                    </span>
                  </div>
                  {submitted && isYogaFeeInvalid ? (
                    <p className="text-destructive text-xs">
                      {isYogaFeeTooLarge
                        ? '999,999,999円以下で入力してください'
                        : '0以上の整数を入力してください'}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">利用店舗に計上されます</p>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm">受入可能期間（開始日）</Label>
                <DatePicker
                  date={parseIsoDate(draft.acceptPeriodStart)}
                  onDateChange={(date) => patch({ acceptPeriodStart: date ? toIsoDate(date) : '' })}
                  placeholder="日付を選択"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm">受入可能期間（終了日）</Label>
                <DatePicker
                  date={parseIsoDate(draft.acceptPeriodEnd)}
                  onDateChange={(date) => patch({ acceptPeriodEnd: date ? toIsoDate(date) : '' })}
                  placeholder="日付を選択"
                  hasError={submitted && isPeriodReversed}
                />
              </div>
              {submitted && isPeriodReversed && (
                <p className="text-destructive col-span-2 text-xs">
                  終了日は開始日以降の日付を選択してください
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <Label className="text-sm">18歳未満入館可能時間</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  className="h-8 w-28 text-xs"
                  value={draft.minorEntryAllowedStart}
                  onChange={(event) => patch({ minorEntryAllowedStart: event.target.value })}
                  aria-label="18歳未満入館可能時間（開始）"
                />
                <span className="text-muted-foreground text-xs">〜</span>
                <Input
                  type="time"
                  className="h-8 w-28 text-xs"
                  value={draft.minorEntryAllowedEnd}
                  onChange={(event) => patch({ minorEntryAllowedEnd: event.target.value })}
                  aria-label="18歳未満入館可能時間（終了）"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button size="sm" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? '保存中…' : '保存する'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
