/** API-088 のエラーコード。ハンドリング分岐に使う。 */
export const CAMPAIGN_ERROR_CODE = {
  validation: 'E-VAL-001',
  codeDuplicate: 'E-CMP-015',
  notFound: 'E-CMP-001',
} as const;

type CampaignApiError = {
  code?: unknown;
  userMessage?: unknown;
  message?: unknown;
};

function asCampaignApiError(error: unknown): CampaignApiError | null {
  if (typeof error !== 'object' || error === null) return null;
  return error as CampaignApiError;
}

export function getCampaignErrorCode(error: unknown): string | null {
  const typed = asCampaignApiError(error);
  return typeof typed?.code === 'string' ? typed.code : null;
}

/** 利用者向けメッセージ。API が返す日本語文言をそのまま優先する。 */
export function getCampaignErrorMessage(error: unknown, fallback: string): string {
  const typed = asCampaignApiError(error);
  if (typeof typed?.userMessage === 'string' && typed.userMessage) return typed.userMessage;
  return fallback;
}

/** コード重複はフォームの該当フィールドに紐づけて表示する。 */
export function getCampaignCodeServerErrorMessage(error: unknown): string | null {
  if (getCampaignErrorCode(error) !== CAMPAIGN_ERROR_CODE.codeDuplicate) return null;
  return getCampaignErrorMessage(error, 'このコードは既に使われています');
}
