import { NOTICE_STORE_DIRECTORY, SEED_NOTICES } from '@/app/api/_mock-db/seeds/notice.seed';
import type { NoticeRecord, NoticeStore, NoticesType } from '@/app/api/_mock-db/types/notices.type';
import type {
  NoticeBrandCode,
  NoticeDetail,
  NoticeListItem,
  NoticeTargetStore,
  NoticeType,
  NoticeWordpressSyncDetail,
} from '@/app/api/_schemas/notice.schema';

/**
 * List row: stored record narrowed to the list shape (real list omits body / sync logs; names are
 * detail-only gaps) + `categoryName` resolved by the caller from the category table.
 */
export function enrichNotice(row: NoticeRecord, categoryName: string | null): NoticeListItem {
  return {
    id: row.id,
    type: row.type,
    articleNo: row.articleNo,
    title: row.title,
    categoryId: row.categoryId,
    thumbnailS3Key: row.thumbnailS3Key,
    thumbnailUrl: row.thumbnailUrl,
    brandScope: row.brandScope,
    brandCode: row.brandCode,
    subBrandCodes: row.subBrandCodes,
    storeScope: row.storeScope,
    targetStores: row.targetStores,
    channelWeb: row.channelWeb,
    channelApp: row.channelApp,
    publishStatus: row.publishStatus,
    publishStartAt: row.publishStartAt,
    publishEndAt: row.publishEndAt,
    wordpressSync: row.wordpressSync
      ? { status: row.wordpressSync.status, syncedAt: row.wordpressSync.syncedAt }
      : null,
    deletedAt: row.deletedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    categoryName,
  };
}

/** Detail response (GET /crm/notices/{id}): full record + `categoryName` + `targetStoreIds`. */
/**
 * Gap AF-01: an お知らせ may have an empty body; a blog may not (unchanged blog rule). Editor HTML
 * such as `<p><br></p>` counts as empty.
 */
export function isNoticeBodyMissing(type: NoticeRecord['type'], body: string): boolean {
  if (type !== 'blog') return false;
  return (
    body
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length === 0
  );
}

export function enrichNoticeDetail(row: NoticeRecord, categoryName: string | null): NoticeDetail {
  return {
    ...row,
    categoryName,
    targetStoreIds: row.targetStores.map((store) => store.id),
  };
}

/** Brand family of a store / sub-brand code (research R2). */
function brandFamilyOf(code: NoticeBrandCode): 'Joyfit' | 'Fit365' {
  return code === 'Fit365' ? 'Fit365' : 'Joyfit';
}

/**
 * "Reaches store X" (FR-014, data-model): company rows; brand rows of X's family whose
 * sub-brand list is null or contains X's sub-brand; store rows targeting X.
 * `store.brandEnum` is null when X is not in the directory (only company + store rows match).
 */
export function reachesStore(
  row: NoticeRecord,
  store: { id: string; brandEnum: NoticeBrandCode | null },
): boolean {
  if (row.brandScope === 'company') return true;
  if (row.brandScope === 'store') return row.targetStores.some((target) => target.id === store.id);
  if (!store.brandEnum || row.brandCode !== brandFamilyOf(store.brandEnum)) return false;
  return row.subBrandCodes === null || row.subBrandCodes.includes(store.brandEnum);
}

/**
 * Brand filter (Clarification Q3, research R2): `Joyfit` / `Fit365` → every row of that family;
 * a JOYFIT sub-brand → JOYFIT rows whose sub-brand list is null or contains it. 全社 never matches.
 */
export function matchesBrandFilter(row: NoticeRecord, code: NoticeBrandCode): boolean {
  if (row.brandScope === 'company' || row.brandCode === null) return false;
  if (code === 'Joyfit' || code === 'Fit365') return row.brandCode === code;
  return (
    row.brandCode === 'Joyfit' && (row.subBrandCodes === null || row.subBrandCodes.includes(code))
  );
}

// -- Create / update helpers (specs/blog-form research F1 / F2) --

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** ISO datetime in JST with an explicit offset (same format as the seed: `…T10:00:00+09:00`). */
export function toJstIso(date: Date): string {
  return `${new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`;
}

/** Calendar year in JST (article numbers restart each JST year). */
export function jstYear(date: Date): number {
  return new Date(date.getTime() + JST_OFFSET_MS).getUTCFullYear();
}

/** Mock thumbnail URL for an S3 key (the uploads mock serves `https://cdn.mock.example.com/<key>`). */
export function noticeThumbnailUrl(s3Key: string | null): string | null {
  if (!s3Key) return null;
  return s3Key.startsWith('http') ? s3Key : `https://cdn.mock.example.com/${s3Key}`;
}

/**
 * Stored `targetStores`: the mock-only `{id,name}` seam (BF-01) when sent, otherwise the real
 * `targetStoreIds` named from the store directory (unknown ids keep the id as name).
 */
export function resolveTargetStores(
  targetStores: NoticeTargetStore[] | undefined,
  targetStoreIds: string[] | undefined,
): NoticeTargetStore[] {
  if (targetStores) return targetStores.map((store) => ({ id: store.id, name: store.name }));
  return (targetStoreIds ?? []).map((id) => ({
    id,
    name: NOTICE_STORE_DIRECTORY.find((store) => store.id === id)?.name ?? id,
  }));
}

/**
 * Server-derived publish fields: draft → no start; published without start → now;
 * `wordpressSync` pending when WEB is on and the row is published / unpublished, else null.
 */
