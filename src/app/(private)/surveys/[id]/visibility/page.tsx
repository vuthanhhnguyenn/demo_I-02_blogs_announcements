'use client';

import { useParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { useStoreLabel } from '@/components/common/data-select-input';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminQuestionnaireControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { SurveyStoreVisibilityEditor } from '../../_components/survey-store-visibility-editor';

// 権限マトリクス: System/HQ/Manager/Staff ○、Trainer/Observer ×
const VISIBILITY_EDIT_ROLES = [
  UserRole.System,
  UserRole.Headquarter,
  UserRole.Manager,
  UserRole.Staff,
] as const;

export default function SurveyVisibilityPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const backToListHref = useBackToListHref(navigate('/surveys'));
  const withReturnTo = useWithReturnTo();
  const { hasRole } = useAuthUser();
  const { currentStoreId } = useCurrentStore();

  const isAllStores = currentStoreId === ALL_STORES;
  const canEdit = hasRole(VISIBILITY_EDIT_ROLES);

  const {
    data: survey,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminQuestionnaireControllerDetailOptions({ path: { id } }),
    enabled: Boolean(id),
  });
  const { label: currentStoreLabel } = useStoreLabel(isAllStores ? null : currentStoreId);

  // 404 E-QST-001 = unknown survey, 400 = a malformed (non-UUID) id: both are "not found", not a
  // network failure (same rule as lessons/[id]) — only other errors keep the retry state.
  const errorStatus = getApiErrorStatus(error);
  const isNotFound = errorStatus === 404 || errorStatus === 400;

  const currentStoreName = currentStoreLabel ?? '';

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError && !isNotFound}
      isEmpty={isNotFound || !survey}
      onRetry={refetch}
      emptyTitle={isNotFound ? '指定されたアンケートが見つかりません。' : undefined}
      emptyDescription={
        isNotFound ? 'アンケートが存在しないか、削除された可能性があります。' : undefined
      }
    >
      <PageHeader
        breadcrumb={
          <BackLink
            label="アンケート詳細に戻る"
            href={withReturnTo(navigate('/surveys/[id]', id), backToListHref)}
          />
        }
        title="店舗別表示設定"
        subtitle={survey?.name}
      />
      <div className="mx-auto flex max-w-[960px] flex-col gap-6 p-4">
        {!canEdit ? (
          <Alert>
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              店舗別表示設定を操作できるのは 本部・Manager・Staff です。
            </AlertDescription>
          </Alert>
        ) : isAllStores ? (
          <Alert>
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              この設定は店舗ごとに行います。ヘッダーで対象店舗を選択してください。
            </AlertDescription>
          </Alert>
        ) : (
          survey && (
            <SurveyStoreVisibilityEditor
              survey={survey}
              storeId={currentStoreId}
              storeName={currentStoreName}
            />
          )
        )}
      </div>
    </DataStateBoundary>
  );
}
