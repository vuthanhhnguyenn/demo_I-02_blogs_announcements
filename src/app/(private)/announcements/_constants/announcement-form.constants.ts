import type {
  BlogFormBrandId,
  BlogPublishMethod,
  BlogPublishMethodOption,
} from '@/app/(private)/blogs/_types/blog.type';
import type { NoticeBrandCode, NoticeBrandScope } from '@/app/(private)/blogs/_types/notice.type';

import { UserRole } from '@/types/permission.type';

// Constants of お知らせ新規登録 / 編集 (specs/announcement-form). Copied from the form part of
// blogs/_constants/blog.constants.ts (approach 3: copy, the blog form stays untouched) and adapted to
// the prototype announcement-form.tsx@47d60ac.

export const ANNOUNCEMENT_FORM_CREATE_TITLE = 'お知らせ新規登録';
export const ANNOUNCEMENT_FORM_EDIT_TITLE = 'お知らせ編集';
export const ANNOUNCEMENT_FORM_BACK_LABEL = 'お知らせ管理に戻る';

/** Edit-mode notice, only for announcements published at least once (prototype L237, Q3). */
export const ANNOUNCEMENT_FORM_EDIT_NOTICE =
  '通知送信済みのお知らせを編集すると、送信済みの内容と画面表示が異なる状態になります。';

/** 対象ブランド checkbox ids (same values as the blog form); V0 order (prototype L82-L89). */
export const ANNOUNCEMENT_FORM_BRAND_IDS = [
  'joyfitAll',
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
] as const satisfies readonly BlogFormBrandId[];

export const ANNOUNCEMENT_FORM_BRAND_OPTIONS: ReadonlyArray<{
  id: BlogFormBrandId;
  label: string;
}> = [
  { id: 'joyfitAll', label: 'JOYFIT全体' },
  { id: 'Joyfit', label: 'JOYFIT' },
  { id: 'Joyfit24', label: 'JOYFIT24' },
  { id: 'JoyfitYoga', label: 'JOYFIT YOGA' },
  { id: 'JoyfitPlus', label: 'JOYFIT+' },
  { id: 'Fit365', label: 'FIT365' },
];

/** Brand codes each checkbox stands for (reach estimate; JOYFIT全体 = every JOYFIT sub-brand). */
export const ANNOUNCEMENT_FORM_BRAND_CODES: Record<BlogFormBrandId, NoticeBrandCode[]> = {
  joyfitAll: ['Joyfit', 'Joyfit24', 'JoyfitYoga', 'JoyfitPlus'],
  Joyfit: ['Joyfit'],
  Joyfit24: ['Joyfit24'],
  JoyfitYoga: ['JoyfitYoga'],
  JoyfitPlus: ['JoyfitPlus'],
  Fit365: ['Fit365'],
};

/** 配信範囲 radio cards (prototype L343-L413). */
export const ANNOUNCEMENT_FORM_SCOPE_OPTIONS: ReadonlyArray<{
  value: NoticeBrandScope;
  label: string;
  description: string;
}> = [
  { value: 'company', label: '全社配信', description: '全ブランド・全店舗の会員に配信' },
  { value: 'brand', label: 'ブランド指定', description: '選択したブランドの全店舗に配信' },
  { value: 'store', label: '店舗指定', description: '特定の店舗の会員に配信' },
];

/** Roles that may use 全社配信 / ブランド指定 (inherited blog-form Q1); Staff gets 店舗指定 only. */
export const ANNOUNCEMENT_WIDE_SCOPE_ROLES = [
  UserRole.System,
  UserRole.Headquarter,
  UserRole.Manager,
];

/** Right-aligned note on a disabled scope card (prototype L353). */
export const ANNOUNCEMENT_FORM_SCOPE_COMPANY_NOTE = 'Manager以上の権限が必要です';

/** Edit: a Staff author on a Manager-only scope — the target is read-only (inherited). */
export const ANNOUNCEMENT_FORM_TARGET_LOCKED_NOTE = '配信対象はManager以上のみ変更できます';

/** 店舗 panel note when the user has no targetable store (saving is disabled). */
export const ANNOUNCEMENT_FORM_NO_STORES_NOTE = '選択できる店舗がありません';

/** 全社配信 warning (prototype L432-L439; description only). */
export const ANNOUNCEMENT_FORM_COMPANY_WARNING =
  '全ブランド・全店舗の会員にお知らせが配信されます。内容を十分に確認してから配信してください。';

/** 公開方法 values; `keepUnpublished` only in edit for 非公開 announcements (inherited Q3). */
export const ANNOUNCEMENT_PUBLISH_METHODS = [
  'now',
  'scheduled',
  'draft',
  'keepUnpublished',
] as const satisfies readonly BlogPublishMethod[];

/** Radio label + description per method (prototype L499-L514). */
export const ANNOUNCEMENT_PUBLISH_METHOD_OPTIONS: Record<
  BlogPublishMethod,
  BlogPublishMethodOption
> = {
  now: { value: 'now', label: '即時公開', description: '保存と同時に公開されます' },
  scheduled: {
    value: 'scheduled',
    label: '予約公開',
    description: '指定した日時に自動公開されます',
  },
  draft: { value: 'draft', label: '下書き保存', description: '公開せずに保存します' },
  keepUnpublished: {
    value: 'keepUnpublished',
    label: '非公開のまま保存',
    description: '公開状態を変えずに保存します',
  },
};

/** Save button label per method (prototype L550). */
export const ANNOUNCEMENT_SAVE_LABELS: Record<BlogPublishMethod, string> = {
  now: '公開する',
  scheduled: '予約公開する',
  draft: '下書き保存する',
  keepUnpublished: '保存する',
};

/** Success toast per method (prototype L177-L183). */
export const ANNOUNCEMENT_SAVE_SUCCESS_TOASTS: Record<BlogPublishMethod, string> = {
  now: 'お知らせを公開しました',
  scheduled: 'お知らせを予約公開として保存しました',
  draft: 'お知らせを下書きとして保存しました',
  keepUnpublished: 'お知らせを保存しました',
};

/** Footer summary when a submit failed validation (prototype L542). */
export const ANNOUNCEMENT_FORM_ERROR_SUMMARY = '未入力の項目があります';

export const ANNOUNCEMENT_TITLE_PLACEHOLDER = '例: 春のキャンペーンのお知らせ';
export const ANNOUNCEMENT_THUMBNAIL_HINT = 'PNG, JPG (最大5MB)';

/** 本文 toolbar heading select (same as the blog editor); `normal` = no header format. */
export const ANNOUNCEMENT_BODY_HEADING_OPTIONS = [
  { value: 'normal', label: '標準' },
  { value: '1', label: '見出し1' },
  { value: '2', label: '見出し2' },
];

export const ANNOUNCEMENT_BODY_PLACEHOLDER = 'お知らせの本文を入力してください';

/** Preview placeholders while the form is empty (prototype L595-L597). */
export const ANNOUNCEMENT_PREVIEW_TITLE_PLACEHOLDER = 'お知らせタイトル';
export const ANNOUNCEMENT_PREVIEW_BODY_PLACEHOLDER = 'お知らせの本文がここに表示されます...';

/** 対象（推計） card copy (prototype L441-L458). */
export const ANNOUNCEMENT_REACH_ESTIMATE_COPY = {
  label: '対象（推計）',
  memberUnit: '名',
  noBrand: 'ブランド未選択',
  noStore: '店舗未選択',
  allStores: (total: number) => `全${total}店舗`,
  brandStores: (target: number) => `${target}店舗`,
  someStores: (target: number, total: number) => `${target}/${total}店舗`,
} as const;
