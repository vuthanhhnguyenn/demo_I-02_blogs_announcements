import type {
  StudioHistoryItemDto,
  StudioLinkedLessonDto,
  StudioTimeBandUtilizationDto,
} from '@/lib/api-real/types.gen';

import {
  type ApiStudioType,
  STUDIO_KIND_BY_TYPE,
  displayTime,
  formatHours,
} from './studio-api.util';

/**
 * Studio detail (API-110 #11 / #12 / #13) — the date windows of the 利用状況 card, the linked-lesson
 * schedule text, and the 変更履歴 rows rebuilt from the API's snapshots.
 */

// --- 利用状況 (#11) ---

export type UsagePeriod = 'day' | 'week' | 'month';
export type Granularity = 'day' | 'week' | 'month';

export interface UsageWindow {
  from: string;
  to: string;
  granularity: Granularity;
}

const DAY_MS = 86_400_000;
const ymd = (date: Date) => date.toISOString().slice(0, 10);
const parse = (day: string) => new Date(`${day}T00:00:00.000Z`);
const addDays = (day: string, n: number) => ymd(new Date(parse(day).getTime() + n * DAY_MS));
const monthStart = (day: string, offset = 0) => {
  const d = parse(day);
  return ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1)));
};
const monthEnd = (day: string, offset = 0) => {
  const d = parse(day);
  return ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset + 1, 0)));
};
/** Monday of the week holding `day` (the API's week buckets run Monday–Sunday) */
const weekStart = (day: string) => addDays(day, -((parse(day).getUTCDay() + 6) % 7));

/** Today's calendar date in JST, the API's date axis */
export function jstToday(now: Date = new Date()): string {
  return ymd(new Date(now.getTime() + 9 * 3_600_000));
}

/** The selected period itself: 本日 / 今週 (Mon–Sun) / 今月 */
export function currentWindow(period: UsagePeriod, today: string): UsageWindow {
  if (period === 'day') return { from: today, to: today, granularity: 'day' };
  if (period === 'week') {
    const monday = weekStart(today);
    return { from: monday, to: addDays(monday, 6), granularity: 'day' };
  }
  return { from: monthStart(today), to: monthEnd(today), granularity: 'day' };
}

/**
 * The 7 trend buckets (直近7枠 / 7週 / 7ヶ月), as the calls that fetch them. The API caps one call
 * at 92 days, so the 7 months are fetched as 3 + 3 + 1 calendar months (§4.3: split client-side).
 */
export function trendWindows(period: UsagePeriod, today: string): UsageWindow[] {
  if (period === 'day') return [{ from: addDays(today, -6), to: today, granularity: 'day' }];
  if (period === 'week') {
    const monday = weekStart(today);
    return [{ from: addDays(monday, -42), to: addDays(monday, 6), granularity: 'week' }];
  }
  return [
    { from: monthStart(today, -6), to: monthEnd(today, -4), granularity: 'month' },
    { from: monthStart(today, -3), to: monthEnd(today, -1), granularity: 'month' },
    { from: monthStart(today), to: monthEnd(today), granularity: 'month' },
  ];
}

/**
 * 時間帯別稼働率 — the API's bands (API-112 §6.13.5, shared by API-110 §4.3; Clarifications
 * 2026-10-14), in display order.
 */
export const TIME_BAND_LABELS: { key: keyof StudioTimeBandUtilizationDto; label: string }[] = [
  { key: 'morning', label: '朝（〜12時）' },
  { key: 'daytime', label: '昼（12〜16時）' },
  { key: 'evening', label: '夕方（16〜19時）' },
  { key: 'night', label: '夜（19時〜）' },
];

/** 0–1 → whole percent; null stays null */
export function toPercent(rate: number | null | undefined): number | null {
  return rate === null || rate === undefined ? null : Math.round(rate * 100);
}

// --- 紐付きレッスン (#13) ---

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const LINKED_KIND_LABELS: Record<StudioLinkedLessonDto['kind'], string> = {
  recurring: '定期',
  single: '単発',
};

/** 「月水金 9:00-10:00」 for a rule, 「3/22 10:00-11:30」 for a one-off */
export function formatLinkedSchedule(row: StudioLinkedLessonDto): string {
  const time = row.endTime
    ? `${displayTime(row.startTime)}-${displayTime(row.endTime)}`
    : displayTime(row.startTime);
  if (row.kind === 'recurring') {
    const days = (row.daysOfWeek ?? []).map((d) => WEEKDAY_LABELS[d] ?? '').join('');
    return days ? `${days} ${time}` : time;
  }
  if (!row.nextDate) return time;
  const [, month, day] = row.nextDate.split('-');
  return `${Number(month)}/${Number(day)} ${time}`;
}

// --- 変更履歴 (#12) ---

/** One table row of the 変更履歴 tab (one per changed field) */
export interface StudioHistoryRow {
  timestamp: string;
  user: string;
  action: string;
  field: string | null;
  before: string | null;
  after: string | null;
  note: string | null;
  isCreate: boolean;
}

interface SnapshotSeat {
  rowIndex: number;
  columnIndex: number;
  seatType: string;
  seatNumber: string | null;
  displayLabel: string | null;
}

interface StudioSnapshot {
  name?: string;
  studioType?: ApiStudioType;
  capacity?: number;
  bufferCapacity?: number;
  startTime?: string;
  endTime?: string;
  equipment?: string | null;
  description?: string | null;
  isActive?: boolean;
  deletedAt?: string | null;
  seats?: SnapshotSeat[];
  images?: { id: string }[];
  meta?: { action?: string };
}

