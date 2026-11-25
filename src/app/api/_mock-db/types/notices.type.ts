import type { NoticeBrandCode, NoticeDetail, NoticeType } from '@/app/api/_schemas/notice.schema';

/**
 * Stored row: the detail shape (specs/blog-detail data-model). `categoryName` is resolved from
 * the article-category table and `targetStoreIds` derived from `targetStores` at request time.
 * The list route narrows it back to `NoticeListItem` (no body / logs / names).
 */
export type NoticeRecord = Omit<NoticeDetail, 'categoryName' | 'targetStoreIds'>;

/** Entry of the notice store directory (real dev store ids, research R3). */
export type NoticeStore = {
  id: string;
  name: string;
  brandEnum: NoticeBrandCode;
};

export type NoticesType = {
  _rows: NoticeRecord[];
  _seeded: boolean;
  _seed(): void;
  getList(): NoticeRecord[];
  getById(id: string): NoticeRecord | undefined;
  add(record: NoticeRecord): NoticeRecord;
  /** Next `BL-YYYY-NNNN` / `AN-YYYY-NNNN` for the type + year (max existing + 1). */
  nextArticleNo(type: NoticeType, year: number): string;
  update(id: string, patch: Partial<NoticeRecord>): NoticeRecord | null;
  getStoreById(id: string): NoticeStore | undefined;
};
