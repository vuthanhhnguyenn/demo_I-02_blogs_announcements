'use client';

import { useState } from 'react';

import { fromJstPickerDate, toJstPickerDate } from '@/utils/date.util';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function buildDate(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface DateTimePickerProps {
  /** Current value — `Date` object or `undefined` when nothing is selected */
  value?: Date;
  /** Called with a new `Date` whenever the date or time part changes */
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Highlights the trigger in destructive colour when true */
  hasError?: boolean;
  className?: string;
  /** First month the year/month dropdowns offer. Omitted: react-day-picker's default, 100 years back. */
  startMonth?: Date;
  /**
   * Last month the year/month dropdowns offer. Omitted: react-day-picker's default, which ends at
   * December of the *current* year, so a field taking later dates must pass one.
   */
  endMonth?: Date;
}

// ── DateTimePicker ────────────────────────────────────────────────────────────
export function DateTimePicker({
  value,
  onChange,
  placeholder = '日時を選択',
  disabled = false,
  hasError = false,
  className,
  startMonth,
  endMonth,
}: Readonly<DateTimePickerProps>) {
  const [open, setOpen] = useState(false);

  // Internal selected date as JST wall-clock fields (may differ from `value` while the popover
  // is open) — the app's canonical timezone, so the input matches what every screen displays
  // whatever the viewer's browser timezone is.
  const [pickedDate, setPickedDate] = useState<Date | undefined>(
    value ? toJstPickerDate(value) : undefined,
  );

  const pick = (next: Date) => {
    setPickedDate(next);
    onChange?.(fromJstPickerDate(next));
  };

  // Keep internal state in sync when the prop value changes externally
  const hour = pickedDate ? pickedDate.getHours() : 0;
  const minute = pickedDate ? pickedDate.getMinutes() : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDaySelect = (day: Date | undefined) => {
    if (!day) {
      setPickedDate(undefined);
      onChange?.(undefined);
      return;
    }
    pick(buildDate(day, hour, minute));
  };

  const handleHourChange = (h: string | null) => {
    const base = pickedDate ?? toJstPickerDate(new Date());
    pick(buildDate(base, parseInt(h ?? '0'), minute));
  };

  const handleMinuteChange = (m: string | null) => {
    const base = pickedDate ?? toJstPickerDate(new Date());
    pick(buildDate(base, hour, parseInt(m ?? '0')));
  };

  const displayLabel = pickedDate
    ? format(pickedDate, 'yyyy/MM/dd HH:mm', { locale: ja })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            // aria-invalid lets useScrollToFirstError locate the field while it has an error
            aria-invalid={hasError || undefined}
            className={cn(
              'w-full justify-between gap-2 text-left font-normal',
              !pickedDate && 'text-muted-foreground',
              hasError && 'border-destructive text-destructive! focus-visible:ring-destructive/20',
              className,
            )}
          />
        }
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="size-3.5 shrink-0" />
          {displayLabel}
        </span>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={pickedDate}
          onSelect={handleDaySelect}
          defaultMonth={pickedDate}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          locale={ja}
        />

        {/* Time row */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-3.5 shrink-0" />
            <span className="text-muted-foreground text-xs">時刻</span>
            <div className="ml-auto flex items-center gap-1">
              {/* Hour */}
              <Select value={String(hour).padStart(2, '0')} onValueChange={handleHourChange}>
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="max-h-48">
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={h} className="text-xs">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground text-sm font-medium">:</span>

              {/* Minute */}
              <Select value={String(minute).padStart(2, '0')} onValueChange={handleMinuteChange}>
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="max-h-48">
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
