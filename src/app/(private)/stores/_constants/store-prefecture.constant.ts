import { PREFECTURES } from '@/constants/app.constants';

/**
 * Prefecture, as the store master actually stores it — decision D4.
 *
 * `StoreSummaryDto.prefecture` / `StoreDetailDto.prefecture` carry the JIS X 0401 numeric code
 * (`"13"` = 東京都) because the mobile app resolves the label from that id, and `Create/UpdateStoreDto`
 * accept the same code (B14, closed by the 2026-10-05 regen). The FE therefore keeps the code on
 * the wire in both directions and resolves the Japanese name locally, from the shared 47-entry
 * `PREFECTURES` array, whose order is JIS order: index + 1 = code.
 *
 * Zero-padding is not guaranteed by the contract (`"1"` and `"01"` both denote 北海道), so every
 * lookup goes through `normalizePrefectureCode`.
 *
 * Trade-off, documented in the integration plan: Y-02 FR-012 asks for the prefectures actually
 * used by the stores in the operator's scope. No endpoint supplies that subset, so the select
 * offers all 47.
 */
export type PrefectureOption = { code: string; name: string };

/** Strips a leading zero so `"01"` and `"1"` resolve to the same entry */
export function normalizePrefectureCode(code: string | null | undefined): string {
  if (!code) return '';
  const trimmed = code.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  return String(Number(trimmed));
}

export const PREFECTURE_OPTIONS: PrefectureOption[] = PREFECTURES.map((name, index) => ({
  code: String(index + 1),
  name,
}));

export const PREFECTURE_BY_CODE: Record<string, string> = Object.fromEntries(
  PREFECTURE_OPTIONS.map(({ code, name }) => [code, name]),
);

export const PREFECTURE_CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  PREFECTURE_OPTIONS.map(({ code, name }) => [name, code]),
);

/**
 * Display name for a stored prefecture value. Falls back to the raw value so an unexpected form
 * (the romaji `"tokyo"` the specs use, which the filter also accepts) stays visible rather than
 * rendering as an empty cell.
 */
export function prefectureLabel(code: string | null | undefined): string {
  if (!code) return '';
  return PREFECTURE_BY_CODE[normalizePrefectureCode(code)] ?? code;
}
