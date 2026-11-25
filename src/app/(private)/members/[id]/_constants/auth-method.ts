/**
 * 認証方法 (gate authentication method) labels for the member-detail screens.
 *
 * Neutral location: both the 基本情報 tab (入退館設定カード) and the 利用履歴 tab
 * (入退館履歴テーブル) read from here, so the two never drift apart.
 *
 * The keys are the API enum (`AccessAuthMethod` in `member.schema.ts`), which
 * mirrors the backend design doc's `authChannel` enum and the vocabulary the
 * shared B-01 入退館履歴 screen already uses. API payloads carry the enum key
 * only — Japanese labels are resolved here.
 */
const AUTH_METHOD_LABELS = {
  qr: 'QRコード',
  nfc: 'ICカード',
  face: '顔認証',
  manual: '手動解錠',
} as const;

export type AuthMethodKey = keyof typeof AUTH_METHOD_LABELS;

/**
 * Resolve an auth-method enum key to its Japanese label; unknown keys pass through.
 *
 * Accepts null because the gate log's `authChannel` is `nullable: true` in Swagger ("null for
 * non-gate devices") while codegen drops the null from the generated union — it honours
 * `nullable` for a plain string (`storeName`) but not for one carrying an `enum`. The type
 * therefore cannot be trusted here; the null is handled at runtime instead.
 */
export function getAuthMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return AUTH_METHOD_LABELS[method as AuthMethodKey] ?? method;
}
