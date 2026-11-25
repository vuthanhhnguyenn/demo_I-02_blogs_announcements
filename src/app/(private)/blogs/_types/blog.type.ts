import type { PatchCrmNoticesByIdData, PostCrmNoticesData } from '@/lib/api/types.gen';

import type {
  NoticeBrandCode,
  NoticeBrandScope,
  NoticeChannel,
  NoticeDetail,
  NoticeDisplayStatus,
  NoticeQuery,
  NoticeRow,
  NoticeSortKey,
  NoticeSortOrder,
  NoticeWpSyncStatus,
} from './notice.type';

// List types live in notice.type.ts (shared with /announcements); blog names kept as aliases.
export type BlogQuery = NoticeQuery;
export type BlogRow = NoticeRow;
export type BlogBrandScope = NoticeBrandScope;
export type BlogBrandCode = NoticeBrandCode;
export type BlogChannel = NoticeChannel;
export type BlogSortKey = NoticeSortKey;
export type BlogSortOrder = NoticeSortOrder;
export type BlogWpSyncStatus = NoticeWpSyncStatus;
export type BlogDisplayStatus = NoticeDisplayStatus;
export type BlogDetail = NoticeDetail;

/** 対象ブランド checkbox ids of the form (specs/blog-form data-model `brands`). */
export type BlogFormBrandId =
  | 'joyfitAll'
  | 'Joyfit'
  | 'Joyfit24'
  | 'JoyfitYoga'
  | 'JoyfitPlus'
  | 'Fit365';

/** 公開方法 (data-model `publishMethod`); `keepUnpublished` only in edit for 非公開 articles (research F6). */
export type BlogPublishMethod = 'now' | 'scheduled' | 'draft' | 'keepUnpublished';

export interface BlogPublishMethodOption {
  value: BlogPublishMethod;
  label: string;
  description: string;
}

/** Request body of `POST /crm/notices` (specs/blog-form contracts). */
export type BlogCreateBody = NonNullable<PostCrmNoticesData['body']>;

/** Request body of `PATCH /crm/notices/{id}`. */
export type BlogUpdateBody = NonNullable<PatchCrmNoticesByIdData['body']>;

/** Mock-only creator / editor seam (research F2 BF-02); dropped in Phase 2. */
export type BlogOperator = NonNullable<BlogCreateBody['operator']>;
