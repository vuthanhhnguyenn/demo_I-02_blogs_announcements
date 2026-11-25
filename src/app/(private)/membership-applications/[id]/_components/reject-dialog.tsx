'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { toSelectItems } from '@/utils/app.util';
import { Info } from 'lucide-react';

import { OptionalMark, RequiredMark } from '@/components/common/field-marker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { RejectApplicationDto } from '@/lib/api-real/types.gen';

import {
  BOUNDED_DIALOG_CLASS,
  BOUNDED_TEXTAREA_CLASS,
  REJECTION_REASON_OPTIONS,
} from '../../_constants/constants';
import { rejectSupplementSchema, textError } from '../../_schemas/application-text.schema';
import type { ApplicationDetail } from './membership-application.utils';

type RejectionReason = RejectApplicationDto['rejectReasonCode'];

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: ApplicationDetail['paymentMethod'];
  rejectReason: RejectionReason | '';
  onRejectReasonChange: (value: RejectionReason) => void;
  rejectSupplement: string;
  onRejectSupplementChange: (value: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function RejectDialog({
  open,
  onOpenChange,
  paymentMethod,
  rejectReason,
  onRejectReasonChange,
  rejectSupplement,
  onRejectSupplementChange,
  onConfirm,
  isPending,
}: Readonly<RejectDialogProps>) {
  // その他 needs a 補足 — the API answers E-VAL-001 without one (C-BUG-07).
  const supplementRequired = rejectReason === 'other';
  const supplementError = textError(rejectSupplementSchema, rejectSupplement.trim());
  const canConfirm =
    !!rejectReason && (!supplementRequired || !!rejectSupplement.trim()) && !supplementError;
  const paymentMethodLabel =
    paymentMethod === 'sbps_credit' ? 'クレジットカード（SBPS）' : '口座振替（JACCS）';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={BOUNDED_DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>入会申請を否認</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Alert className="border-info/50 bg-info/15 py-2">
            <Info className="text-info size-4" />
            <AlertDescription className="text-info text-xs">
              否認すると、保留中の決済情報（{paymentMethodLabel}
              ）は即時解放されます。申請者へは否認の事実のみ通知されます。
            </AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">否認理由</Label>
            <Select
              value={rejectReason}
              onValueChange={(value) => onRejectReasonChange(value as RejectionReason)}
              items={toSelectItems(REJECTION_REASON_OPTIONS)}
            >
              <SelectTrigger>
                <SelectValue placeholder="否認理由を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASON_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">
              補足
              {supplementRequired ? <RequiredMark /> : <OptionalMark />}
            </Label>
            <Textarea
              placeholder="否認理由を入力してください..."
              rows={4}
              className={BOUNDED_TEXTAREA_CLASS}
              aria-invalid={!!supplementError}
              value={rejectSupplement}
              onChange={(e) => onRejectSupplementChange(e.target.value)}
            />
            {supplementError && <p className="text-destructive text-xs">{supplementError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button variant="destructive" disabled={!canConfirm || isPending} onClick={onConfirm}>
            否認する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
