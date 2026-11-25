'use client';
import { useState } from 'react';

import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDate, formatYen } from '@/utils/format.util';
import {
  ArrowRightLeft,
  CalendarX2,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  ShieldBan,
} from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { BreadcrumbNav } from '@/components/common/breadcrumb-nav';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { MemberHeadupCard } from '@/components/common/member-headup-card';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollAreaContent } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import type { PendingTransferDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  MEMBER_STATUS_CLASSES,
  MEMBER_STATUS_LABELS,
  shouldShowMemberStatusDot,
} from '../_constants/constants';
import { AppLinkSheet } from './_components/app-link-sheet';
import { AppLinkSummaryItem } from './_components/app-link-summary-item';
import { BlacklistDialog } from './_components/blacklist-dialog';
import { EnrollmentCancelDialog } from './_components/enrollment-cancel-dialog';
import { GateStopReleaseSheet } from './_components/gate-stop-release-sheet';
import { GateStopSetSheet } from './_components/gate-stop-set-sheet';
import { LeaveReleaseSheet } from './_components/leave-release-sheet';
import { LeaveSheet } from './_components/leave-sheet';
import { PenaltyReleaseSheet } from './_components/penalty-release-sheet';
import { PersonalDataDeleteDialog } from './_components/personal-data-delete-dialog';
import { BasicInfoTab } from './_components/tabs/basic-info-tab';
import { BodyDataTab } from './_components/tabs/body-data-tab';
import { ChangeHistoryTab } from './_components/tabs/change-history-tab';
import { ContractsTab } from './_components/tabs/contracts-tab';
import { PaymentHistoryTab } from './_components/tabs/payment-history-tab';
import { PointsTab } from './_components/tabs/points-tab';
import { ReferralTab } from './_components/tabs/referral-tab';
import { SurveyResponseHistoryTab } from './_components/tabs/survey-response-tab';
import { TrainingRecordsTab } from './_components/tabs/training-records-tab';
import { UsageHistoryTab } from './_components/tabs/usage-history-tab';
import { TransferSheet } from './_components/transfer-sheet';
import { WithdrawCancelDialog } from './_components/withdraw-cancel-dialog';
import { WithdrawSheet } from './_components/withdraw-sheet';
import { GATE_STOP_PATTERN_LABELS, isGateStopRestricted } from './_constants/gate-stop';
import { memberTypeLabel } from './_constants/member-labels';
import { useMemberDetail } from './_hooks/use-member-detail';
import { toAppLinkState } from './_utils/app-link.util';
import { isBeforeUsageStart, withdrawalCancelBlockedLabel } from './_utils/member-operation.util';

const TABS = [
  'basic',
  'contracts',
  'payment',
  'usage',
  'points',
  'survey',
  'training',
  'body-data',
  'referral',
  'history',
] as const;

/**
 * A-02 approval chain, as the member detail sees it. Terminal states never reach the banner:
 * `pendingTransfer` itself goes null once the application completes or is rejected.
 */
const TRANSFER_STATUS_LABELS: Record<PendingTransferDto['status'], string> = {
  submitted: '承認待ち',
  pending_source_approval: '移籍元承認待ち',
  pending_destination_approval: '移籍先承認待ち',
};

/**
 * Falls back to the neutral wording rather than rendering `undefined`: the swagger is not
 * self-consistent about this value (`TransferApplicationDto.status` is an unconstrained string
 * whose example is `pending`), so an unlisted state is treated as simply awaiting approval.
 */
const transferStatusLabel = (status: PendingTransferDto['status']): string =>
  TRANSFER_STATUS_LABELS[status] ?? '承認待ち';

type PendingApplicationVariant = 'destructive' | 'warning' | 'info';

/** Prototype colour per application type: 退会 = destructive, 移籍 = warning, 休会 = info. */
const PENDING_BANNER_CLASSES: Record<PendingApplicationVariant, string> = {
  destructive: 'border-destructive/50 bg-destructive/15',
  warning: 'border-warning/50 bg-warning/15',
  info: 'border-info/50 bg-info/15',
};

const PENDING_BADGE_CLASSES: Record<PendingApplicationVariant, string> = {
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  info: 'bg-info/15 text-info border-info/30',
};

const isMemberTab = (value: string | null): value is (typeof TABS)[number] => {
  if (!value) return false;
  return TABS.includes(value as (typeof TABS)[number]);
};

