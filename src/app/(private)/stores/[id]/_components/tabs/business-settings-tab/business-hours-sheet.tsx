'use client';

import { useState } from 'react';

import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import type { StoreBusinessHourDto } from '@/lib/api-real/types.gen';

import { WEEKDAY_FROM_API, WEEKDAY_TO_API } from '../../../../_utils/store-api.util';
import {
  DAY_LABELS,
  DAY_ORDER,
  HOLIDAY_MODE_LABELS,
  HOLIDAY_MODE_ORDER,
  type HolidayMode,
  type WeeklyHoursDraft,
  isUnsetRow,
  isUnstaffed,
  weeklyHourErrors,
} from './business-hours-shared';

/** Which half of the weekly set the Sheet edits — both are saved by the one `PUT` */
export type HoursSheetMode = 'hours' | 'staff';

const SHEET_COPY: Record<HoursSheetMode, { title: string; guidance: string }> = {
  hours: {
    title: '営業時間を設定する',
    guidance:
      '通常営業日の曜日別営業時間を設定します。定休日にした曜日は営業カレンダーに定休日として反映されます。祝日は「曜日どおり」のとき、その日の曜日の設定に従います。',
  },
  staff: {
    title: 'スタッフ常駐時間帯を設定する',
    guidance:
      'ゲートストップの判定に使用されるスタッフ常駐時間帯を曜日別に設定します。常駐しない曜日は「常駐なし」にしてください。',
  },
};

type TimeField = 'openTime' | 'closeTime' | 'staffStartTime' | 'staffEndTime';

type Props = {
  /** `null` = closed */
  mode: HoursSheetMode | null;
  /** The draft the Sheet opens with; re-seeded by the parent on every open */
  initialDraft: WeeklyHoursDraft;
  isPending: boolean;
  onClose: () => void;
  onSave: (draft: WeeklyHoursDraft) => void;
};

/**
 * The 営業時間設定 / スタッフ常駐時間帯 editors (FR-029, FR-029a, FR-029f) — one right-side Sheet
 * in two modes, as in the prototype (`store-detail.tsx` L1433-L1566).
 *
 * The prototype saves without validation; the spec keeps two rules on top of it (FR-029): a
 * trading day needs both times, and a staffed day needs both ends of its window (the API's 422
 * `E-STR-003`). Messages appear from the first refused save on, then follow the draft.
 */
