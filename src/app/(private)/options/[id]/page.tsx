'use client';

import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { LockKeyhole, Pencil } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import { adminOptionControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  OPTION_LIST_STATUS_LABELS,
  OPTION_STATUS_BADGE_CLASSES,
  isLockerContractType,
} from '../_constants/constants';
import { BasicInfoTab } from './_components/basic-info-tab';
import { HistoryTab } from './_components/history-tab';

export default function OptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/options'));
  const withReturnTo = useWithReturnTo();

  const optionId = params.id as string;
  const [activeTab, setActiveTab] = useState('basic');

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminOptionControllerDetailOptions({ path: { optionId } }),
  });

  if (isLoading) {
    return <DataStateBoundary isLoading isEmpty={false} />;
  }

  // An unknown id (404 E-OPT-001) or a malformed one (400 on `optionId`) is a not-found, not a
  // failure worth retrying.
  const isNotFound = isRecordNotFoundError(error, 'optionId');

  if (isError || !data) {
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !data}
        onRetry={() => refetch()}
        emptyTitle="オプションが見つかりません"
      />
    );
  }

  const option: OptionDetailDto = data;
  const status = option.isActive ? 'active' : 'inactive';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackToListLink label="オプション管理に戻る" listPath={navigate('/options')} />}
        title={option.name}
        badge={
          <>
            <Badge
              variant="outline"
              className={`gap-1 text-xs font-medium ${OPTION_STATUS_BADGE_CLASSES[status]}`}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {OPTION_LIST_STATUS_LABELS[status]}
            </Badge>
            {isLockerContractType(option) && (
              <Badge
                variant="outline"
                className="bg-info/15 text-info border-info/20 gap-1 text-xs font-medium"
              >
                <LockKeyhole className="size-3" />
                ロッカー契約種類
              </Badge>
            )}
          </>
        }
        actions={
          // G-02 has no delete FR — retiring an option is done by switching it to 無効.
          <div className="flex items-center gap-2">
            <RoleGatedButton
              requiredPermission={Permission.OptionsEdit}
              className="gap-1"
              onClick={() =>
                router.push(withReturnTo(navigate('/options/[id]/edit', optionId), backToListHref))
              }
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedButton>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="history">変更履歴</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <BasicInfoTab option={option} />
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <HistoryTab optionId={optionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
