"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { addDays, format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { type DateRange, type Matcher } from "react-day-picker";
import { ja } from "date-fns/locale";

export type DateRangePickerProps = {
  date?: DateRange | undefined;
  onDateChange?: (date: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  /** Extra days that cannot be picked (react-day-picker matcher), on top of `maxDate` / `maxRangeDays`. */
  disabled?: Matcher | Matcher[];
  /** Last selectable day (inclusive): later days are disabled. */
  maxDate?: Date;
  /** The calendar's "today" marker — pass it when "today" is not the browser's local day (e.g. JST). */
  today?: Date;
  /**
   * Longest selectable range, in days between start and end. When set, the range is picked in two
   * clicks against a draft — first the start, then the end: once the start is picked, days more
   * than `maxRangeDays` away from it are disabled, and `onDateChange` fires once, with the
   * completed range (closing the picker). Closing it half-way discards the draft.
   */
  maxRangeDays?: number;
  /** Short note under the calendar, e.g. the range limit. */
  hint?: React.ReactNode;
};

export function DateRangePicker({
  date,
  onDateChange,
  placeholder = "期間を選択",
  className,
  disabled: extraDisabled,
  maxDate,
  today,
  maxRangeDays,
  hint,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>();
  const isBounded = maxRangeDays !== undefined;
  const draftStart = isBounded && draft?.from && !draft.to ? draft.from : undefined;

  const disabled: Matcher[] = extraDisabled === undefined ? [] : [extraDisabled].flat();
  if (maxDate) disabled.push({ after: maxDate });
  if (draftStart && maxRangeDays !== undefined) {
    disabled.push(
      { before: subDays(draftStart, maxRangeDays) },
      { after: addDays(draftStart, maxRangeDays) }
    );
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setDraft(undefined);
  };

  const handleBoundedSelect = (range: DateRange | undefined, triggerDate: Date) => {
    if (draftStart && range?.from && range.to) {
      onDateChange?.(range);
      handleOpenChange(false);
      return;
    }
    // First click: a new start (`resetOnSelect`); re-clicking a one-day range clears it, so
    // treat that click as the start too.
    setDraft(range ?? { from: triggerDate, to: undefined });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={className || "h-9 justify-start gap-2 px-3 font-normal"}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {/* TODO(CODE-RULE-V): direct date-fns format() for display — no equivalent
            "yyyy年M月d日" helper exists in date.util.ts yet; this pattern is also
            replicated pre-existing in several other screens. Follow-up issue required
            to add a shared helper and migrate all call sites together. */}
        {date?.from ? (
          date.to ? (
            <>
              {format(date.from, "yyyy年M月d日", { locale: ja })} 〜{" "}
              {format(date.to, "yyyy年M月d日", { locale: ja })}
            </>
          ) : (
            format(date.from, "yyyy年M月d日", { locale: ja })
          )
        ) : (
          <span>{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={date?.from}
          selected={isBounded ? (draft ?? date) : date}
          onSelect={isBounded ? handleBoundedSelect : onDateChange}
          resetOnSelect={isBounded}
          disabled={disabled.length > 0 ? disabled : undefined}
          today={today}
          numberOfMonths={2}
          locale={ja}
        />
        {hint ? (
          <p className="text-muted-foreground border-t px-3 py-2 text-[11px]">{hint}</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
