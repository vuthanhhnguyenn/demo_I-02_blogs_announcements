export const PAGE_SIZE = 25;
export const TEXT_MAX_LENGTH = 255;
/**
 * メールアドレス入力の上限。RFC 5321 Errata 1690（254文字）および BE のスキーマ定義
 * （OpenAPI の staff email `maxLength: 254`）に合わせる。共通の TEXT_MAX_LENGTH (255) は
 * メールアドレスには使わず、必ずこの値を使う。
 */
export const EMAIL_MAX_LENGTH = 254;
/**
 * Cognito（経路②）にユーザー名として直接渡すメールアドレスの上限。Cognito の username は
 * 最大128文字で、超過すると `InvalidParameterException` になる（API-070 §3.5.6）。
 * Cognito を直接呼ぶ画面（ログイン・パスワード再設定）の入力にだけ使い、それ以外は
 * `EMAIL_MAX_LENGTH` を使う。
 */
export const COGNITO_EMAIL_MAX_LENGTH = 128;
export const TEXTAREA_MAX_LENGTH = 1000;
export const NAME_MAX_LENGTH = 50;
export const REASON_MAX_LENGTH = 500;
export const NOTE_MAX_LENGTH = TEXTAREA_MAX_LENGTH;
/**
 * Rows accepted by one bulk staff invitation
 * (`InviteStaffBulkRequestDto.staff` — `minItems: 1`, `maxItems: 50`).
 */
export const STAFF_BULK_INVITE_MAX_ROWS = 50;
/**
 * Page-size options for lists served by the real API. Capped at 100 because every
 * paginated real endpoint declares `limit` `maximum: 100` — `GET /admin/staff`,
 * `/admin/staff/{id}/login-histories` and `/admin/staff/{id}/change-histories` all
 * answer `400 E-VAL-001` above it. The prototype's 200件 option (parity PAR041) is
 * therefore not offered: the FE follows the backend contract
 * (BUG-P2-01-01 / BUG-P2-05-04, decided 2026-09-21).
 */
export const API_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const TEXT_EDITOR_MAX_LENGTH = 10000;
export const CAPACITY_MAX_SIZE = 500;
export const PREFECTURES = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
];
