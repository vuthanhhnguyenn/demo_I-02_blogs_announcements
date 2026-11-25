/**
 * 縛り期間の適用例 (例: `2026/04入会の場合 → 2026/09末まで解約手数料対象`)。
 * API-088 は `cancellationFeeMonths` のみ返すため、募集開始月を入会月の例として画面側で組み立てる。
 */
export function buildLockInExample(
  recruitmentStart: string,
  cancellationFeeMonths: number | null,
): string | null {
  if (cancellationFeeMonths === null || cancellationFeeMonths <= 0) return null;
  const start = new Date(`${recruitmentStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + cancellationFeeMonths);
  end.setUTCDate(0); // 前月末日
  const format = (date: Date) =>
    `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${format(start)}入会の場合 → ${format(end)}末まで解約手数料対象`;
}
