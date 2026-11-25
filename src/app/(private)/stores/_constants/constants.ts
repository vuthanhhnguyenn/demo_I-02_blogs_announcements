import type { StoreHistoryEntryDto } from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

/**
 * Note rendered wherever the UI keeps a control the real API cannot back yet.
 * Every use site carries a `TODO(round2) B<n>` comment naming its blocker.
 */
export const API_UNSUPPORTED_NOTE = 'API未対応';

/**
 * Brand, exactly as the wire carries it (`StoreSummaryDto.brandEnum`,
 * `CreateStoreDto.brandEnum`). The FE never re-cases an API value — decision D2.
 */
export const STORE_BRAND_VALUES = [
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
] as const;
export type StoreBrandEnum = (typeof STORE_BRAND_VALUES)[number];

/** Brand group, derived server-side from `brandEnum` and never sent by the FE (D2) */
export const STORE_BRAND_GROUPS = ['JOYFIT', 'FIT365'] as const;
export type StoreBrandGroup = (typeof STORE_BRAND_GROUPS)[number];

export const STORE_BRAND_LABELS: Record<StoreBrandEnum, string> = {
  Joyfit: 'JOYFIT',
  Fit365: 'FIT365',
  Joyfit24: 'JOYFIT24',
  JoyfitYoga: 'JOYFIT YOGA',
  JoyfitPlus: 'JOYFIT+',
};

/**
 * The brand select of the advanced-filter panel, in the prototype's own order — the JOYFIT family
 * first, FIT365 last (`store-list.tsx` L595-L607). `STORE_BRAND_LABELS` is a lookup, so its key
 * order is not the display order.
 */
export const STORE_BRAND_FILTER_OPTIONS: StoreBrandEnum[] = [
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
];

/** Badge styles — Tailwind palette (no raw hex) */
export const STORE_BRAND_BADGE_CLASSES: Record<StoreBrandEnum, string> = {
  Joyfit: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  Fit365: 'bg-pink-100 text-pink-700 border-pink-200',
  Joyfit24: 'bg-blue-100 text-blue-800 border-blue-200',
  JoyfitYoga: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  JoyfitPlus: 'bg-amber-100 text-amber-700 border-amber-200',
};

/**
 * Store lifecycle status — four independent states on the real master (D3).
 *
 * Y-02 FR-001 L119 still describes 「営業中/閉店」 only; that wording predates the 4-state master
 * the API ships (`StoreSummaryDto.status`), so the screen offers all four.
 */
export const STORE_STATUS_VALUES = [
  'preparing',
  'operating',
  'temporarily_closed',
  'closed',
] as const;
export type StoreStatus = (typeof STORE_STATUS_VALUES)[number];

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  preparing: '準備中',
  operating: '営業中',
  temporarily_closed: '休業中',
  closed: '閉店',
};

/**
 * Status card tone on the detail screen's basic-info tab — prototype `data/stores.ts`
 * (`getStoreStatusBadgeClass`): 準備中 info, 営業中 success, 休業中 warning, 閉店 muted.
 */
export const STORE_STATUS_TONES: Record<StoreStatus, 'info' | 'success' | 'warning' | 'muted'> = {
  preparing: 'info',
  operating: 'success',
  temporarily_closed: 'warning',
  closed: 'muted',
};

/** Badge / pill classes for the same four tones, on design tokens */
export const STORE_STATUS_BADGE_CLASSES: Record<StoreStatus, string> = {
  preparing: 'bg-info/10 text-info border-info/20',
  operating: 'bg-success/10 text-success border-success/20',
  temporarily_closed: 'bg-warning/10 text-warning border-warning/20',
  closed: 'bg-muted text-muted-foreground border-border',
};

/** Leading-dot colour of the status pill (detail header, StatusCard) */
export const STORE_STATUS_DOT_CLASSES: Record<StoreStatus, string> = {
  preparing: 'bg-info',
  operating: 'bg-success',
  temporarily_closed: 'bg-warning',
  closed: 'bg-muted-foreground',
};

