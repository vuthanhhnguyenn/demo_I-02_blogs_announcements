'use client';

import { useMemo, useState } from 'react';

import { formatISODateLocal } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { maxLengthMessage } from '@/utils/validation.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { OptionalMark, RequiredMark } from '@/components/common/field-marker';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  adminStoreSettingsControllerDeleteOneDayPassExceptionMutation,
  adminStoreSettingsControllerGetOneDayPassPriceQueryKey,
  adminStoreSettingsControllerSetOneDayPassExceptionMutation,
  adminStoreSettingsControllerSetOneDayPassPriceMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { OneDayPassExceptionDto, SetOneDayPassExceptionDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  ONE_DAY_PASS_EDIT_ROLES,
  ONE_DAY_PASS_NOTE_MAX_LENGTH,
} from '../../../../../_constants/constants';
import { ONE_DAY_PASS_MAX_PRICE, ONE_DAY_PASS_MIN_PRICE } from '../contract-tab.data';
import type { OneDayPassBasePrice } from './one-day-pass-base-price';
import { OneDayPassClearConfirmDialog } from './one-day-pass-clear-confirm-dialog';

/** A blank note is sent as `null` (no memo) */
function toNoteBody(note: string): SetOneDayPassExceptionDto['note'] {
  const trimmed = note.trim();
  return trimmed === '' ? null : trimmed;
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** Leading blanks + every day of the displayed month */
function buildMonthCells(monthDate: Date): (string | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(formatISODateLocal(new Date(year, month, day)));
  }
  return cells;
}

/** The one message for a price that fails `validatePrice`, or `null` */
function priceErrorMessage(check: ReturnType<typeof validatePrice>): string | null {
  if (check.malformed) return '価格は整数で入力してください（マイナス・小数は使用できません）';
  if (check.outOfRange) {
    return `${formatYen(ONE_DAY_PASS_MIN_PRICE)}〜${formatYen(ONE_DAY_PASS_MAX_PRICE)}の範囲で入力してください`;
  }
  return null;
}

/** Only a plain integer inside the ¥700–¥1,800 band is accepted — 422 `E-STR-009` otherwise */
function validatePrice(raw: string) {
  const trimmed = raw.trim();
  // A minus sign or decimals must be rejected, never silently normalised — stripping them
  // would register a price the operator never typed.
  const malformed = trimmed !== '' && !/^\d+$/.test(trimmed);
  const value = Number(trimmed);
  const outOfRange =
    trimmed !== '' &&
    !malformed &&
    (value < ONE_DAY_PASS_MIN_PRICE || value > ONE_DAY_PASS_MAX_PRICE);
  return { trimmed, value, malformed, outOfRange, invalid: malformed || outOfRange };
}

/** `'2027-03-05'` → `'2027/03/05'` — a plain reformat, so no UTC-midnight day shift */
function toSlashDate(date: string): string {
  return date.replaceAll('-', '/');
}

type Props = {
  storeId: string;
  /**
   * The effective 基準価格 — the store default, else the 1Day利用 plan master's price (FR-050a);
   * `price` is `null` only when neither exists.
   */
  basePrice: OneDayPassBasePrice;
  exceptions: OneDayPassExceptionDto[];
};

/**
 * The Y-02 FR-003 price-setting panel. Several dates are picked on the calendar and the same
 * price and note are applied in one action, overwriting whatever those dates carried.
 *
 * The real API keys each override by `{date}`, so a multi-date apply is a short series of writes
 * rather than one bulk call; the ¥700–¥1,800 band is a Phase 1 constant on the FE and is now
 * enforced server-side as well (`E-STR-009`).
 */
