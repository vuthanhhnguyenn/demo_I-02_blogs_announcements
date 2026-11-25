'use client';

import { useParams, useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminStaffPermissionControllerGetStaffOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { StaffStatus } from '../_constants/constants';
import { LoginHistoryTab } from './_components/login-history-tab';
import { PermissionHistoryTab } from './_components/permission-history-tab';
import { StaffDetailHeader } from './_components/staff-detail-header';
import { StaffDetailSkeleton } from './_components/staff-detail-skeleton';
import { StaffPermissionCard } from './_components/staff-permission-card';
import { StaffPersonalInfoCard } from './_components/staff-personal-info-card';
import { StaffStatusCard } from './_components/staff-status-card';

export default function StaffDetailPage() {
  const params = useParams();
  const staffId = params.id as string;

  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/staffs'));
  const withReturnTo = useWithReturnTo();
  const { hasRole } = useAuthUser();
  const canViewLoginHistory = hasRole([UserRole.Headquarter, UserRole.System]);

  const {
    data: staff,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    adminStaffPermissionControllerGetStaffOptions({
      path: { id: staffId },
    }),
  );

  const handleEdit = () => {
    router.push(withReturnTo(navigate('/staffs/[id]/edit', staffId), backToListHref));
  };
  const handleBack = () => {
    router.push(navigate('/staffs'));
  };

  if (isLoading) return <StaffDetailSkeleton />;

  // An unknown / unreachable id answers 404 E-STF-001 — that is a not-found, not a system
  // failure, so it must not read as 「ネットワーク接続を確認…」 with a 再試行 that can only
  // repeat the same 404. Every other status keeps the generic error + retry.
  const isNotFound = getApiErrorStatus(error) === 404;

  if (isError || !staff) {
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !staff}
        onRetry={() => refetch()}
        emptyState={{
          variant: 'empty',
          title: 'スタッフが見つかりません',
          description: '削除されたか、参照できる権限がない可能性があります。',
          action: (
            <Button variant="outline" size="sm" className="text-xs" onClick={handleBack}>
              スタッフ管理に戻る
            </Button>
          ),
        }}
      />
    );
  }

  const fullName = staff.name;
  const staffStatus = staff.status as StaffStatus;

  return (
    <div className="flex flex-1 flex-col">
      <StaffDetailHeader
        staffId={staffId}
        fullName={fullName}
        staffEmail={staff.email}
        staffStatus={staffStatus}
        staffRole={staff.role}
        linkedStoreIds={staff.storeIds}
        onEdit={handleEdit}
        backHref={backToListHref}
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultValue="info" className="gap-4">
          <TabsList variant="line">
            <TabsTrigger value="info">基本情報</TabsTrigger>
            <TabsTrigger value="history">変更履歴</TabsTrigger>
            {canViewLoginHistory && <TabsTrigger value="login-history">ログイン履歴</TabsTrigger>}
          </TabsList>

          <TabsContent value="info">
            <div className="flex flex-col gap-4 xl:flex-row">
              <div className="flex flex-col gap-4 xl:w-[60%]">
                <StaffPersonalInfoCard staff={staff} />
                <StaffPermissionCard staff={staff} />
                {/* The card is unconditional: a missing 備考 shows 「—」 like every other
                    optional value, rather than silently dropping the section. `wrap-break-word`
                    is what makes an unbroken 1000-char note wrap instead of running past
                    the card edge (`whitespace-pre-wrap` alone keeps overflow-wrap: normal). */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">備考</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4">
                    <p className="text-muted-foreground text-sm wrap-break-word whitespace-pre-wrap">
                      {staff.memo ?? '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Deliberately not sticky (decision 2026-09-18, BUG-P2-04-13 withdrawn): the
                  ステータス column scrolls with the rest of the page. */}
              <div className="flex flex-col gap-4 xl:w-[40%]">
                <StaffStatusCard staff={staff} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <PermissionHistoryTab staffId={staffId} />
          </TabsContent>

          {canViewLoginHistory && (
            <TabsContent value="login-history">
              <LoginHistoryTab staffId={staffId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