/** The list's status filter — every status the master knows (FR-011) */
export const STORE_LIST_STATUS_FILTER_OPTIONS: { value: StoreStatus; label: string }[] =
  STORE_STATUS_VALUES.map((value) => ({ value, label: STORE_STATUS_LABELS[value] }));

/** Y-02 FR-002 gender restriction: mixed or women-only */
export const STORE_GENDER_RESTRICTION_VALUES = ['mixed', 'women_only'] as const;
export type StoreGenderRestriction = (typeof STORE_GENDER_RESTRICTION_VALUES)[number];

export const STORE_GENDER_RESTRICTION_LABELS: Record<StoreGenderRestriction, string> = {
  mixed: '混合',
  women_only: '女性専用',
};

/**
 * 変更項目 for a history entry without a field-level diff (decision D8) — `create` and the
 * event/scope actions, whose `changes[]` is empty (`mutual_use_update` too when only allowed
 * stores were added/removed). Entries with a diff label each changed field
 * instead (`STORE_HISTORY_FIELD_LABELS`).
 *
 * `StoreHistoryEntryDto.changeAction` is the backend's 17-value `store_change_action` enum (§13.3,
 * typed since the 2026-10-07 regen), so the table is exhaustive. The call site still falls back to
 * the raw value, so an action added before the next regen degrades visibly rather than silently.
 *
 * Note that exception days and temporary closures also record `business_hours_update` (the scope
 * is only in the snapshot), which is why the label covers both.
 */
export const STORE_CHANGE_ACTION_LABELS: Record<StoreHistoryEntryDto['changeAction'], string> = {
  create: '店舗登録',
  update: '基本情報',
  status_change: 'ステータス',
  fc_company_change: '運営企業',
  business_hours_update: '営業時間・営業カレンダー',
  attach_plan: '主契約の追加',
  detach_plan: '主契約の解除',
  attach_option: 'オプションの追加',
  detach_option: 'オプションの解除',
  one_day_pass_price_set: '1DayPass料金',
  mutual_use_update: '相互利用設定',
  delete: '店舗削除',
  restore: '店舗復元',
  migrate: 'データ移行',
  asset_assign: '資産の割当',
  asset_unassign: '資産の割当解除',
  territory_change: 'テリトリー',
};

/**
 * Length caps of the store write bodies that `app.constants` has no match for — read off the
 * backend's `createStoreSchema` / `setOneDayPassExceptionSchema` (`@fitness/zod-schemas`). Names,
 * kana and memo reuse `TEXT_MAX_LENGTH` (255) / `TEXTAREA_MAX_LENGTH` (1000).
 */
export const STORE_CLUB_CODE_MAX_LENGTH = 50;
export const STORE_POSTAL_CODE_MAX_LENGTH = 10;
export const STORE_ADDRESS_MAX_LENGTH = 500;
export const STORE_PHONE_MAX_LENGTH = 20;
export const ONE_DAY_PASS_NOTE_MAX_LENGTH = 200;

/** 電話番号 / FAX番号 input examples — shown as the placeholder and reused in the format error */
export const STORE_PHONE_EXAMPLE = '例: 03-1234-5678';
export const STORE_FAX_EXAMPLE = '例: 03-1234-5679';

/** "All …" labels of the advanced-filter panel — each one is that filter's default */
export const STORE_FILTER_ALL_LABELS = {
  brand: '全ブランド',
  prefecture: '全都道府県',
  company: '全運営企業',
  area: '全エリア',
  territory: '全テリトリー',
  status: '全ステータス',
} as const;

/** Direct management in the operating-company filter: a value of its own, not an FC company id (as in API-083) */
export const DIRECT_MANAGEMENT_COMPANY_ID = 'direct';

/** Label for a store with no territory assigned */
export const TERRITORY_UNSET_LABEL = '未設定';

