import { formatTime } from '@/utils/date.util';

/** The app's canonical display timezone (JST, UTC+9) — same constant as `@/utils/date.util`. */
const DISPLAY_TZ_OFFSET_MS = 9 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Wall-clock JST calendar parts of an instant, read through UTC getters so the
 * bucket never shifts with the viewer's own timezone (see BUG-C01-02). */
function jstParts(date: Date) {
  const jst = new Date(date.getTime() + DISPLAY_TZ_OFFSET_MS);
  return {
    dayIndex: Math.floor(jst.getTime() / MS_PER_DAY),
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth(),
    day: jst.getUTCDate(),
  };
}

/**
 * Formats an ISO datetime as the 最終ログイン relative-time buckets the spec defines
 * (FR-001 / TC-055 — BUG-P2-01-10):
 *
 * - same JST calendar day → 「今日 HH:MM」 (a minutes/hours count is *not* wanted here)
 * - 1–6 days ago → 「N日前」
 * - beyond that, under a year → 「Nヶ月前」 (clamped to at least 1 — 7 days is never 「0ヶ月前」)
 * - a year or more → 「N年前」
 *
 * Callers are responsible for handling `null` (e.g. rendering "未ログイン") —
 * this util only formats a known, non-null datetime.
 *
 * @param now injectable "current instant" — production callers omit it; the unit test pins it.
 */
export function formatRelativeTime(isoDateTime: string, now: Date = new Date()): string {
  const target = new Date(isoDateTime);
  if (Number.isNaN(target.getTime())) return '';

  const then = jstParts(target);
  const today = jstParts(now);

  const diffDays = today.dayIndex - then.dayIndex;
  // Same day (or a clock skew that puts the login slightly in the future) → 今日.
  if (diffDays <= 0) return `今日 ${formatTime(isoDateTime, '')}`.trim();
  if (diffDays < 7) return `${diffDays}日前`;

  // Whole months elapsed, counted on the calendar (not as 30-day blocks).
  const elapsedMonths =
    (today.year - then.year) * 12 + (today.month - then.month) - (today.day < then.day ? 1 : 0);
  if (elapsedMonths >= 12) return `${Math.floor(elapsedMonths / 12)}年前`;
  return `${Math.max(1, elapsedMonths)}ヶ月前`;
}
