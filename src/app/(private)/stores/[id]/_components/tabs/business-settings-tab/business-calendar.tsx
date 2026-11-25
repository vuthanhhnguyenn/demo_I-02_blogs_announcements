'use client';

import { useMemo } from 'react';

import { formatDateYYYYMM, formatISODateLocal } from '@/utils/date.util';
import * as holidayJp from '@holiday-jp/holiday_jp';

import { MonthPicker } from '@/components/common/month-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  type BusinessException,
  type DayClass,
  type WeeklyHours,
  buildMonthDays,
  classifyDay,
  holidayRowOf,
} from './business-hours-shared';

type Props = {
  monthDate: Date;
  onMonthDateChange: (date: Date) => void;
  weeklyHours: WeeklyHours;
  /** Both kinds of the one `/business-exceptions` list (decision D10) */
  exceptions: BusinessException[];
};

/**
 * Tint and label per day class (FR-021, prototype `getDayCellClass` / `getDayTextColor`
 * L662-L679). An un-overridden holiday keeps the plain cell and only earns its label.
 */
const DAY_CLASS_META: Record<DayClass, { label: string; tint: string | null; text: string }> = {
  temporary_closed: { label: '臨時休業', tint: 'bg-info/15', text: 'text-info' },
  special_open: { label: '特別営業', tint: 'bg-success/15', text: 'text-success' },
  holiday_open: { label: '祝日営業', tint: 'bg-warning/15', text: 'text-foreground' },
  holiday_closed: { label: '祝日休業', tint: 'bg-destructive/15', text: 'text-destructive' },
  regular_closed: { label: '定休日', tint: 'bg-destructive/15', text: 'text-destructive' },
  holiday_label_only: { label: '祝日', tint: null, text: 'text-foreground/80' },
  open: { label: '', tint: null, text: 'text-foreground/80' },
};

/** Legend order of the prototype (L1200-L1221, FR-023) */
const LEGEND: { label: string; dot: string }[] = [
  { label: '営業日', dot: 'border bg-card' },
  { label: '定休日・祝日休業', dot: 'bg-destructive' },
  { label: '臨時休業', dot: 'bg-info' },
  { label: '特別営業', dot: 'bg-success' },
  { label: '祝日営業', dot: 'bg-warning' },
];

export function BusinessCalendar({ monthDate, onMonthDateChange, weeklyHours, exceptions }: Props) {
  const japaneseHolidayMap = useMemo(() => {
    const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    return holidayJp.between(from, to).reduce<Map<string, string>>((acc, holiday) => {
      acc.set(formatISODateLocal(holiday.date), holiday.name);
      return acc;
    }, new Map<string, string>());
  }, [monthDate]);

  const exceptionMap = useMemo(
    () => new Map(exceptions.map((entry) => [entry.date, entry.exceptionType] as const)),
    [exceptions],
  );
  const holidayRow = useMemo(() => holidayRowOf(weeklyHours), [weeklyHours]);

  const monthDays = useMemo(() => buildMonthDays(monthDate), [monthDate]);
  const todayKey = formatISODateLocal(new Date());

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">営業カレンダー</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => onMonthDateChange(new Date())}
            >
              本日
            </Button>
            <MonthPicker
              value={formatDateYYYYMM(monthDate)}
              onChange={(value) => {
                const [year, month] = value.split('/').map(Number);
                if (year && month) onMonthDateChange(new Date(year, month - 1, 1));
              }}
              showArrows
              className="w-36"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="bg-border grid grid-cols-7 gap-px overflow-hidden rounded-md border">
          {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
            <div
              key={day}
              className="bg-muted/50 text-muted-foreground py-1 text-center text-[10px] font-medium"
            >
              {day}
            </div>
          ))}
          {monthDays.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="bg-muted/20 h-14" />;
            const dateText = formatISODateLocal(date);
            const meta =
              DAY_CLASS_META[
                classifyDay(date, {
                  weekly: weeklyHours,
                  holidayRow,
                  holidays: japaneseHolidayMap,
                  exceptions: exceptionMap,
                })
              ];
            const holidayName = japaneseHolidayMap.get(dateText);
            const isToday = dateText === todayKey;

            return (
              <div
                key={dateText}
                className="bg-card relative flex h-14 flex-col p-1"
                title={holidayName}
              >
                {/* The tint is an overlay on the opaque card, as in the prototype (L1183-L1186):
                    a translucent cell background would let the grid's border colour through */}
                {meta.tint && (
                  <span className={`pointer-events-none absolute inset-0 ${meta.tint}`} />
                )}
                {isToday ? (
                  <span className="bg-foreground text-background relative flex size-5 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium">
                    {date.getDate()}
                  </span>
                ) : (
                  <span className={`relative shrink-0 self-end text-xs font-medium ${meta.text}`}>
                    {date.getDate()}
                  </span>
                )}
                {meta.label && (
                  <span
                    className={`relative mt-0.5 self-start text-[10px] leading-tight font-medium ${meta.text}`}
                  >
                    {meta.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4">
          {LEGEND.map(({ label, dot }) => (
            <div key={label} className="flex items-center gap-1.5 whitespace-nowrap">
              <div className={`size-2 rounded-full ${dot}`} />
              <span className="text-muted-foreground text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
