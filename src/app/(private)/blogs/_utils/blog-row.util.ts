import { BLOG_BRAND_LABELS, BLOG_TARGET_ALL_LABEL } from '../_constants/blog.constants';
import type { BlogRow } from '../_types/blog.type';
import { getTargetBrandCodes, scopedNoticeEditRoles } from './notice-row.util';

// Row helpers moved to notice-row.util.ts (shared with /announcements, research R1); re-exported
// here so blog importers are unchanged.
export {
  getDisplayStatus,
  getTargetBrandCodes,
  isOwnArticle,
  isWpSyncTarget,
} from './notice-row.util';
export const scopedBlogEditRoles = scopedNoticeEditRoles;

/** Plain-text 対象 (全ブランド・全店舗 / brand labels / brand labels + store names). */
export function getTargetLabel(row: BlogRow): string {
  if (row.brandScope === 'company') return BLOG_TARGET_ALL_LABEL;
  const brands = getTargetBrandCodes(row)
    .map((code) => BLOG_BRAND_LABELS[code])
    .join('・');
  if (row.brandScope !== 'store' || row.targetStores.length === 0) return brands;
  return `${brands} ${row.targetStores.map((store) => store.name).join('・')}`.trim();
}
