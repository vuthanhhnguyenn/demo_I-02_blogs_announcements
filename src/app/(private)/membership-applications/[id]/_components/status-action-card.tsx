'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { type ReactNode, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  Clock,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  adminApplicationControllerApproveMutation,
  adminApplicationControllerDetailQueryKey,
  adminApplicationControllerListQueryKey,
  adminApplicationControllerRejectMutation,
  adminMemberControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { RejectApplicationDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission, UserRole } from '@/types/permission.type';

import { REJECTION_REASON_LABELS, SAME_DAY_CANCEL_LIMIT } from '../../_constants/constants';
import { staffWaiverReasonSchema, textError } from '../../_schemas/application-text.schema';
import { isBlacklistFlagged } from '../../_utils/application-dto.util';
import { isStaleStateError } from '../../_utils/application-error.util';
import type { ApplicationUiStatus } from '../../_utils/application-status.util';
import { getInitialChargeWarning } from '../../_utils/initial-charge.util';
import { ApprovalChecklistCard } from './approval-checklist-card';
import { ApproveDialog } from './approve-dialog';
import {
  type ApplicationDetail,
  findStatusEvent,
  getStatusBadge,
  getStatusLabel,
  isAgreementMissing,
  isReviewable,
  staffLabel,
  uiStatusOf,
} from './membership-application.utils';
import { RejectDialog } from './reject-dialog';

interface StatusActionCardProps {
  app: ApplicationDetail;
  applicationId: string;
  staffExemptionReason: string;
  onStaffExemptionReasonChange: (reason: string) => void;
}

type RejectionReason = RejectApplicationDto['rejectReasonCode'];

function getStatusVisual(status: ApplicationUiStatus): {
  icon: ReactNode;
  bgClass: string;
} {
  switch (status) {
    case 'pending':
      return { icon: <Clock className="text-warning size-8" />, bgClass: 'bg-warning/15' };
    case 'review':
      return { icon: <ClipboardCheck className="text-info size-8" />, bgClass: 'bg-info/15' };
    case 'approved':
    case 'auto_approved':
      return { icon: <CheckCircle className="text-success size-8" />, bgClass: 'bg-success/15' };
    case 'rejected':
      return {
        icon: <XCircle className="text-destructive size-8" />,
        bgClass: 'bg-destructive/15',
      };
    case 'cancelled':
      return { icon: <Archive className="text-muted-foreground size-8" />, bgClass: 'bg-muted' };
  }
}

