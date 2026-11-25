'use client';

// Client component: dialog local state and React Query mutation require the browser.
import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { adminReceivableControllerIssueKonbiniMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { KonbiniIssueResponseDto } from '@/lib/api-real/types.gen';

import { formatYen } from '../../_constants/sales-labels.constant';
import {
  type ReceivableBillingTarget,
  formatDateTime,
  invalidateReceivableQueries,
} from '../_utils/receivable-status.util';

type SendChannel = 'sms' | 'email';

const SEND_CHANNEL_OPTIONS: Array<{ value: SendChannel; label: string }> = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'メール' },
];

interface ConveniencePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  /** Display 会員ID (FR-008 dialog copy) */
  memberNumber: string;
  /**
   * D6: oldest unpaid billing first (path `billingId`), the rest go to `additionalBillingIds`
   * (≤ 11, BR-RCV-008).
   */
  billings: ReceivableBillingTarget[];
}

export function ConveniencePaymentDialog({
  open,
  onOpenChange,
  memberName,
  memberNumber,
  billings,
}: Readonly<ConveniencePaymentDialogProps>) {
  const [isIssuing, setIsIssuing] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing mid-issue would lose the payment number (re-issue is blocked by E-RCV-004)
        if (!next && isIssuing) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-120">
        {open && (
          // Remounted per open so the channels, idempotency key and result start fresh
          <ConveniencePaymentForm
            memberName={memberName}
            memberNumber={memberNumber}
            billings={billings}
            onIssuingChange={setIsIssuing}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ConveniencePaymentFormProps {
  memberName: string;
  memberNumber: string;
  billings: ReceivableBillingTarget[];
  onIssuingChange: (issuing: boolean) => void;
  onClose: () => void;
}

function ConveniencePaymentForm({
  memberName,
  memberNumber,
  billings,
  onIssuingChange,
  onClose,
}: Readonly<ConveniencePaymentFormProps>) {
  const queryClient = useQueryClient();
  // API-117 §7.2: one key per issue attempt, so a double click / retry never issues twice
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  // `sendChannels` is required (1–2). Both are offered by default: a channel without a contact on
  // file is reported `skipped`; only when none has one does the call fail (E-RCV-007).
  const [channels, setChannels] = useState<SendChannel[]>(['sms', 'email']);
  const [result, setResult] = useState<KonbiniIssueResponseDto | null>(null);

  // Error toasts come from the shared MutationCache (D15)
  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminReceivableControllerIssueKonbiniMutation(),
    onMutate: () => onIssuingChange(true),
    onSettled: () => {
      release();
      onIssuingChange(false);
    },
    onSuccess: (data) => {
      invalidateReceivableQueries(queryClient);
      toast.success('コンビニ決済の払込番号を発行しました');
      setResult(data);
    },
  });

  const [primary, ...additional] = billings;
  const totalAmount = billings.reduce((sum, billing) => sum + billing.amount, 0);

  const toggleChannel = (channel: SendChannel, checked: boolean) => {
    setChannels((current) =>
      checked ? [...new Set([...current, channel])] : current.filter((value) => value !== channel),
    );
  };

  const handleIssue = () => {
    if (!primary || !acquire()) return;
    mutation.mutate({
      path: { billingId: primary.billingId },
      headers: { 'idempotency-key': idempotencyKey },
      body: {
        sendChannels: channels,
        additionalBillingIds:
          additional.length > 0 ? additional.map((billing) => billing.billingId) : undefined,
      },
    });
  };

  if (result) {
    const skipped = Object.values(result.notificationStatus).some(
      (channel) => channel?.status === 'skipped',
    );
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-base">コンビニ決済 発行完了</DialogTitle>
          <DialogDescription>
            {memberName} のコンビニ決済の払込番号を発行しました。
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y overflow-hidden rounded-md border text-xs">
          <ResultRow label="払込番号" value={result.paymentCode} mono />
          {result.cvsPayData1 && (
            <ResultRow label="収納会社別番号1" value={result.cvsPayData1} mono />
          )}
          {result.cvsPayData2 && (
            <ResultRow label="収納会社別番号2" value={result.cvsPayData2} mono />
          )}
          {/* API-117 §7.5 (v0.5 number-only notice): `paymentUrl` is null unless an URL is issued */}
          {result.paymentUrl && (
            <div className="grid grid-cols-[120px_1fr]">
              <span className="bg-muted/40 text-muted-foreground px-3 py-2">支払URL</span>
              <a
                href={result.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary px-3 py-2 break-all hover:underline hover:underline-offset-2"
              >
                {result.paymentUrl}
              </a>
            </div>
          )}
          <ResultRow label="支払金額" value={formatYen(result.totalAmount)} />
          <ResultRow label="支払期限" value={formatDateTime(result.expiresAt)} />
        </div>
        {skipped && (
          <p className="text-warning text-xs">
            ※ 一部の送信チャネルは送信されていません。払込番号を会員へお伝えください。
          </p>
        )}
        <DialogFooter>
          <Button onClick={onClose}>閉じる</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base">コンビニ決済URL発行</DialogTitle>
        <DialogDescription>
          {memberName}（{memberNumber}）にコンビニ決済の支払いURLを発行します。
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="bg-muted/50 space-y-1 rounded-md p-3 text-xs">
          <p className="text-muted-foreground">処理内容</p>
          <p>
            {/* The konbini PSP is SBPS (API-117 scope note — FR-006's JACCS wording is wrong, Otaki
                2026-07-02); delivery is per channel and may come back `skipped` */}
            SBPS
            経由でコンビニ支払い用の払込番号を発行し、選択したチャネルで会員に案内します。送信されなかった場合は、発行後に表示される払込番号を会員へお伝えください。
          </p>
        </div>
        <div className="bg-muted/50 space-y-1 rounded-md p-3 text-xs">
          <p className="text-muted-foreground">
            対象請求 {billings.length}件（合計 {formatYen(totalAmount)}）
          </p>
          {billings.map((billing) => (
            <div key={billing.billingId} className="flex justify-between">
              <span>{billing.targetMonth}分</span>
              <span className="tabular-nums">{formatYen(billing.amount)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium">
            案内送信チャネル <span className="text-destructive">*</span>
          </p>
          <div className="flex gap-4">
            {SEND_CHANNEL_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`konbini-channel-${option.value}`}
                  checked={channels.includes(option.value)}
                  onCheckedChange={(checked) => toggleChannel(option.value, checked === true)}
                />
                <Label htmlFor={`konbini-channel-${option.value}`} className="text-xs">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {channels.length === 0 && (
            <p className="text-destructive text-xs">送信チャネルを1つ以上選択してください</p>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          ※ 支払い確認後、入出金明細に入金レコードが追加され、未回収フラグが解除されます。
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>
          キャンセル
        </Button>
        <Button
          disabled={mutation.isPending || !primary || channels.length === 0}
          onClick={handleIssue}
        >
          URLを発行する
        </Button>
      </DialogFooter>
    </>
  );
}

function ResultRow({
  label,
  value,
  mono,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="grid grid-cols-[120px_1fr]">
      <span className="bg-muted/40 text-muted-foreground px-3 py-2">{label}</span>
      <span className={`px-3 py-2 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
