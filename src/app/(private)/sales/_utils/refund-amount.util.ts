/** A whole-yen refund amount typed as half-width digits, else null (取引一覧 + 請求詳細 refund dialogs) */
export function parseRefundAmount(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}