export function StatusActionCard({
  app,
  applicationId,
  staffExemptionReason,
  onStaffExemptionReasonChange,
}: Readonly<StatusActionCardProps>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const status = uiStatusOf(app);
  const reviewable = isReviewable(status);
  const blacklistMatched = isBlacklistFlagged(app.blacklist.matchResult);
  const sameDayCancelLimit = app.sameDayCancelLimit || SAME_DAY_CANCEL_LIMIT;
  // Who / when come from the decision fields; the reject supplement is the event's comment.
  const rejectedEvent = findStatusEvent(app, 'rejected');
  const memberNumber = app.member.memberNumber;

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectionReason | ''>('');
  const [rejectSupplement, setRejectSupplement] = useState('');

  function invalidateApplication() {
    void queryClient.invalidateQueries({
      queryKey: adminApplicationControllerDetailQueryKey({ path: { applicationId } }),
    });
    void queryClient.invalidateQueries({ queryKey: adminApplicationControllerListQueryKey() });
  }

  // Guards against duplicate approve / reject POSTs from clicks that land faster than a
  // React re-render can disable the button — isPending alone lags one commit (C-BUG-08).
  const isSubmittingRef = useRef(false);
  const releaseSubmit = () => {
    isSubmittingRef.current = false;
  };

  // Failures surface through the shared MutationCache toast (D11). A stale-state answer
  // (E-ENR-002 / E-ENR-007) additionally refetches so the screen shows the current status.
  const approveMutation = useMutation({
    ...adminApplicationControllerApproveMutation(),
    onSuccess: (response) => {
      setApproveDialogOpen(false);
      onStaffExemptionReasonChange('');
      invalidateApplication();
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      // C-01 FR-M005 異常系: an uncollected first charge keeps the member 仮会員 — warn instead
      // of a plain success, kept on screen longer than the default so the follow-up isn't missed.
      const chargeWarning = getInitialChargeWarning(response.initialCharge);
      if (chargeWarning) {
        toast.warning(chargeWarning.title, {
          description: chargeWarning.description,
          duration: 10_000,
          closeButton: true,
        });
        return;
      }
      toast.success('入会申請を承認しました。');
    },
    onError: (error) => {
      if (isStaleStateError(error)) {
        setApproveDialogOpen(false);
        invalidateApplication();
      }
    },
    onSettled: releaseSubmit,
  });

  const rejectMutation = useMutation({
    ...adminApplicationControllerRejectMutation(),
    onSuccess: () => {
      setRejectDialogOpen(false);
      setRejectReason('');
      setRejectSupplement('');
      invalidateApplication();
      toast.success('入会申請を否認しました。');
    },
    onError: (error) => {
      if (isStaleStateError(error)) {
        setRejectDialogOpen(false);
        invalidateApplication();
      }
    },
    onSettled: releaseSubmit,
  });

  // `expectedStatus` makes approve / reject fail with E-ENR-007 if someone else moved the
  // application first, instead of silently acting on a stale view (D10).
  const expectedStatus = app.status === 'under_review' ? 'under_review' : 'submitted';

  function handleApproveConfirm() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const reason = staffExemptionReason.trim();
    approveMutation.mutate({
      path: { applicationId },
      body: {
        expectedStatus,
        // G-05 ADD-09 ③ staff waiver — present = apply (reason 1–1000 chars).
        ...(reason ? { enrollmentFeeWaiver: { reason } } : {}),
      },
    });
  }

  function handleRejectConfirm() {
    if (!rejectReason || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    rejectMutation.mutate({
      path: { applicationId },
      body: {
        rejectReasonCode: rejectReason,
        comment: rejectSupplement.trim() || undefined,
        expectedStatus,
      },
    });
  }

  const { icon, bgClass } = getStatusVisual(status);
  const agreementMissing = isAgreementMissing(app);
  // The waiver reason is typed in the fee card; an over-long one blocks the approval there.
  const waiverReasonError = textError(staffWaiverReasonSchema, staffExemptionReason.trim());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ステータス</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 px-4">
          <div className={`flex size-20 items-center justify-center rounded-full ${bgClass}`}>
            {icon}
          </div>
          <Badge
            variant="outline"
            className={`gap-1 text-xs font-medium ${getStatusBadge(status)}`}
          >
            {getStatusLabel(status)}
          </Badge>
          <p className="text-muted-foreground text-xs">
            最終更新: {formatDateYYYYMMDD_HHMM(app.lastStatusChangeAt, '—')}
          </p>

          {(status === 'approved' || status === 'auto_approved') && app.approvedAt && (
            <div className="flex w-full flex-col gap-2">
              <div className="text-muted-foreground bg-success/10 flex w-full flex-col gap-1 rounded-md px-3 py-2 text-xs wrap-anywhere">
                <span>
                  <span className="font-medium">承認者:</span>{' '}
                  {status === 'auto_approved' ? 'システム（自動承認）' : staffLabel(app.approvedBy)}
                </span>
                <span>
                  <span className="font-medium">承認日時:</span>{' '}
                  {formatDateYYYYMMDD_HHMM(app.approvedAt, '—')}
                </span>
                <span>
                  <span className="font-medium">会員ID:</span>{' '}
                  <span className="font-mono">{memberNumber}</span>
                </span>
              </div>
              {/* C-01 FR-M005: the approval promotes the applicant's A-01 member record (D14). */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => router.push(navigate('/members/[id]', app.member.memberId))}
              >
                会員詳細を開く（{memberNumber}）
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          {/* C-01 FR-M008: cancellation summary — same shape as approve / reject (prototype 9/8). */}
          {status === 'cancelled' && app.cancelledAt && (
            <div className="text-muted-foreground bg-muted flex w-full flex-col gap-1 rounded-md px-3 py-2 text-xs wrap-anywhere">
              <span>
                <span className="font-medium">取り消し者:</span> {staffLabel(app.cancelledBy)}
              </span>
              <span>
                <span className="font-medium">取り消し日時:</span>{' '}
                {formatDateYYYYMMDD_HHMM(app.cancelledAt, '—')}
              </span>
              {app.cancelReason && (
                <span>
                  <span className="font-medium">取り消し理由:</span> {app.cancelReason}
                </span>
              )}
            </div>
          )}

          {(status === 'approved' || status === 'auto_approved' || app.sameDayCancelCount > 0) && (
            <div className="flex w-full items-center justify-between px-1 text-xs">
              {/* Counted per member, as the API does (B10 closed 2026-10-07). */}
              <span className="text-muted-foreground">当日取り消し回数</span>
              <span
                className={`font-medium tabular-nums ${app.sameDayCancelCount >= sameDayCancelLimit ? 'text-destructive' : ''}`}
              >
                {app.sameDayCancelCount} / {sameDayCancelLimit}
              </span>
            </div>
          )}

          {status === 'rejected' && app.rejectedAt && (
            <div className="text-muted-foreground bg-destructive/10 flex w-full flex-col gap-1 rounded-md px-3 py-2 text-xs wrap-anywhere">
              <span>
                <span className="font-medium">否認者:</span> {staffLabel(app.rejectedBy)}
              </span>
              <span>
                <span className="font-medium">否認日時:</span>{' '}
                {formatDateYYYYMMDD_HHMM(app.rejectedAt, '—')}
              </span>
              <span>
                {/* `rejectReasonCode` is null on dev for older rows although the contract types it
                    non-null — the lookup falls back to 「—」. */}
                <span className="font-medium">否認理由:</span>{' '}
                {REJECTION_REASON_LABELS[app.rejectReasonCode] ?? '—'}
                {rejectedEvent?.comment ? `。${rejectedEvent.comment}` : ''}
              </span>
            </div>
          )}

          {reviewable && <ApprovalChecklistCard app={app} />}

          {reviewable && (
            <>
              <Separator className="w-full" />
              <div className="flex w-full flex-col gap-2">
                {blacklistMatched && (
                  <Alert className="border-destructive/50 bg-destructive/10 py-2">
                    <AlertTriangle className="text-destructive size-4" />
                    <AlertDescription className="text-destructive text-xs">
                      BL一致あり。慎重に審査してください。
                    </AlertDescription>
                  </Alert>
                )}
                {agreementMissing && (
                  <Alert className="border-destructive/50 bg-destructive/10 py-2">
                    <AlertTriangle className="text-destructive size-4" />
                    <AlertDescription className="text-destructive text-xs">
                      代理申請の合意日時が未入力です。合意日時の入力は必須のため、承認操作をブロックしています。
                    </AlertDescription>
                  </Alert>
                )}
                <RoleGatedButton
                  allowedRoles={[
                    UserRole.Headquarter,
                    UserRole.System,
                    UserRole.Manager,
                    UserRole.Staff,
                  ]}
                  requiredPermission={Permission.MembershipApplicationsApprove}
                  denyTooltip="入会申請承認の権限がありません"
                  variant={blacklistMatched ? 'outline' : 'default'}
                  fullWidth
                  className={cn('gap-2', agreementMissing && 'disabled:opacity-100')}
                  disabled={agreementMissing}
                  onClick={() => setApproveDialogOpen(true)}
                >
                  <Check className="size-4" />
                  {blacklistMatched ? 'リスクを確認して承認する' : '承認する'}
                </RoleGatedButton>
                <RoleGatedButton
                  allowedRoles={[
                    UserRole.Headquarter,
                    UserRole.System,
                    UserRole.Manager,
                    UserRole.Staff,
                  ]}
                  requiredPermission={Permission.MembershipApplicationsApprove}
                  denyTooltip="入会申請否認の権限がありません"
                  variant="outline"
                  fullWidth
                  className="text-destructive hover:text-destructive gap-2"
                  onClick={() => setRejectDialogOpen(true)}
                >
                  <X className="size-4" />
                  否認する
                </RoleGatedButton>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ApproveDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        app={app}
        staffExemptionReason={staffExemptionReason}
        onConfirm={handleApproveConfirm}
        isPending={approveMutation.isPending}
        waiverReasonError={waiverReasonError}
      />

      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        paymentMethod={app.paymentMethod}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        rejectSupplement={rejectSupplement}
        onRejectSupplementChange={setRejectSupplement}
        onConfirm={handleRejectConfirm}
        isPending={rejectMutation.isPending}
      />
    </>
  );
}