export default function MemberDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const backToListHref = useBackToListHref(navigate('/members'));
  const withReturnTo = useWithReturnTo();
  const tab = searchParams.get('tab');
  // Show a two-level-back breadcrumb when navigated from a referrer / family member
  const parentMemberId = searchParams.get('parentMemberId');
  const parentName = searchParams.get('parentName');

  const memberId = params.id as string;
  const activeTab = isMemberTab(tab) ? tab : 'basic';

  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [showLeaveSheet, setShowLeaveSheet] = useState(false);
  const [showPersonalDataDeleteDialog, setShowPersonalDataDeleteDialog] = useState(false);
  const [showWithdrawCancelDialog, setShowWithdrawCancelDialog] = useState(false);
  const [showGateStopSetSheet, setShowGateStopSetSheet] = useState(false);
  const [showGateStopReleaseSheet, setShowGateStopReleaseSheet] = useState(false);
  const [showLeaveReleaseSheet, setShowLeaveReleaseSheet] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [showPenaltyReleaseSheet, setShowPenaltyReleaseSheet] = useState(false);
  const [showEnrollmentCancelDialog, setShowEnrollmentCancelDialog] = useState(false);
  // A-01 FR-027: opened from the head-up アプリ連携 item
  const [showAppLinkSheet, setShowAppLinkSheet] = useState(false);

  // A-01 権限マトリクス: a read-only role (Observer) must not be offered the operation
  // menus at all — gating only the items inside still exposes the triggers.
  const { hasPermission } = useAuthUser();
  const canChangeStatus = [
    Permission.MembersSuspend,
    Permission.MembersWithdraw,
    Permission.MembersTransfer,
    Permission.MembersGateStop,
    Permission.MembershipApplicationsCancel,
  ].some((permission) => hasPermission(permission));
  const canManageMember = [Permission.MembersGateStop, Permission.BlacklistCreate].some(
    (permission) => hasPermission(permission),
  );
  const canDeletePersonalData = hasPermission(Permission.MembersPersonalDataDelete);
  // A-01 FR-015: the blacklist entry is HQ / System only.
  const canViewBlacklist = hasPermission(Permission.MembersBlacklistView);

  const { member, derived, isLoading, isError, error, refetch } = useMemberDetail(memberId);

  if (isLoading || isError || !member) {
    // A-01 FR-003: an out-of-scope member is a permission denial — retrying cannot succeed.
    const isForbidden = isError && getApiErrorStatus(error) === 403;
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!member}
        errorTitle={isForbidden ? 'アクセス権限がありません' : undefined}
        errorDescription={isError ? resolveApiErrorMessage(error) : undefined}
        onRetry={isForbidden ? undefined : () => refetch()}
      />
    );
  }

  const personalInfo = member.personalInfo;
  const displayName = [personalInfo.lastName, personalInfo.firstName].filter(Boolean).join(' ');
  const nameKana = [personalInfo.lastNameKana, personalInfo.firstNameKana]
    .filter(Boolean)
    .join(' ');
  const avatarFallback = `${personalInfo.lastName?.[0] ?? ''}${personalInfo.firstName?.[0] ?? ''}`;

  const status = member.memberStatus;
  const memberStatusLabel = MEMBER_STATUS_LABELS[status];
  const isWithdrawnStatus = status === 'withdrawn' || status === 'forced_withdrawal';
  const isBlacklisted = Boolean(member.blacklist?.isActive);
  const blacklist = canViewBlacklist && member.blacklist?.isActive ? member.blacklist : undefined;
  // Anonymization is irreversible and the server rejects a second run with 409 E-MEM-228, so the
  // 個人情報削除 trigger has to read the same flag the detail response already carries.
  const isAnonymized = Boolean(member.anonymizedAt);

  // A-01 FR-014: 常時入退館（ストップなし）is the normal state, so it must not raise the banner.
  // Shared helper so the banner, the badge and the 基本情報 入退館設定 card can never disagree.
  const gateStopRestricted = isGateStopRestricted(member);
  const gateStopPattern = member.gateStop?.pattern ?? undefined;
  const unpaidAmount = member.unpaidAmount ?? 0;
  const appLinkState = toAppLinkState(member.linking);

  // Application / adjustment labels for the current-status summary strip
  const contract = member.currentMainContract;
  // A-01 FR-026: an approved member whose usage start date is still ahead has the enrollment
  // cancelled rather than filing a withdrawal. The API keeps such a member 仮会員 until BAT-016
  // promotes them on the start date, so that is where the entry mostly appears; an 有効 member
  // with a future start (the prototype's case) gets it alongside the usual items.
  const beforeUsageStart = isBeforeUsageStart(contract?.usageStartDate);
  const canCancelEnrollment = beforeUsageStart && (status === 'active' || status === 'provisional');

  // Only the statuses below contribute status-change items; the other transitional ones
  // (休会予定 / 退会処理待ち) are driven by other flows and offer none. Gate stop adds its own
  // item independently of the status. Without this guard the trigger would open an empty menu.
  const hasStatusChangeItems =
    gateStopRestricted ||
    canCancelEnrollment ||
    status === 'active' ||
    status === 'suspended' ||
    status === 'pending_withdrawal';

  // The 退会取り消し menu item is gated on the member status, so the banner and the
  // 退会予定 badge read the same condition: once the application is cancelled the
  // status is back to 有効 and neither may keep advertising a withdrawal.
  const pendingWithdrawal =
    status === 'pending_withdrawal' ? contract?.pendingWithdrawal : undefined;
  // qa-157 (client ruling 2026-08-21): cancellability is whatever the server publishes on the
  // application — never recomputed from dates here. API-092 §6.4 blocks on three conditions and
  // the usage start date is only one of them, so a locally derived flag would leave the entry
  // points open on the other two and send the operator into a 409 `E-WDR-200`.
  const withdrawalCancellable = pendingWithdrawal?.cancellable ?? false;
  const withdrawalBlockedReason = withdrawalCancellable
    ? undefined
    : withdrawalCancelBlockedLabel(
        pendingWithdrawal?.cancellationBlockedReason,
        contract?.usageStartDate,
      );
  // Same gating as 退会予定 above: the strip lists applications still WAITING to take effect
  // (prototype drives it from `pendingStatusChange`), so a recess that has already started must
  // not appear here — the member status badge already says 休会中, and showing 休会予定 next to it
  // makes the two disagree. `activeSuspension` stays populated for the whole recess, which is why
  // its presence alone is not the condition.
  const pendingSuspension = status === 'pending_suspended' ? contract?.activeSuspension : undefined;
  // A-02: an in-flight 移籍 application. Unlike 休会/退会 this never moves `memberStatus` — the
  // application lives on the contract and clears itself on completion/rejection, so the banner,
  // the badge and the 移籍申請 gate all read this one field (API-093 `PendingTransferDto`).
  const pendingTransfer = contract?.pendingTransfer ?? undefined;
  const pendingApplications: { label: string; variant: PendingApplicationVariant }[] = [];
  if (pendingWithdrawal) pendingApplications.push({ label: '退会申請中', variant: 'destructive' });
  if (pendingTransfer) pendingApplications.push({ label: '移籍申請中', variant: 'warning' });
  if (pendingSuspension) pendingApplications.push({ label: '休会申請中', variant: 'info' });
  // While an application is pending, its label replaces the status badge (umbrella FR-002).
  const pendingApplication = pendingApplications[0];
  const applicationBadges = pendingApplications.map((application) => application.label);
  if (contract?.activeFeeAdjustment) applicationBadges.push('個別会費調整中');
  const suspensionEndDate =
    status === 'suspended' ? contract?.activeSuspension?.endDate : undefined;

  // 休会解除 is keyed by the recess application, not the member: both `/release` and `/cancel`
  // take `suspensionApplicationId` in the path. A 休会中 member whose `currentMainContract` is
  // null therefore has no id to act on, so the menu item explains itself instead of opening a
  // sheet that cannot submit.
  const canReleaseSuspension = !!contract?.activeSuspension;

  // A-01 FR-005 judges 操作可否 on 契約状態 first, then 未納状況 / 解約手数料期間, and its 異常系 asks for the
  // reason to be shown rather than letting the operation fail. 移籍 is defined as changing the store the
  // MAIN CONTRACT is held at (A-02 「移籍 = 主契約締結店舗を変更すること」), so a member without one has nothing
  // to transfer: the server answers 409 `E-TRF-006` and the sheet has no 移籍元 to put in its first field.
  // The cancellation-fee block applies to JOYFIT only (A-02 ブランド別設定: FIT365 = 可能).
  const transferBlockedReason = pendingTransfer
    ? '移籍申請中のため操作できません'
    : !contract
      ? '主契約がないため移籍できません'
      : derived.inCancellationPeriod && member?.brandGroup === 'JOYFIT'
        ? '解約手数料期間中のため移籍できません'
        : derived.hasUnpaidFee
          ? '未納金があるため操作できません'
          : undefined;

  const enrollmentCancelMenuItem = (
    <RoleGatedMenuItem
      requiredPermission={Permission.MembershipApplicationsCancel}
      className="text-destructive"
      onClick={() => setShowEnrollmentCancelDialog(true)}
    >
      <div className="flex flex-col">
        <span>入会取り消し</span>
        <span className="text-muted-foreground text-xs">
          利用開始日（{formatDate(contract?.usageStartDate)}）前のため対象
        </span>
      </div>
    </RoleGatedMenuItem>
  );

  const handleEdit = () => {
    router.push(withReturnTo(navigate('/members/[id]/edit', memberId), backToListHref));
  };

  const handleTabChange = (value: string) => {
    if (!isMemberTab(value)) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === 'basic') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', value);
    }
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    // Push, not replace: each tab is a browser-history step, so Back returns to the previous tab.
    router.push(nextUrl, { scroll: false });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        breadcrumb={
          parentMemberId ? (
            <BreadcrumbNav
              items={[
                { url: navigate('/members'), label: '会員管理' },
                {
                  url: navigate('/members/[id]', parentMemberId),
                  label: parentName ?? '会員詳細',
                },
                { label: displayName },
              ]}
            />
          ) : (
            <BackLink label="会員管理に戻る" href={backToListHref} />
          )
        }
        title={displayName}
        actions={
          <>
            {!isWithdrawnStatus && (
              <RoleGatedButton
                size="sm"
                requiredPermission={Permission.MembersEdit}
                className="gap-1"
                onClick={handleEdit}
              >
                <Pencil className="size-4" />
                編集
              </RoleGatedButton>
            )}

            {/* Status change */}
            {!isWithdrawnStatus && canChangeStatus && hasStatusChangeItems && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="sm" className="gap-1" />}
                >
                  ステータス変更
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {status === 'active' && (
                    <>
                      <RoleGatedMenuItem
                        requiredPermission={Permission.MembersSuspend}
                        disabled={derived.hasUnpaidFee}
                        onClick={() => setShowLeaveSheet(true)}
                      >
                        <div className="flex flex-col">
                          <span>休会申請</span>
                          {derived.hasUnpaidFee && (
                            <span className="text-destructive text-xs">
                              未納金があるため操作できません
                            </span>
                          )}
                        </div>
                      </RoleGatedMenuItem>
                      <RoleGatedMenuItem
                        requiredPermission={Permission.MembersWithdraw}
                        className="text-destructive"
                        onClick={() => setShowWithdrawSheet(true)}
                      >
                        退会申請
                      </RoleGatedMenuItem>
                      {canCancelEnrollment && enrollmentCancelMenuItem}
                      <RoleGatedMenuItem
                        requiredPermission={Permission.MembersTransfer}
                        disabled={Boolean(transferBlockedReason)}
                        onClick={() => setShowTransferSheet(true)}
                      >
                        <div className="flex flex-col">
                          <span>移籍申請</span>
                          {transferBlockedReason && (
                            <span className="text-destructive text-xs">
                              {transferBlockedReason}
                            </span>
                          )}
                        </div>
                      </RoleGatedMenuItem>
                    </>
                  )}
                  {status === 'provisional' && canCancelEnrollment && enrollmentCancelMenuItem}
                  {status === 'suspended' && (
                    <>
                      <RoleGatedMenuItem
                        requiredPermission={Permission.MembersSuspend}
                        disabled={!canReleaseSuspension}
                        onClick={() => setShowLeaveReleaseSheet(true)}
                      >
                        <div className="flex flex-col">
                          <span>休会解除</span>
                          {!canReleaseSuspension && (
                            <span className="text-destructive text-xs">
                              休会情報が取得できないため操作できません
                            </span>
                          )}
                        </div>
                      </RoleGatedMenuItem>
                      <RoleGatedMenuItem
                        requiredPermission={Permission.MembersWithdraw}
                        className="text-destructive"
                        onClick={() => setShowWithdrawSheet(true)}
                      >
                        退会申請
                      </RoleGatedMenuItem>
                    </>
                  )}
                  {/* Gate stop is orthogonal to the member status, so its release
                      entry is driven by the gate-stop record and appears alongside
                      whatever the member's own status offers (e.g. a 休会中 member who
                      is also gate-stopped gets 休会解除 AND ゲートストップ解除). */}
                  {gateStopRestricted && (
                    <RoleGatedMenuItem
                      requiredPermission={Permission.MembersGateStop}
                      onClick={() => setShowGateStopReleaseSheet(true)}
                    >
                      ゲートストップ解除
                    </RoleGatedMenuItem>
                  )}
                  {/* 退会申請の取り消し is offered while the member is 退会予定; whether it may
                      actually go through is the server's `cancellable` call. */}
                  {status === 'pending_withdrawal' && (
                    <RoleGatedMenuItem
                      requiredPermission={Permission.MembersWithdraw}
                      disabled={!withdrawalCancellable}
                      onClick={() => setShowWithdrawCancelDialog(true)}
                    >
                      <div className="flex flex-col">
                        <span>退会取り消し</span>
                        {withdrawalBlockedReason && (
                          <span className="text-destructive text-xs">
                            {withdrawalBlockedReason}
                          </span>
                        )}
                      </div>
                    </RoleGatedMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Member operations (admin actions) */}
            {!isWithdrawnStatus && canManageMember && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-8"
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                      管理操作
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {!gateStopRestricted && (
                      <RoleGatedMenuItem
                        requiredPermission={Permission.MembersGateStop}
                        onClick={() => setShowGateStopSetSheet(true)}
                      >
                        ゲートストップ設定
                      </RoleGatedMenuItem>
                    )}
                    <RoleGatedMenuItem
                      requiredPermission={Permission.BlacklistCreate}
                      className="text-destructive"
                      disabled={isBlacklisted}
                      onClick={() => setShowBlacklistDialog(true)}
                    >
                      <div className="flex flex-col">
                        <span>ブラックリスト登録</span>
                        {isBlacklisted && (
                          <span className="text-destructive text-xs">
                            既にブラックリスト登録済みのため操作できません
                          </span>
                        )}
                      </div>
                    </RoleGatedMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Withdrawn member */}
            {isWithdrawnStatus && (
              <>
                {canDeletePersonalData && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-8"
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <RoleGatedMenuItem
                        requiredPermission={Permission.MembersPersonalDataDelete}
                        className="text-destructive"
                        disabled={isAnonymized}
                        onClick={() => setShowPersonalDataDeleteDialog(true)}
                      >
                        <div className="flex flex-col">
                          <span>個人情報削除</span>
                          {isAnonymized && (
                            <span className="text-destructive text-xs">
                              既に個人情報削除済みのため操作できません
                            </span>
                          )}
                        </div>
                      </RoleGatedMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </>
        }
      />

      {/* Warning banners + member head-up card */}
      <div className="p-4">
        {/* Gate-stop warning banner */}
        {gateStopRestricted && (
          <Alert className="border-destructive/50 bg-destructive/10 mb-4">
            <ShieldAlert className="text-destructive size-4" />
            <AlertDescription className="text-xs">
              ゲートストップ中
              {gateStopPattern ? `（${GATE_STOP_PATTERN_LABELS[gateStopPattern]}）` : ''} —
              全店舗への入館が制限されています
            </AlertDescription>
          </Alert>
        )}

        {/* Blacklist banner — states up front why 個人情報削除 is refused (A-01 FR-015 / FR-018) */}
        {blacklist && (
          <Alert className="border-destructive/50 bg-destructive/15 mb-4">
            <ShieldBan className="text-destructive size-4" />
            <AlertDescription className="flex w-full items-center justify-between gap-2 text-xs">
              <span>
                ブラックリスト登録済み（{formatDate(blacklist.registeredAt)} 登録） —
                個人情報の削除はできません
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 shrink-0 text-xs"
                nativeButton={false}
                render={<Link href={navigate('/members/blacklist/[id]', blacklist.blacklistId)} />}
              >
                ブラックリスト詳細
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Reservation-penalty warning banner */}
        {derived.activePenalty && (
          <Alert className="border-destructive/50 bg-destructive/15 mb-4">
            <CalendarX2 className="text-destructive size-4" />
            <AlertDescription className="flex w-full items-center justify-between gap-2 text-xs">
              <span>
                予約ペナルティ中 — {formatDate(derived.activePenalty.endAt)} までレッスン予約不可
                {(derived.activePenalty.noShowCount != null || derived.activePenalty.startAt) && (
                  <>
                    （
                    {derived.activePenalty.noShowCount != null &&
                      `無断キャンセル${derived.activePenalty.noShowCount}回`}
                    {derived.activePenalty.noShowCount != null &&
                      derived.activePenalty.startAt &&
                      ' / '}
                    {derived.activePenalty.startAt &&
                      `適用日 ${formatDate(derived.activePenalty.startAt)}`}
                    ）
                  </>
                )}
              </span>
              <RoleGatedButton
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                requiredPermission={Permission.LessonsPenaltyRelease}
                denyTooltip="ペナルティ解除の権限がありません"
                onClick={() => setShowPenaltyReleaseSheet(true)}
              >
                解除...
              </RoleGatedButton>
            </AlertDescription>
          </Alert>
        )}

        {/* Pending-application banner (withdrawal / suspension scheduled) */}
        {pendingWithdrawal && (
          <Alert className={`mb-4 ${PENDING_BANNER_CLASSES.destructive}`}>
            <ShieldAlert className="text-destructive size-4" />
            <AlertDescription className="flex w-full items-center justify-between gap-2 text-xs">
              <span>
                退会申請中 — {formatDate(pendingWithdrawal.scheduledWithdrawalDate)} 退会予定
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => handleTabChange('history')}
                >
                  詳細を見る
                </Button>
                <RoleGatedButton
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  requiredPermission={Permission.MembersWithdraw}
                  disabled={!withdrawalCancellable}
                  tooltip={withdrawalBlockedReason}
                  onClick={() => setShowWithdrawCancelDialog(true)}
                >
                  取り消す
                </RoleGatedButton>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/*
          Pending-transfer banner. No 取り消す counterpart to the one above: A-01 FR-005 files the
          application and A-02 FR-002 only approves or rejects it — there is no cancel operation in
          the spec and none on the API (API-091 DR7 dropped it, `cancelled` is not in the status
          enum), so the way back is a staff rejection in A-02. See prototype-gap-list #8.
        */}
        {pendingTransfer && (
          <Alert className="border-warning/50 bg-warning/15 mb-4">
            <ArrowRightLeft className="text-warning size-4" />
            <AlertDescription className="flex w-full items-center justify-between gap-2 text-xs">
              <span>
                {pendingTransfer.fromStore.name ?? '—'} → {pendingTransfer.toStore.name ?? '—'}{' '}
                への移籍を申請中（{transferStatusLabel(pendingTransfer.status)}）
                {pendingTransfer.scheduledTransferDate &&
                  ` — ${formatDate(pendingTransfer.scheduledTransferDate)} 移籍予定`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => handleTabChange('history')}
              >
                詳細を見る
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <MemberHeadupCard
          className="mb-0"
          memberId={member.memberNumber}
          oldMemberNo={member.legacyMemberCode ?? '—'}
          name={displayName}
          nameKana={nameKana}
          memberType={memberTypeLabel(member.memberType)}
          contractName={derived.contractName}
          contractStoreName={member.currentMainContract?.store?.name ?? '—'}
          registrationDate={formatDate(member.registrationDate)}
          facePhotoUrl={personalInfo.facePhotoUrl}
          avatarFallback={avatarFallback}
          statusBadge={
            <>
              {pendingApplication ? (
                <Badge
                  variant="outline"
                  className={`text-[10px] ${PENDING_BADGE_CLASSES[pendingApplication.variant]}`}
                >
                  <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
                  {pendingApplication.label}
                </Badge>
              ) : (
                <Badge variant="outline" className={`text-[10px] ${MEMBER_STATUS_CLASSES[status]}`}>
                  {shouldShowMemberStatusDot(status) && (
                    <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
                  )}
                  {memberStatusLabel}
                </Badge>
              )}
              {/* A-01 FR-003: when the member comes back / leaves, next to the status */}
              {suspensionEndDate && (
                <span className="text-muted-foreground text-xs">
                  {formatDate(suspensionEndDate)} まで休会
                </span>
              )}
              {pendingWithdrawal?.scheduledWithdrawalDate && (
                <span className="text-muted-foreground text-xs">
                  退会予定日 {formatDate(pendingWithdrawal.scheduledWithdrawalDate)}
                </span>
              )}
            </>
          }
        >
          {/* Current-status summary strip */}
          {/* Four in a row from 1024px, 2×2 below */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground mb-1 text-xs">未納額</dt>
              <dd
                className={`text-sm font-medium ${unpaidAmount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {unpaidAmount > 0 ? formatYen(unpaidAmount) : 'なし'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1 text-xs">申請・調整</dt>
              <dd className="flex flex-col items-start gap-1">
                {applicationBadges.length > 0 ? (
                  applicationBadges.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="border-warning/30 bg-warning/15 text-warning gap-1 text-[10px]"
                    >
                      <span className="bg-warning inline-block size-1.5 rounded-full" />
                      {label}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm font-medium">なし</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1 text-xs">直近のイベント</dt>
              <dd className="text-sm font-medium">最終来館 {formatDate(member.lastEntryAt)}</dd>
            </div>
            <AppLinkSummaryItem
              state={appLinkState}
              isWithdrawn={isWithdrawnStatus}
              onOpen={() => setShowAppLinkSheet(true)}
            />
          </dl>
        </MemberHeadupCard>
      </div>

      {/* Tabs */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 pt-0">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
        >
          {/* Wraps instead of scrolling so every tab (and the active one) stays visible at 1024px */}
          <div className="shrink-0">
            <TabsList
              variant="line"
              className="flex-wrap gap-y-2 group-data-horizontal/tabs:h-auto"
            >
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="contracts">契約操作</TabsTrigger>
              <TabsTrigger value="payment">支払い履歴</TabsTrigger>
              <TabsTrigger value="usage">利用履歴</TabsTrigger>
              <TabsTrigger value="points">ポイント履歴</TabsTrigger>
              <TabsTrigger value="survey">アンケート回答</TabsTrigger>
              <TabsTrigger value="training">トレーニング記録</TabsTrigger>
              <TabsTrigger value="body-data">ボディーデータ</TabsTrigger>
              <TabsTrigger value="referral">紹介関係</TabsTrigger>
              <TabsTrigger value="history">変更履歴</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="mt-2 min-h-0 min-w-0 flex-1 overflow-hidden pr-2">
            {/* Observes content size so the scrollbar re-measures when switching to a shorter tab */}
            <ScrollAreaContent>
              <TabsContent value="basic">
                <BasicInfoTab
                  member={member}
                  derived={derived}
                  onGateStopRelease={() => setShowGateStopReleaseSheet(true)}
                  onShowHistory={() => handleTabChange('history')}
                />
              </TabsContent>

              <TabsContent value="contracts">
                <ContractsTab
                  memberId={memberId}
                  memberStatus={status}
                  constraints={{
                    hasUnpaidFee: derived.hasUnpaidFee,
                    inCancellationPeriod: derived.inCancellationPeriod,
                  }}
                  unpaidAmount={unpaidAmount}
                />
              </TabsContent>

              <TabsContent value="payment">
                <PaymentHistoryTab memberId={memberId} />
              </TabsContent>

              <TabsContent value="usage">
                <UsageHistoryTab memberId={memberId} />
              </TabsContent>

              <TabsContent value="points">
                <PointsTab memberId={memberId} memberBrand={member.brandGroup} />
              </TabsContent>

              <TabsContent value="survey">
                <SurveyResponseHistoryTab memberId={memberId} />
              </TabsContent>

              <TabsContent value="training">
                <TrainingRecordsTab memberId={memberId} />
              </TabsContent>

              <TabsContent value="body-data">
                <BodyDataTab memberId={memberId} consentStatus={member.bodyDataConsent.status} />
              </TabsContent>

              <TabsContent value="referral">
                <ReferralTab
                  memberId={memberId}
                  memberName={displayName}
                  memberBrand={member.brandGroup}
                  referral={member.referral}
                />
              </TabsContent>

              <TabsContent value="history">
                <ChangeHistoryTab memberId={memberId} />
              </TabsContent>
            </ScrollAreaContent>
          </ScrollArea>
        </Tabs>
      </div>

      {showLeaveSheet && (
        <LeaveSheet
          open={showLeaveSheet}
          onOpenChange={setShowLeaveSheet}
          memberId={memberId}
          memberName={displayName}
          memberNumber={member.memberNumber}
          hasUnpaidFee={derived.hasUnpaidFee}
          activeFeeAdjustment={contract?.activeFeeAdjustment}
          onShowHistory={() => handleTabChange('history')}
        />
      )}

      {showLeaveReleaseSheet && (
        <LeaveReleaseSheet
          open={showLeaveReleaseSheet}
          onOpenChange={setShowLeaveReleaseSheet}
          memberId={memberId}
          activeSuspension={contract?.activeSuspension}
        />
      )}

      {showWithdrawSheet && (
        <WithdrawSheet
          open={showWithdrawSheet}
          onOpenChange={setShowWithdrawSheet}
          memberId={memberId}
          memberName={displayName}
          memberNumber={member.memberNumber}
          usageStartDate={contract?.usageStartDate}
          isBeforeUsageStart={beforeUsageStart}
          onOpenEnrollmentCancel={() => setShowEnrollmentCancelDialog(true)}
          onShowHistory={() => handleTabChange('history')}
        />
      )}

      {showEnrollmentCancelDialog && (
        <EnrollmentCancelDialog
          open={showEnrollmentCancelDialog}
          onOpenChange={setShowEnrollmentCancelDialog}
          memberId={memberId}
          memberName={displayName}
          memberNumber={member.memberNumber}
          usageStartDate={contract?.usageStartDate}
          onShowHistory={() => handleTabChange('history')}
        />
      )}

      {showPersonalDataDeleteDialog && (
        <PersonalDataDeleteDialog
          open={showPersonalDataDeleteDialog}
          onOpenChange={setShowPersonalDataDeleteDialog}
          memberId={memberId}
          memberNumber={member.memberNumber}
          memberName={displayName}
          memberStatusLabel={memberStatusLabel}
          isBlacklisted={isBlacklisted}
          hasUnpaidFee={derived.hasUnpaidFee}
        />
      )}

      {showWithdrawCancelDialog && (
        <WithdrawCancelDialog
          open={showWithdrawCancelDialog}
          onOpenChange={setShowWithdrawCancelDialog}
          memberId={memberId}
          withdrawalApplicationId={pendingWithdrawal?.withdrawalApplicationId}
        />
      )}

      {showGateStopSetSheet && (
        <GateStopSetSheet
          open={showGateStopSetSheet}
          onOpenChange={setShowGateStopSetSheet}
          memberId={memberId}
          onShowHistory={() => handleTabChange('history')}
        />
      )}

      {showGateStopReleaseSheet && (
        <GateStopReleaseSheet
          open={showGateStopReleaseSheet}
          onOpenChange={setShowGateStopReleaseSheet}
          memberId={memberId}
          gateStopInfo={member.gateStop}
          onShowHistory={() => handleTabChange('history')}
        />
      )}

      {showTransferSheet && (
        <TransferSheet
          open={showTransferSheet}
          onOpenChange={setShowTransferSheet}
          memberId={memberId}
          memberBrand={member.brandGroup}
          currentStoreId={contract?.store?.storeId}
          currentStoreName={contract?.store?.name}
          hasUnpaidFee={derived.hasUnpaidFee}
          inCancellationPeriod={derived.inCancellationPeriod}
          hasPendingTransfer={Boolean(pendingTransfer)}
          onShowHistory={() => handleTabChange('history')}
        />
      )}

      {showBlacklistDialog && (
        <BlacklistDialog
          open={showBlacklistDialog}
          onOpenChange={setShowBlacklistDialog}
          memberId={memberId}
          memberName={displayName}
          memberNumber={member.memberNumber}
        />
      )}

      {/* Always mounted: its confirm dialog outlives the sheet it closes */}
      <AppLinkSheet
        key={memberId}
        open={showAppLinkSheet}
        onOpenChange={setShowAppLinkSheet}
        memberId={memberId}
        memberNumber={member.memberNumber}
        memberName={displayName}
        memberNameKana={nameKana}
        birthDate={formatDate(personalInfo.dateOfBirth)}
        isWithdrawn={isWithdrawnStatus}
        state={appLinkState}
        currentYamauchiUserId={member.yamauchiUserId}
        onShowHistory={() => handleTabChange('history')}
      />

      {showPenaltyReleaseSheet && (
        <PenaltyReleaseSheet
          open={showPenaltyReleaseSheet}
          onOpenChange={setShowPenaltyReleaseSheet}
          memberId={memberId}
          penalty={derived.activePenalty}
          onShowHistory={() => handleTabChange('history')}
        />
      )}
    </div>
  );
}
