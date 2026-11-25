'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { formatDate } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePagination } from '@/components/common/table-pagination';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminMemberRelationsControllerReferralsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { UserRole } from '@/types/permission.type';

import { useLastDefined } from '../../../_hooks/use-last-defined';
import { PointRefundDialog } from '../../point-refund-dialog';

/** FR-S001: ポイント手動返還 is Manager and above. */
const POINT_REFUND_ROLES = [UserRole.Headquarter, UserRole.System, UserRole.Manager] as const;

/** Row placeholders for the 招待実績 table while the referral list loads. */
function InviteesSkeleton() {
  return (
    <div className="space-y-3 px-4 pb-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={`invitee-row-${index}`} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** Rows per page of the 招待実績 table — matches the endpoint's own default page size. */
const INVITEES_PAGE_SIZE = 20;

export function ReferralTab({
  memberId,
  memberName,
  memberBrand,
  referral,
}: {
  memberId: string;
  /** Name of the member being viewed, for the two-level-back breadcrumb on the destination page */
  memberName: string;
  /** Points are brand-locked — the refund endpoint requires the member's own brand group */
  memberBrand: MemberDetailDto['brandGroup'];
  /**
   * 紹介者 info from the member record. The referral endpoint's `inviter` block carries only the
   * member's own `referralCode`, so who invited them — and whether they joined via a referral —
   * has to come from `GET /admin/members/{memberId}`.
   */
  referral?: MemberDetailDto['referral'];
}) {
  const router = useRouter();
  const parentParams = { parentMemberId: memberId, parentName: memberName };
  const [page, setPage] = useState(1);
  const [showPointRefund, setShowPointRefund] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminMemberRelationsControllerReferralsOptions({
      path: { memberId: memberId },
      query: { page, limit: INVITEES_PAGE_SIZE },
    }),
    // Keep the current page on screen while the next one loads, so paging does not
    // collapse the whole tab back into its skeleton.
    placeholderData: keepPreviousData,
  });

  const referrer = referral?.byMember ?? null;
  // `invitees` is now a paginated envelope and the roll-up moved from `counts` to `stats`.
  const invitees = data?.invitees.items ?? [];
  const pagination = useLastDefined(data?.invitees.pagination);
  const showOverlay = isFetching && !isLoading;
  const stats = data?.stats;
  // Null is not zero: the API returns it when it could not resolve how many of the invitees reached
  // `approved`, so both this figure and the 特典未付与 difference are unknown and render as a dash.
  const approvedCount = stats?.approvedCount ?? null;
  // `inboundFlag` lives on the member record, not the referral list — the tab receives it.
  const isReferralEntry = referral?.inboundFlag ?? false;

  /** A 紹介サマリー figure: a placeholder while loading, a dash when the list failed to load. */
  const renderStat = (value: string) => {
    if (isLoading) return <Skeleton className="h-5 w-12" />;
    return <p className="text-sm font-medium">{data ? value : '—'}</p>;
  };

  // The boundary wraps only the 招待実績 rows: 紹介者情報, 入会経路 and the refund entry point come
  // from the member record and stay usable when the referral list fails.
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Left column: referrer info + invitee list */}
      <div className="w-full space-y-4 md:w-[60%]">
        {/* Join-route flag */}
        {isReferralEntry && (
          <div className="bg-info/10 border-info/20 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Badge
              variant="outline"
              className="bg-info/15 text-info border-info/20 text-xs font-medium"
            >
              紹介経由
            </Badge>
            <p className="text-info text-xs">この会員は紹介を経由して入会しました。</p>
          </div>
        )}

        {/* Referrer info (who referred this member) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">紹介者情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {referrer ? (
              <div>
                <p className="text-muted-foreground mb-1 text-xs">紹介者</p>
                <Button
                  variant="link"
                  className="h-auto max-w-full min-w-0 justify-start gap-0 p-0 text-sm font-medium"
                  nativeButton={false}
                  render={
                    <Link href={navigate('/members/[id]', referrer.memberId, parentParams)} />
                  }
                >
                  <TextWithTooltip text={referrer.displayName || '—'} />
                  <span className="shrink-0">（{referrer.memberNumber || '—'}）</span>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                紹介者なし（紹介経由の入会ではありません）
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invitee list (who this member referred) */}
        <Card className="gap-0 py-0">
          <CardHeader className="px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">招待実績</CardTitle>
              {data && (
                <Badge variant="secondary" className="text-[10px]">
                  {stats?.totalReferred ?? invitees.length}件
                </Badge>
              )}
            </div>
          </CardHeader>
          <DataStateBoundary
            isLoading={isLoading}
            isError={isError}
            isEmpty={!data}
            onRetry={() => refetch()}
            skeleton={<InviteesSkeleton />}
          >
            {invitees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold first:pl-4">氏名</TableHead>
                    <TableHead className="text-xs font-semibold">会員ID</TableHead>
                    <TableHead className="text-xs font-semibold">入会日</TableHead>
                    <TableHead className="text-xs font-semibold last:pr-4">特典付与</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  className={cn('transition-opacity', showOverlay && 'opacity-50')}
                  aria-busy={showOverlay}
                >
                  {invitees.map((invitee) => (
                    <TableRow
                      key={invitee.memberId}
                      className="hover:bg-accent/50 cursor-pointer"
                      onClick={() =>
                        router.push(navigate('/members/[id]', invitee.memberId, parentParams))
                      }
                    >
                      {/* The name is a real link so the row is reachable by keyboard too. */}
                      <TableCell className="w-full max-w-0 text-sm font-medium first:pl-4">
                        <Button
                          variant="link"
                          className="h-auto max-w-full min-w-0 justify-start p-0 text-sm font-medium"
                          nativeButton={false}
                          render={
                            <Link
                              href={navigate('/members/[id]', invitee.memberId, parentParams)}
                            />
                          }
                        >
                          <TextWithTooltip
                            text={
                              [invitee.lastName, invitee.firstName].filter(Boolean).join(' ') || '—'
                            }
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {invitee.memberNumber || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(invitee.enrolledAt)}</TableCell>
                      <TableCell className="last:pr-4">
                        {invitee.applicationStatus === 'approved' ? (
                          <Badge
                            variant="outline"
                            className="bg-success/15 text-success border-success/20 text-xs font-medium"
                          >
                            付与済み
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-warning/15 text-warning border-warning/20 text-xs font-medium"
                          >
                            未付与
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground text-sm">招待した会員はいません。</p>
              </div>
            )}
          </DataStateBoundary>
          {/* Pagination stays outside the boundary: a failed page must still offer the way back */}
          {pagination && pagination.totalItems > 0 && (
            <TablePagination
              currentPage={page}
              totalPages={pagination.totalPages}
              total={pagination.totalItems}
              limit={pagination.limit}
              onPageChange={setPage}
              isLoading={isFetching}
            />
          )}
        </Card>
      </div>

      {/* Right column: aggregate summary */}
      <div className="w-full space-y-4 md:w-[40%]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">紹介サマリー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">招待人数（合計）</p>
              {renderStat(`${stats?.totalReferred ?? 0}名`)}
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">特典付与済み</p>
              {renderStat(approvedCount === null ? '—' : `${approvedCount}名`)}
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">特典未付与</p>
              {renderStat(
                approvedCount === null
                  ? '—'
                  : `${Math.max(0, (stats?.totalReferred ?? 0) - approvedCount)}名`,
              )}
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-1 text-xs">入会経路</p>
              {isReferralEntry ? (
                <Badge
                  variant="outline"
                  className="bg-info/15 text-info border-info/20 text-xs font-medium"
                >
                  紹介経由
                </Badge>
              ) : (
                <p className="text-muted-foreground text-sm">通常入会</p>
              )}
            </div>
            <Separator />
            {/* FR-S001 ポイント手動返還: staff entry point for refunds the suspension
                    flow could not decide automatically */}
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">
                紹介特典などのポイント値引き分が自動返還されなかった場合に、手動で返還します。
              </p>
              <RoleGatedButton
                allowedRoles={POINT_REFUND_ROLES}
                denyTooltip="ポイント手動返還はManager以上の権限が必要です"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setShowPointRefund(true)}
              >
                ポイントを手動返還
              </RoleGatedButton>
            </div>
          </CardContent>
        </Card>
      </div>

      <PointRefundDialog
        open={showPointRefund}
        onOpenChange={setShowPointRefund}
        memberId={memberId}
        memberName={memberName}
        memberBrand={memberBrand}
      />
    </div>
  );
}
