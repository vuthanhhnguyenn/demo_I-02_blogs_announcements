import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';

import { DIRECT_MANAGEMENT_COMPANY_ID } from '../_constants/constants';
import { STORE_DEFAULT_PAGE_SIZE } from '../_constants/store-list.constant';
import {
  PREFECTURE_OPTIONS,
  normalizePrefectureCode,
} from '../_constants/store-prefecture.constant';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A hand-edited address can carry anything; each value falls back to its default instead of 400ing the list */
export function sanitizeStoreListPage(page: number): number {
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Only the page sizes the 表示件数 select offers — anything else would leave the select blank */
export function sanitizeStoreListLimit(limit: number): number {
  return (API_PAGE_SIZE_OPTIONS as readonly number[]).includes(limit)
    ? limit
    : STORE_DEFAULT_PAGE_SIZE;
}

/** Returns the select's own option code (`"01"` → `"1"`), or null for a code the list does not offer */
export function sanitizeStoreListPrefecture(prefecture: string | null): string | null {
  const code = normalizePrefectureCode(prefecture);
  return PREFECTURE_OPTIONS.some((option) => option.code === code) ? code : null;
}

export function sanitizeStoreListCompany(company: string | null): string | null {
  return company === DIRECT_MANAGEMENT_COMPANY_ID || (company && UUID_PATTERN.test(company))
    ? company
    : null;
}
