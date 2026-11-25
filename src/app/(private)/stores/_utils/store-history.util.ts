import { formatDate } from '@/utils/format.util';

import {
  STORE_BRAND_LABELS,
  STORE_GENDER_RESTRICTION_LABELS,
  STORE_STATUS_LABELS,
} from '../_constants/constants';
import { prefectureLabel } from '../_constants/store-prefecture.constant';

/** Shown for an empty before/after value */
export const HISTORY_EMPTY_VALUE = '—';

/**
 * 変更項目 for one field-level change. `StoreHistoryChangeDto.field` is the camelCase `stores`
 * column (the keys of `UpdateStoreDto`); a key missing here renders raw, so a column the backend
 * starts diffing later degrades visibly rather than silently.
 *
 * `territoryId` is listed although the control is Phase 2 (`TODO(round3) B1`): a history row
 * written by another client must still read as Japanese.
 */
export const STORE_HISTORY_FIELD_LABELS: Record<string, string> = {
  // The backend diffs both; the detail screen labels the group ブランド and `brandEnum`
  // サブブランド, so one brand change reads as a ブランド row plus a サブブランド row (BUG-U3-02)
  brandGroup: 'ブランド',
  brandEnum: 'サブブランド',
  name: '店舗名',
  clubCode: '店舗コード',
  nameKana: '店舗名（カナ）',
  status: 'ステータス',
  prefecture: '都道府県',
  postalCode: '郵便番号',
  area: 'エリアコード',
  address: '住所',
  phone: '電話番号',
  fax: 'FAX番号',
  email: 'メールアドレス',
  latitude: '緯度',
  longitude: '経度',
  accountCode: '会計コード',
  genderRestriction: '性別制限',
  receiptDate: '受付開始日',
  preopenDate: 'プレオープン日',
  grandOpenDate: '開店日',
  closedAt: '閉店日',
  hasStudioLesson: 'スタジオレッスン',
  hasPersonalTraining: 'パーソナルトレーニング',
  isPointConnected: 'ポイント連携',
  joiningReception: '入会受付',
  linkReception: '引き継ぎ受付',
  recessReception: '休会受付',
  withdrawalReception: '退会受付',
  temporaryRecessReception: '一時休会受付',
  isTransferBlocked: '移籍受入停止',
  fcCompanyId: '運営企業',
  territoryId: 'テリトリー',
  minorEntryAllowedStart: '18歳未満入館可能時間（開始）',
  minorEntryAllowedEnd: '18歳未満入館可能時間（終了）',
  companionWindowMinutes: '同伴者滞在可能時間（分）',
  memo: '備考',
  // `mutual_use_update` rows (相互利用設定, Y-02 Bug-No17): the backend diffs the mutual-use
  // settings under these keys. The acceptance flag is worded by brand on the access-settings tab
  // (どこでもJOYの受入 / 相互利用オプション（¥500）の受入), so history uses the neutral name.
  isAcceptEnabled: '相互利用の受入',
  payLaterEnabled: '1日単位の後払い設定',
  yogaUsageFee: 'YOGA利用料金（1日・税別）',
  acceptPeriodStart: '受入可能期間（開始日）',
  acceptPeriodEnd: '受入可能期間（終了日）',
};

const DATE_FIELDS = new Set([
  'receiptDate',
  'preopenDate',
  'grandOpenDate',
  'closedAt',
  'acceptPeriodStart',
  'acceptPeriodEnd',
]);

/** Mutual-use switches read ON/OFF (as on the settings sheet) rather than the column あり/なし */
const ON_OFF_FIELDS = new Set(['isAcceptEnabled', 'payLaterEnabled']);

/** Yen amounts, shown like the access-settings tab (¥4,000) */
const YEN_FIELDS = new Set(['yogaUsageFee']);

const RECEPTION_FIELDS = new Set(['joiningReception', 'linkReception']);

/**
 * One before/after value as display text. The wire carries the raw column value, so enum and code
 * columns are run through the same label tables the rest of the screen uses; an unknown enum value
 * keeps its raw text. `fcCompanyId` is not handled here — it needs a lookup (see the history tab).
 */
export function formatStoreHistoryValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return HISTORY_EMPTY_VALUE;
  if (typeof value === 'boolean') {
    // Y-02 FR-002 受付設定 — the same 受付 / 停止 wording as the form switch and the detail card
    if (RECEPTION_FIELDS.has(field)) return value ? '受付' : '停止';
    if (ON_OFF_FIELDS.has(field)) return value ? 'ON' : 'OFF';
    return value ? 'あり' : 'なし';
  }
  if (typeof value === 'number') {
    return YEN_FIELDS.has(field) ? `¥${value.toLocaleString()}` : String(value);
  }
  if (typeof value !== 'string') return JSON.stringify(value);

  if (field === 'status')
    return STORE_STATUS_LABELS[value as keyof typeof STORE_STATUS_LABELS] ?? value;
  if (field === 'brandEnum')
    return STORE_BRAND_LABELS[value as keyof typeof STORE_BRAND_LABELS] ?? value;
  if (field === 'genderRestriction') {
    return (
      STORE_GENDER_RESTRICTION_LABELS[value as keyof typeof STORE_GENDER_RESTRICTION_LABELS] ??
      value
    );
  }
  if (field === 'prefecture') return prefectureLabel(value) || value;
  if (DATE_FIELDS.has(field)) return formatDate(value, value);
  return value;
}