const STUDIO_TYPE_TEXT: Record<string, string> = {
  'studio-lesson': 'スタジオレッスン用',
  pt: 'PT用',
  'body-care': 'ボディケア用',
};

const EVENT_LABELS: Record<StudioHistoryItemDto['eventType'], string> = {
  created: '作成',
  updated: '更新',
  deleted: '無効化',
  restored: '有効化',
};

/** What a field-less `updated` event did (snapshot `meta.action`) */
const META_ACTION_FIELDS: Record<string, string> = {
  image_added: 'スタジオ画像（追加）',
  image_removed: 'スタジオ画像（削除）',
  image_reordered: 'スタジオ画像（並び替え）',
  seat_layout_replaced: 'スペースレイアウト',
};

const blank = (value: string | null | undefined) => (value ? value : '（空欄）');
const people = (n: number | undefined) => (n === undefined ? '—' : `${n}名`);

function layoutText(seats: SnapshotSeat[] = []): string {
  if (seats.length === 0) return '未設定';
  const rows = Math.max(...seats.map((s) => s.rowIndex)) + 1;
  const cols = Math.max(...seats.map((s) => s.columnIndex)) + 1;
  const normal = seats.filter((s) => s.seatType === 'normal').length;
  return `${rows}x${cols}（通常席${normal}）`;
}

const layoutKey = (seats: SnapshotSeat[] = []) =>
  seats
    .map((s) => `${s.rowIndex}:${s.columnIndex}:${s.seatType}:${s.seatNumber}:${s.displayLabel}`)
    .sort()
    .join('|');

const imageKey = (images: { id: string }[] = []) => images.map((i) => i.id).join('|');

function diffSnapshots(
  older: StudioSnapshot,
  newer: StudioSnapshot,
): { field: string; before: string; after: string }[] {
  const diffs: { field: string; before: string; after: string }[] = [];
  const push = (field: string, before: string, after: string) => {
    if (before !== after) diffs.push({ field, before, after });
  };
  const typeText = (t?: ApiStudioType) => (t ? STUDIO_TYPE_TEXT[STUDIO_KIND_BY_TYPE[t]] : '—');
  const hours = (s: StudioSnapshot) =>
    s.startTime && s.endTime ? formatHours(s.startTime, s.endTime) : '—';

  push('スタジオ名', older.name ?? '—', newer.name ?? '—');
  push('スタジオ区分', typeText(older.studioType), typeText(newer.studioType));
  push('物理定員', people(older.capacity), people(newer.capacity));
  push('バッファ値', people(older.bufferCapacity), people(newer.bufferCapacity));
  push('利用時間', hours(older), hours(newer));
  push('設備・備品', blank(older.equipment), blank(newer.equipment));
  push('備考', blank(older.description), blank(newer.description));
  push('ステータス', older.isActive ? '有効' : '無効', newer.isActive ? '有効' : '無効');
  if (layoutKey(older.seats) !== layoutKey(newer.seats)) {
    const before = layoutText(older.seats);
    const after = layoutText(newer.seats);
    diffs.push({
      field: 'スペースレイアウト',
      before,
      // Same size and seat count but different cells: say so, rather than show two equal texts
      after: after === before ? `${after}（配置変更）` : after,
    });
  }
  if (imageKey(older.images) !== imageKey(newer.images)) {
    diffs.push({
      field: 'スタジオ画像',
      before: `${older.images?.length ?? 0}枚`,
      after: `${newer.images?.length ?? 0}枚`,
    });
  }
  return diffs;
}

/**
 * §5.2: "Diff rendering is FE-side". Items arrive newest first; each is compared with the next
 * (older) one. The page's last item is compared with `olderThanPage` — the first item of the
 * next page — and shows its event only when there is none (the studio's oldest entry).
 */
export function toStudioHistoryRows(
  items: StudioHistoryItemDto[],
  olderThanPage?: StudioHistoryItemDto,
): StudioHistoryRow[] {
  const rows: StudioHistoryRow[] = [];
  items.forEach((item, index) => {
    const snapshot = item.snapshot as StudioSnapshot;
    const base = {
      timestamp: item.changedAt,
      user: item.changedByName || '—',
      action:
        item.eventType === 'deleted' && snapshot.deletedAt ? '削除' : EVENT_LABELS[item.eventType],
      note: null,
    };
    if (item.eventType === 'created') {
      rows.push({
        ...base,
        field: null,
        before: null,
        after: null,
        note: snapshot.name ? `${snapshot.name}を新規登録` : null,
        isCreate: true,
      });
      return;
    }
    const older = (items[index + 1] ?? olderThanPage)?.snapshot as StudioSnapshot | undefined;
    const diffs = older ? diffSnapshots(older, snapshot) : [];
    if (diffs.length === 0) {
      const metaField = snapshot.meta?.action
        ? META_ACTION_FIELDS[snapshot.meta.action]
        : undefined;
      rows.push({
        ...base,
        field: metaField ?? (base.action === '更新' ? null : 'ステータス'),
        before: null,
        after: metaField || base.action === '更新' ? null : base.action,
        isCreate: false,
      });
      return;
    }
    for (const diff of diffs) rows.push({ ...base, ...diff, isCreate: false });
  });
  return rows;
}
