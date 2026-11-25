import { formatYen } from '@/utils/format.util';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

import { BOUNDED_DIALOG_CLASS } from '../../_constants/constants';
import { isBlacklistFlagged } from '../../_utils/application-dto.util';
import {
  type ApplicationDetail,
  applicantName,
  waiverLabel,
  waiverStateOf,
} from './membership-application.utils';

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: ApplicationDetail;
  staffExemptionReason: string;
  onConfirm: () => void;
  isPending: boolean;
  /** Set when the staff waiver reason fails validation — approval is blocked until fixed. */
  waiverReasonError?: string;
}

export function ApproveDialog({
  open,
  onOpenChange,
  app,
  staffExemptionReason,
  onConfirm,
  isPending,
  waiverReasonError,
}: Readonly<ApproveDialogProps>) {
  const { totalInitial } = app.calculatedAmounts;
  const waiver = waiverStateOf(app, staffExemptionReason);
  const hasExemption = !!waiver && waiver.discount > 0;
  // A staff reason typed in this session is not on the server total yet — preview it.
  const localStaffPreview =
    !!waiver?.staffWaiverAvailable && staffExemptionReason.trim().length > 0;
  const total =
    totalInitial != null
      ? totalInitial - (localStaffPreview && waiver ? waiver.discount : 0)
      : null;
  const campaignName = app.campaign?.name ?? null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={BOUNDED_DIALOG_CLASS}>
        <AlertDialogHeader>
          <AlertDialogTitle>入会申請を承認しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            承認すると会員登録が完了し、契約完了通知が送信されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">申請者</span>
            <span className="min-w-0 text-right font-medium wrap-anywhere">
              {applicantName(app)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">店舗</span>
            <span className="min-w-0 text-right wrap-anywhere">{app.store.name ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">プラン</span>
            <span className="min-w-0 text-right wrap-anywhere">{app.plan.name ?? '—'}</span>
          </div>
          <Separator />
          {hasExemption && waiver && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">入会金（定価）</span>
                <span className="text-muted-foreground line-through">
                  {formatYen(waiver.enrollmentFee)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-success min-w-0 wrap-anywhere">
                  {waiverLabel(waiver, campaignName)}
                </span>
                <span className="text-success shrink-0 font-medium whitespace-nowrap">
                  -{formatYen(waiver.discount)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">初期費用合計</span>
            <span className="font-medium">{formatYen(total)}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            確定金額は承認時に初回請求（売上管理）へ反映されます。
          </p>
        </div>
        {isBlacklistFlagged(app.blacklist.matchResult) && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="text-destructive size-4" />
            <AlertDescription className="text-destructive text-sm">
              この申請にはブラックリスト一致があります。
            </AlertDescription>
          </Alert>
        )}
        {waiverReasonError && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="text-destructive size-4" />
            <AlertDescription className="text-destructive text-sm">
              {waiverReasonError}
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending || !!waiverReasonError}>
            承認する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