/** The territory filter stays disabled until an area is chosen (Y-02 L132 two-tier cascade) */
export const TERRITORY_REQUIRES_AREA_TOOLTIP = '先にエリアを選択してください';

/**
 * Campaign section — what a denied role is told.
 *
 * Campaigns follow the "select store-use campaigns" row of the G-03 matrix: System / Headquarter /
 * Staff, which the mock endpoint enforces too (`CAMPAIGN_LINK_ROLES`) — spec `027-store-detail` FR-047.
 * The gate is the role tier alone, so naming the roles here stays truthful.
 *
 * The main-contract and option sections deliberately have no such constant: they gate on
 * `stores.config-contract`, which `PERMISSION_FLAG_RULES` can also deny over a 職位 flag
 * (`canManageStoreSetting`). Wording that blames the role would then be wrong for a Headquarter
 * user who simply was not granted the flag, so those buttons let `RoleGatedButton` derive the copy
 * from the denial reason instead.
 */
export const CAMPAIGN_LINK_DENY_TOOLTIP =
  'キャンペーンの利用設定はHQ/Systemまたは店舗スタッフのみ操作可能';

/**
 * 公開対象外 — a campaign not published to this store: the marker on a linked row (FR-041,
 * prototype store-detail.tsx L1233-1247) and the link drawer's block reason (FR-043)
 */
export const CAMPAIGN_PUBLISH_EXCLUDED_TOOLTIP =
  '本部の公開店舗設定で自店舗が対象になっていないため利用できません';

/**
 * Acceptance badge, shared by the campaign list and the link drawer of the contract-and-pricing
 * tab. Driven by `CampaignSummaryDto.acceptingStatus` (`campaignAcceptState`), which is the only
 * field that can express 上限到達 (G-03 FR-004).
 *
 * The colours follow `getCampaignAcceptBadge` in the prototype `store-detail.tsx`, where
 * "capacity reached" is a warning. Deliberately a different token from
 * `CAMPAIGN_ACCEPT_STATE_BADGE_CLASSES` (destructive) on the campaign management screen.
 */
export const STORE_CAMPAIGN_ACCEPT_STATES = ['accepting', 'stopped', 'capacity_reached'] as const;
export type StoreCampaignAcceptState = (typeof STORE_CAMPAIGN_ACCEPT_STATES)[number];

export const STORE_CAMPAIGN_ACCEPT_STATE_META: Record<
  StoreCampaignAcceptState,
  { label: string; className: string }
> = {
  accepting: { label: '受付中', className: 'bg-success/15 text-success border-success/20' },
  stopped: { label: '受付停止', className: 'bg-muted text-muted-foreground border-border' },
  capacity_reached: {
    label: '上限到達',
    className: 'bg-warning/15 text-warning border-warning/20',
  },
};

/** The "select store-use campaigns" row of the G-03 permission matrix */
export const CAMPAIGN_LINK_ROLES = [UserRole.System, UserRole.Headquarter, UserRole.Staff] as const;

/**
 * 1DayPass price setting (Y-02 permission matrix, spec `027-store-detail` FR-062) — System /
 * Headquarter / Staff, matching `ONE_DAY_PASS_EDIT_ROLES` on the endpoint. Not
 * `stores.config-contract`, which Staff lacks.
 */
export const ONE_DAY_PASS_EDIT_ROLES = [
  UserRole.System,
  UserRole.Headquarter,
  UserRole.Staff,
] as const;

/**
 * Y-02 FR-002 受付設定 (261112_v11) — what each switch gates on the app side. Shared by the store
 * form's switch rows and the detail screen's read-only card so both explain it in the same words.
 */
export const STORE_RECEPTION_DESCRIPTIONS = {
  joiningReception: 'ON の店舗だけを、アプリの新規入会・1Day・見学の店舗選択に表示します',
  linkReception:
    'ON の店舗を契約店舗とする会員だけが、アプリで既存会員の引き継ぎ（連携）をできます',
} as const;
