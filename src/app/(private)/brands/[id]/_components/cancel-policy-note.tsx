import { Info } from 'lucide-react';

/**
 * G-05 MOD-09 — the fixed refund rule, shown on every fee card (plan B7).
 *
 * It sits outside the 費用マスタ section, so it stays when the master is deleted: only the
 * section's contents go. Shared by registered and 未登録 cards.
 */
export function CancelPolicyNote() {
  return (
    <p className="text-muted-foreground flex items-center gap-1 text-xs">
      <Info className="size-3 shrink-0" />
      キャンセルポリシー：申請日〜利用開始日のキャンセルのみ全額返金可・利用開始後は返金不可
    </p>
  );
}
