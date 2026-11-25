'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Matcher } from 'react-day-picker';

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  disabled?:  boolean;
  disabledDate?:  Matcher | Matcher[] | undefined;
  placeholder?: string;
  hasError?: boolean;
  /** Trigger classes, for the compact inline rows that cannot take the default control height */
  className?: string;
  /** First month the year/month dropdowns offer. Defaults to 100 years back. */
  startMonth?: Date;
  /**
   * Last month the year/month dropdowns offer. Defaults to December, 10 years ahead.
   *
   * react-day-picker's own default for a dropdown caption ends at the *current* year, which made
   * every future date past this December unreachable (e.g. a fee revision scheduled for next
   * April). Past-only fields such as 生年月日 pass `endMonth={new Date()}`.
   */
  endMonth?: Date;
  /**
   * Shows a クリア button while a date is set, for optional fields that must be emptyable
   * (e.g. 適用終了予定日). Without it the only way out is re-clicking the selected day.
   */
  clearable?: boolean;
}

const DEFAULT_YEARS_BACK = 100;
const DEFAULT_YEARS_AHEAD = 10;

export function DatePicker({
  date,
  onDateChange,
  disabled = false,
  disabledDate,
  placeholder = '日付を選択',
  hasError = false,
  className,
  startMonth,
  endMonth,
  clearable = false,
}: Readonly<DatePickerProps>) {
  const [open, setOpen] = React.useState(false);
  const currentYear = new Date().getFullYear();

  const handleSelect = React.useCallback(
    (nextDate: Date | undefined) => {
      onDateChange?.(nextDate);
      setOpen(false);
    },
    [onDateChange],
  );

  const showClear = clearable && !!date && !disabled;

  const picker = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            // aria-invalid lets useScrollToFirstError locate the field while it has an error
            aria-invalid={hasError || undefined}
            className={cn(
              'justify-between gap-2 text-left font-normal',
              !date && 'text-muted-foreground',
              hasError && 'border-destructive text-destructive! focus-visible:ring-destructive/20',
              clearable && 'w-full',
              showClear && 'pr-9',
              className,
            )}
            disabled={disabled}
          />
        }
      >
        {date ? format(date, 'yyyy/MM/dd', { locale: ja }) : placeholder}
        <CalendarIcon className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disabledDate}
          defaultMonth={date}
          captionLayout="dropdown"
          startMonth={startMonth ?? new Date(currentYear - DEFAULT_YEARS_BACK, 0)}
          endMonth={endMonth ?? new Date(currentYear + DEFAULT_YEARS_AHEAD, 11)}
          locale={ja}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  if (!clearable) return picker;

  return (
    <div className="relative">
      {picker}
      {showClear && (
        <button
          type="button"
          aria-label="日付をクリア"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={() => onDateChange?.(undefined)}
        >
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