export function BusinessHoursSheet({ mode, initialDraft, isPending, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<WeeklyHoursDraft>(initialDraft);
  const [showErrors, setShowErrors] = useState(false);
  const [seededFrom, setSeededFrom] = useState<WeeklyHoursDraft | null>(null);

  // Re-seed on every open: the parent hands over a fresh draft built from the server's copy
  if (seededFrom !== initialDraft) {
    setSeededFrom(initialDraft);
    setDraft(initialDraft);
    setShowErrors(false);
  }

  const errors = weeklyHourErrors(draft);
  // Each Sheet only reports — and only blocks on — what the operator can fix in it
  const visibleErrors =
    mode === 'staff'
      ? new Set([...errors.incompleteStaffWindow, ...errors.reversedStaffWindow])
      : new Set([...errors.missingHours, ...errors.reversedHours]);
  const dayNames = (days: Set<StoreBusinessHourDto['dayOfWeek']>) =>
    DAY_ORDER.filter((day) => days.has(WEEKDAY_TO_API[day]))
      .map((day) => DAY_LABELS[day])
      .join('・');

  const patchRow = (
    dayOfWeek: StoreBusinessHourDto['dayOfWeek'],
    patch: Partial<StoreBusinessHourDto>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)),
    }));
  };

  // An emptied input stays `''` rather than `null`: on the staff window `null` means 常駐なし
  const setTime = (row: StoreBusinessHourDto, field: TimeField, value: string) =>
    patchRow(row.dayOfWeek, { [field]: value });

  const save = () => {
    if (visibleErrors.size > 0) {
      setShowErrors(true);
      return;
    }
    onSave(draft);
  };

  const copy = mode ? SHEET_COPY[mode] : SHEET_COPY.hours;

  const renderHoursRow = (row: StoreBusinessHourDto) => {
    const day = WEEKDAY_FROM_API[row.dayOfWeek];
    const label = DAY_LABELS[day];
    const invalid = showErrors && visibleErrors.has(row.dayOfWeek);

    if (row.dayOfWeek === 'holiday') {
      // 祝日の扱い (FR-029f): times only when the holiday is overridden open
      return (
        <div key={row.dayOfWeek} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-sm">{label}</span>
            <Select
              value={draft.holidayMode}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, holidayMode: (value as HolidayMode) ?? 'weekday' }))
              }
            >
              <SelectTrigger className="w-28 text-xs" aria-label="祝日の扱い">
                <SelectValue>{HOLIDAY_MODE_LABELS[draft.holidayMode]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_MODE_ORDER.map((holidayMode) => (
                  <SelectItem key={holidayMode} value={holidayMode}>
                    {HOLIDAY_MODE_LABELS[holidayMode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {draft.holidayMode === 'open' && (
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0" />
              <Input
                type="time"
                className="h-8 w-28 text-xs"
                value={row.openTime ?? ''}
                aria-invalid={invalid}
                onChange={(event) => setTime(row, 'openTime', event.target.value)}
                aria-label="祝日 開店時刻"
              />
              <span className="text-muted-foreground text-xs">〜</span>
              <Input
                type="time"
                className="h-8 w-28 text-xs"
                value={row.closeTime ?? ''}
                aria-invalid={invalid}
                onChange={(event) => setTime(row, 'closeTime', event.target.value)}
                aria-label="祝日 閉店時刻"
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={row.dayOfWeek} className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-sm">{label}</span>
        <Input
          type="time"
          className="h-8 w-28 text-xs"
          value={row.openTime ?? ''}
          disabled={row.isClosed}
          aria-invalid={invalid}
          onChange={(event) => setTime(row, 'openTime', event.target.value)}
          aria-label={`${label} 開店時刻`}
        />
        <span className="text-muted-foreground text-xs">〜</span>
        <Input
          type="time"
          className="h-8 w-28 text-xs"
          value={row.closeTime ?? ''}
          disabled={row.isClosed}
          aria-invalid={invalid}
          onChange={(event) => setTime(row, 'closeTime', event.target.value)}
          aria-label={`${label} 閉店時刻`}
        />
        <div className="ml-2 flex items-center gap-2">
          <Checkbox
            id={`closed-${day}`}
            checked={row.isClosed}
            onCheckedChange={(checked) => patchRow(row.dayOfWeek, { isClosed: checked === true })}
          />
          <Label htmlFor={`closed-${day}`} className="text-xs font-normal">
            定休日
          </Label>
        </div>
      </div>
    );
  };

  const renderStaffRow = (row: StoreBusinessHourDto) => {
    const day = WEEKDAY_FROM_API[row.dayOfWeek];
    const label = DAY_LABELS[day];
    const isHoliday = row.dayOfWeek === 'holiday';
    const invalid = showErrors && visibleErrors.has(row.dayOfWeek);

    let body;
    if (isHoliday && draft.holidayMode === 'weekday') {
      body = (
        <span className="text-muted-foreground text-xs">
          曜日どおり（その日の曜日の常駐時間帯）
        </span>
      );
    } else if (isHoliday && draft.holidayMode === 'closed') {
      body = <span className="text-destructive text-xs">休業</span>;
    } else if (!isHoliday && row.isClosed) {
      body = <span className="text-destructive text-xs">定休日</span>;
    } else if (isUnsetRow(row)) {
      // 営業時間 未設定: no staff window without opening hours, as in the read view
      body = <span className="text-muted-foreground text-xs">—</span>;
    } else {
      const unstaffed = isUnstaffed(row);
      body = (
        <>
          <Input
            type="time"
            className="h-8 w-28 text-xs"
            value={row.staffStartTime ?? ''}
            disabled={unstaffed}
            aria-invalid={invalid}
            onChange={(event) => setTime(row, 'staffStartTime', event.target.value)}
            aria-label={`${label} 常駐開始時刻`}
          />
          <span className="text-muted-foreground text-xs">〜</span>
          <Input
            type="time"
            className="h-8 w-28 text-xs"
            value={row.staffEndTime ?? ''}
            disabled={unstaffed}
            aria-invalid={invalid}
            onChange={(event) => setTime(row, 'staffEndTime', event.target.value)}
            aria-label={`${label} 常駐終了時刻`}
          />
          <div className="ml-2 flex items-center gap-2">
            <Checkbox
              id={`no-staff-${day}`}
              checked={unstaffed}
              onCheckedChange={(checked) =>
                // Unticking seeds the window from the opening hours (FR-029a)
                patchRow(
                  row.dayOfWeek,
                  checked === true
                    ? { staffStartTime: null, staffEndTime: null }
                    : { staffStartTime: row.openTime ?? '', staffEndTime: row.closeTime ?? '' },
                )
              }
            />
            <Label htmlFor={`no-staff-${day}`} className="text-xs font-normal">
              常駐なし
            </Label>
          </div>
        </>
      );
    }

    return (
      <div key={row.dayOfWeek} className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-sm">{label}</span>
        {body}
      </div>
    );
  };

  return (
    <Sheet
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-lg"
      >
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4" />
              {copy.title}
            </SheetTitle>
            <SheetDescription className="sr-only">曜日別の時間帯を設定します</SheetDescription>
          </SheetHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-4 py-4">
            <p className="text-muted-foreground text-xs">{copy.guidance}</p>
            <div className="flex flex-col gap-2">
              {draft.rows.map((row) =>
                mode === 'staff' ? renderStaffRow(row) : renderHoursRow(row),
              )}
            </div>
            {showErrors && mode === 'staff' && errors.incompleteStaffWindow.size > 0 && (
              <p className="text-destructive text-xs">
                {`${dayNames(errors.incompleteStaffWindow)}のスタッフ常駐時間は開始・終了の両方を入力してください（常駐しない場合は「常駐なし」にしてください）`}
              </p>
            )}
            {showErrors && mode === 'staff' && errors.reversedStaffWindow.size > 0 && (
              <p className="text-destructive text-xs">
                {`${dayNames(errors.reversedStaffWindow)}のスタッフ常駐終了時刻は開始時刻より後の時刻を入力してください`}
              </p>
            )}
            {showErrors && mode !== 'staff' && errors.missingHours.size > 0 && (
              <p className="text-destructive text-xs">
                {`${dayNames(errors.missingHours)}の営業時間を入力してください（定休日の場合は定休日を選択してください）`}
              </p>
            )}
            {showErrors && mode !== 'staff' && errors.reversedHours.size > 0 && (
              <p className="text-destructive text-xs">
                {`${dayNames(errors.reversedHours)}の閉店時刻は開店時刻より後の時刻を入力してください`}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button size="sm" onClick={save} disabled={isPending}>
            {isPending ? '保存中...' : '保存する'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