export function deriveNoticePublishFields(
  row: Pick<NoticeRecord, 'publishStatus' | 'publishStartAt' | 'channelWeb' | 'wordpressSync'>,
  nowIso: string,
): Pick<NoticeRecord, 'publishStartAt' | 'wordpressSync'> {
  const publishStartAt =
    row.publishStatus === 'draft'
      ? null
      : row.publishStatus === 'published'
        ? (row.publishStartAt ?? nowIso)
        : row.publishStartAt;
  const isSyncTarget =
    row.channelWeb && (row.publishStatus === 'published' || row.publishStatus === 'unpublished');
  const wordpressSync: NoticeWordpressSyncDetail | null = isSyncTarget
    ? {
        status: 'pending',
        syncedAt: row.wordpressSync?.syncedAt ?? null,
        errorMessage: null,
        attemptCount: 0,
      }
    : null;
  return { publishStartAt, wordpressSync };
}

/**
 * Cross-field rules of the real create / update descriptions, run on the (merged) row.
 * Returns the 422 message, or null when valid. `checkScheduledStart` is false on a PATCH that
 * touches neither the status nor the start, so editing a scheduled article whose time has
 * passed does not fail on fields the caller did not send.
 */
export function validateNoticeWrite(
  row: Pick<
    NoticeRecord,
    | 'brandScope'
    | 'brandCode'
    | 'subBrandCodes'
    | 'storeScope'
    | 'targetStores'
    | 'channelWeb'
    | 'channelApp'
    | 'publishStatus'
    | 'publishStartAt'
    | 'publishEndAt'
  >,
  now: Date,
  checkScheduledStart = true,
): string | null {
  if (!row.channelWeb && !row.channelApp) {
    return 'WEBサイト・モバイルアプリのいずれか1つ以上を選択してください';
  }

  if (row.brandCode !== null && row.brandCode !== 'Joyfit' && row.brandCode !== 'Fit365') {
    return 'brandCode には Joyfit または Fit365 を指定してください';
  }
  if (row.subBrandCodes !== null) {
    // E-NTC-003: an empty list is rejected (null = whole brand).
    if (row.subBrandCodes.length === 0) return '対象サブブランドを1つ以上指定してください';
    if (row.brandCode !== 'Joyfit' || row.subBrandCodes.includes('Fit365')) {
      return 'サブブランドは JOYFIT のブランドにのみ指定できます';
    }
  }

  if (row.brandScope === 'company') {
    if (row.brandCode !== null || row.subBrandCodes !== null) {
      return '全社配信ではブランドを指定できません';
    }
    if (row.storeScope !== 'all' || row.targetStores.length > 0) {
      return '全社配信では店舗を指定できません';
    }
  } else if (row.brandScope === 'brand') {
    if (row.brandCode === null) return '対象ブランドを1つ以上選択してください';
    if (row.storeScope !== 'all' || row.targetStores.length > 0) {
      return 'ブランド指定では店舗を指定できません';
    }
  } else if (row.storeScope !== 'specific' || row.targetStores.length === 0) {
    return '対象店舗を1つ以上選択してください';
  }

  // E-NTC-009
  if (row.publishStatus === 'scheduled' && checkScheduledStart) {
    if (!row.publishStartAt || Date.parse(row.publishStartAt) <= now.getTime()) {
      return '公開日時は現在より後の日時を指定してください';
    }
  }
  if (
    row.publishStartAt &&
    row.publishEndAt &&
    Date.parse(row.publishEndAt) <= Date.parse(row.publishStartAt)
  ) {
    return '公開終了日時は公開開始日時より後の日時を指定してください';
  }

  return null;
}

export function createNoticeTables(): { notices: NoticesType } {
  return {
    notices: {
      _rows: [],
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        this._rows = SEED_NOTICES.map((row) => ({
          ...row,
          subBrandCodes: row.subBrandCodes ? [...row.subBrandCodes] : null,
          targetStores: row.targetStores.map((store) => ({ ...store })),
          wordpressSync: row.wordpressSync ? { ...row.wordpressSync } : null,
          recentSyncLogs: row.recentSyncLogs.map((log) => ({ ...log })),
        }));
      },
      getList(): NoticeRecord[] {
        this._seed();
        return [...this._rows];
      },
      getById(id: string): NoticeRecord | undefined {
        this._seed();
        return this._rows.find((row) => row.id === id);
      },
      add(record: NoticeRecord): NoticeRecord {
        this._seed();
        this._rows.push(record);
        return record;
      },
      nextArticleNo(type: NoticeType, year: number): string {
        this._seed();
        const prefix = `${type === 'blog' ? 'BL' : 'AN'}-${year}-`;
        const maxSeq = this._rows.reduce((max, row) => {
          if (!row.articleNo.startsWith(prefix)) return max;
          const seq = Number(row.articleNo.slice(prefix.length));
          return Number.isFinite(seq) && seq > max ? seq : max;
        }, 0);
        return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
      },
      update(id: string, patch: Partial<NoticeRecord>): NoticeRecord | null {
        this._seed();
        const index = this._rows.findIndex((row) => row.id === id);
        if (index === -1) return null;
        const updated: NoticeRecord = { ...this._rows[index], ...patch, id };
        this._rows[index] = updated;
        return updated;
      },
      getStoreById(id: string): NoticeStore | undefined {
        return NOTICE_STORE_DIRECTORY.find((store) => store.id === id);
      },
    },
  };
}