export function OneDayPassPriceDrawer({ storeId, basePrice, exceptions }: Props) {
  const queryClient = useQueryClient();
  const runGuarded = useInFlightGuard();
  const [open, setOpen] = useState(false);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [basePriceDraft, setBasePriceDraft] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const byDate = useMemo(() => new Map(exceptions.map((row) => [row.date, row])), [exceptions]);

  const priceCheck = validatePrice(price);
  const baseCheck = validatePrice(basePriceDraft);
  const selectedHasExisting = selectedDates.some((date) => byDate.has(date));
  const priceError = priceErrorMessage(priceCheck);
  const baseError = priceErrorMessage(baseCheck);
  const noteTooLong = note.trim().length > ONE_DAY_PASS_NOTE_MAX_LENGTH;

  const resetForm = () => {
    setSelectedDates([]);
    setPrice('');
    setNote('');
  };

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: adminStoreSettingsControllerGetOneDayPassPriceQueryKey({ path: { id: storeId } }),
    });

  const setBasePriceMutation = useMutation({
    ...adminStoreSettingsControllerSetOneDayPassPriceMutation(),
    onSuccess: async () => {
      toast.success('基準価格を設定しました');
      setIsEditingBase(false);
      await invalidate();
    },
  });

  const setExceptionMutation = useMutation({
    ...adminStoreSettingsControllerSetOneDayPassExceptionMutation(),
  });

  const deleteExceptionMutation = useMutation({
    ...adminStoreSettingsControllerDeleteOneDayPassExceptionMutation(),
  });

  /**
   * One request per selected date. They run in sequence and a failure stops the run: the shared
   * `MutationCache` toast names it, and the dates already written stay written rather than being
   * rolled back by a second series of writes that could fail in turn.
   */
  const applyToSelectedDates = async () => {
    setIsApplying(true);
    try {
      for (const date of [...selectedDates].sort()) {
        await setExceptionMutation.mutateAsync({
          path: { id: storeId, date },
          body: { price: priceCheck.value, note: toNoteBody(note) },
        });
      }
      toast.success('1DayPass価格を設定しました');
      resetForm();
    } catch {
      // Already surfaced by the shared mutation-error toast
    } finally {
      setIsApplying(false);
      await invalidate();
    }
  };

  const clearSelectedDates = async () => {
    setIsApplying(true);
    try {
      for (const date of selectedDates.filter((value) => byDate.has(value))) {
        await deleteExceptionMutation.mutateAsync({ path: { id: storeId, date } });
      }
      toast.success('1DayPass価格の設定を解除しました');
      setClearDialogOpen(false);
      resetForm();
    } catch {
      // Already surfaced by the shared mutation-error toast
    } finally {
      setIsApplying(false);
      await invalidate();
    }
  };

  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      if (prev.includes(date)) return prev.filter((item) => item !== date);
      // Selecting a single already-priced day pre-fills its price and note
      if (prev.length === 0) {
        const existing = byDate.get(date);
        setPrice(existing ? String(existing.price) : '');
        setNote(existing?.note ?? '');
      }
      return [...prev, date];
    });
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const startEditBase = () => {
    setBasePriceDraft(basePrice.price === null ? '' : String(basePrice.price));
    setIsEditingBase(true);
  };

  const monthLabel = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`;
  const cells = buildMonthCells(monthDate);
  const canApply =
    priceCheck.trimmed !== '' && !priceCheck.invalid && !noteTooLong && selectedDates.length > 0;

  return (
    <>
      <RoleGatedButton
        allowedRoles={ONE_DAY_PASS_EDIT_ROLES}
        denyTooltip="1DayPass価格の編集はHQ/System・店舗スタッフのみ可能です"
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
        価格を設定
      </RoleGatedButton>

      <Drawer
        direction="right"
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-120">
          <DrawerHeader className="border-border border-b px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <DrawerTitle className="text-base">1DayPass価格を設定する</DrawerTitle>
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={close}>
                <X className="size-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Constraint band — the range is a Phase 1 system constant (Y-02 FR-003). The base
                price itself is a store setting the real API exposes for writing, and it may be
                unset, so it is editable here rather than display-only. */}
            <div className="border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground text-xs">基準価格</span>
                {isEditingBase ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={ONE_DAY_PASS_MIN_PRICE}
                      max={ONE_DAY_PASS_MAX_PRICE}
                      step={1}
                      aria-label="基準価格"
                      aria-invalid={Boolean(baseError)}
                      value={basePriceDraft}
                      onChange={(event) => setBasePriceDraft(event.target.value)}
                      className={cn(
                        'h-8 w-28 text-xs tabular-nums',
                        baseCheck.invalid && 'border-destructive focus-visible:ring-destructive/30',
                      )}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label="基準価格を保存"
                      disabled={
                        baseCheck.trimmed === '' ||
                        baseCheck.invalid ||
                        setBasePriceMutation.isPending
                      }
                      onClick={() =>
                        setBasePriceMutation.mutate({
                          path: { id: storeId },
                          body: { price: baseCheck.value },
                        })
                      }
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label="基準価格の編集をキャンセル"
                      onClick={() => setIsEditingBase(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold tabular-nums">
                      {basePrice.price === null ? '未設定' : formatYen(basePrice.price)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-[10px]"
                      onClick={startEditBase}
                    >
                      <Pencil className="size-3" />
                      {basePrice.source === 'store' ? '変更' : '設定'}
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[11px]">本部設定レンジ</span>
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-[10px] font-normal tabular-nums"
                >
                  {formatYen(ONE_DAY_PASS_MIN_PRICE)} 〜 {formatYen(ONE_DAY_PASS_MAX_PRICE)}
                </Badge>
              </div>
            </div>
            {isEditingBase && baseError && (
              <p className="text-destructive -mt-2 text-[11px]">{baseError}</p>
            )}

            <p className="text-muted-foreground text-[11px]">
              価格を変える日をカレンダーで選択してください。色のない日は基準価格で販売されます。
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setMonthDate(new Date())}
              >
                本日
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="前の月"
                onClick={() =>
                  setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="次の月"
                onClick={() =>
                  setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="size-4" />
              </Button>
              <span className="text-sm font-medium">{monthLabel}</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="text-muted-foreground py-1 text-center text-[10px] font-medium"
                >
                  {label}
                </div>
              ))}
              {cells.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
                const existing = byDate.get(date);
                const isSelected = selectedDates.includes(date);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => toggleDate(date)}
                    className={cn(
                      'flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-md text-xs font-medium transition-colors hover:opacity-80',
                      existing
                        ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                        : 'bg-muted/40 text-foreground',
                      isSelected && !existing && 'ring-primary bg-primary/10 text-primary ring-2',
                      isSelected && existing && 'ring-primary ring-2',
                    )}
                  >
                    <span className="leading-none">{Number(date.slice(-2))}</span>
                    {existing && (
                      <span className="mt-0.5 text-[9px] leading-none tabular-nums opacity-80">
                        {existing.price.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t pt-2">
              <div className="flex items-center gap-2">
                <div className="bg-muted/40 border-border/60 size-3 rounded-sm border" />
                <span className="text-muted-foreground text-[10px]">基準価格</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-sky-100 ring-1 ring-sky-300" />
                <span className="text-muted-foreground text-[10px]">個別設定あり</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="ring-primary bg-primary/10 size-3 rounded-sm ring-2" />
                <span className="text-muted-foreground text-[10px]">選択中</span>
              </div>
            </div>

            {selectedDates.length > 0 && (
              <div className="border-primary/30 bg-primary/[0.03] flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">設定対象 {selectedDates.length}日</span>
                  {selectedHasExisting && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-[10px] text-amber-700"
                    >
                      既存設定を上書き
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground ml-auto h-7 text-xs"
                    onClick={resetForm}
                  >
                    選択をクリア
                  </Button>
                </div>
                <p className="text-muted-foreground line-clamp-1 text-[11px] tabular-nums">
                  {[...selectedDates].sort().map(toSlashDate).join('、')}
                </p>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-medium">
                    価格（税込）
                    <RequiredMark />
                  </Label>
                  <div className="relative w-[160px]">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={ONE_DAY_PASS_MIN_PRICE}
                      max={ONE_DAY_PASS_MAX_PRICE}
                      step={1}
                      placeholder="例：1200"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className={cn(
                        'h-9 pr-8 text-xs tabular-nums',
                        priceCheck.invalid &&
                          'border-destructive focus-visible:ring-destructive/30',
                      )}
                    />
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                      円
                    </span>
                  </div>
                  {priceError ? (
                    <p className="text-destructive text-[11px]">{priceError}</p>
                  ) : (
                    <p className="text-muted-foreground text-[11px]">
                      設定可能範囲：{formatYen(ONE_DAY_PASS_MIN_PRICE)}〜
                      {formatYen(ONE_DAY_PASS_MAX_PRICE)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-medium">
                    備考
                    <OptionalMark />
                  </Label>
                  <Input
                    placeholder="例：GW特別価格"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    aria-invalid={noteTooLong}
                    className="h-9 text-xs"
                  />
                  {noteTooLong && (
                    <p className="text-destructive text-[11px]">
                      {maxLengthMessage('備考', ONE_DAY_PASS_NOTE_MAX_LENGTH)}
                    </p>
                  )}
                </div>

                {selectedHasExisting && (
                  <div className="border-t pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 gap-1 text-xs"
                      onClick={() => setClearDialogOpen(true)}
                    >
                      <Trash2 className="size-3" />
                      設定を解除
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DrawerFooter className="border-border border-t bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                {selectedDates.length > 0
                  ? `${selectedDates.length}日を選択中`
                  : '日付を選択してください'}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={close}>
                  閉じる
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canApply || isApplying}
                  onClick={() => void runGuarded(applyToSelectedDates)}
                >
                  {selectedDates.length > 0 ? `${selectedDates.length}日に適用` : '適用'}
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <OneDayPassClearConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        isPending={isApplying}
        onConfirm={() => void runGuarded(clearSelectedDates)}
      />
    </>
  );
}
