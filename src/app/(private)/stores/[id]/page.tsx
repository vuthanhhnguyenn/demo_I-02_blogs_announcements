'use client';

import { useParams, useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import { Pencil, TriangleAlert } from 'lucide-react';
import { parseAsStringEnum, useQueryState } from 'nuqs';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { adminStoreControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, type UserRole } from '@/types/permission.type';

import {
  STORE_STATUS_BADGE_CLASSES,
  STORE_STATUS_DOT_CLASSES,
  STORE_STATUS_LABELS,
} from '../_constants/constants';
import { canEditStore, editStoreDenyReason } from '../_utils/can-edit-store.util';
import { isStoreForbiddenError, isStoreNotFoundError } from '../_utils/store-api.util';
import { FocusableGatedButton } from './_components/focusable-gated-button';
import { AccessSettingsTab } from './_components/tabs/access-settings-tab';
import { BasicInfoTab } from './_components/tabs/basic-info-tab';
import { BusinessSettingsTab } from './_components/tabs/business-settings-tab';
import { ChangeHistoryTab } from './_components/tabs/change-history-tab';
import { ContractTab } from './_components/tabs/contract-tab';
import { StoreMapTab } from './_components/tabs/store-map-tab';

/** An empty role list denies everyone — how a gated button is closed by a row-level rule */
const NO_ROLES: readonly UserRole[] = [];

type StoreDetailTab = 'basic' | 'business' | 'contract' | 'access' | 'map' | 'history';

const TAB_VALUES: StoreDetailTab[] = ['basic', 'business', 'contract', 'access', 'map', 'history'];

export default function StoreDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  // Detail → edit forwards the list URL the detail was opened from (Y-01 Bug No.10)
  const backToListHref = useBackToListHref(navigate('/stores'));
  const withReturnTo = useWithReturnTo();
  const { user, hasPermission } = useAuthUser();
  // Y-02 FR-008 is viewable by System / Headquarter / Manager only (spec.md FR-083); the
  // route answers 403 for the rest, so the tab is hidden rather than left to fail.
  const canViewChangeHistory = hasPermission(Permission.StoresHistoryView);
  // `?tab=` keeps the open tab in the URL (the lessons / lockers detail pattern), so the
  // store-map-setup breadcrumb can land on `?tab=map`. An unknown key falls back to 基本情報,
  // and so does `history` for a role the tab is hidden from.
  const [requestedTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringEnum<StoreDetailTab>(TAB_VALUES).withDefault('basic'),
  );
  const activeTab: StoreDetailTab =
    requestedTab === 'history' && !canViewChangeHistory ? 'basic' : requestedTab;

  const {
    data: store,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id } }),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <DataStateBoundary isLoading isError={false} isEmpty={false} />;
  }

  if (isError || !store) {
    // 403/404 are permission and existence answers, not transient read failures: retrying
    // cannot change either, so they get no retry button (same treatment as /staffs/[id]).
    // Matched on `ErrorResponseDto.code` (`E-AUTH-100` / `E-AUTH-103` / `E-STR-001`), never on
    // the Japanese message body — decision D12.
    if (isStoreForbiddenError(error)) {
      return (
        <DataStateBoundary
          isLoading={false}
          isError
          isEmpty={false}
          errorTitle="アクセス権限がありません"
          errorDescription="この店舗情報を閲覧する権限がありません。"
        />
      );
    }
    if (isStoreNotFoundError(error)) {
      return (
        <DataStateBoundary
          isLoading={false}
          isError
          isEmpty={false}
          errorTitle="店舗が見つかりません"
          errorDescription="この店舗は存在しないか、削除された可能性があります。"
        />
      );
    }

    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError}
        isEmpty={!store}
        onRetry={() => refetch()}
        errorTitle="店舗情報の取得に失敗しました"
      />
    );
  }

  // FR-018: System / Headquarter edit any store, Staff only their own (`canEditStore`). The
  // `stores.edit` permission stays on top so a 職位 without the flag is still denied, with the
  // copy `RoleGatedButton` derives for that case.
  const canEdit = canEditStore(user, store.id);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-50">
      <div className="shrink-0 space-y-4 px-4 pt-6 pb-4 md:px-8">
        <div className="space-y-4">
          <BackToListLink label="店舗管理に戻る" listPath={navigate('/stores')} />
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {/* The header does not scroll, so a 255-char name is clamped to two lines (an
                  unbroken token breaks anywhere) and the full name sits on a tooltip — otherwise
                  it eats the tab content's height at 1024×768 (BUG-U3-07 / BUG-U3-08). */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <h1 className="text-foreground line-clamp-2 min-w-0 text-xl font-bold tracking-tight [overflow-wrap:anywhere]" />
                    }
                  >
                    {store.name}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="text-xs [overflow-wrap:anywhere]">{store.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* FR-002: four-value status pill with a leading dot, same tokens as the list */}
              <Badge
                variant="outline"
                className={`${STORE_STATUS_BADGE_CLASSES[store.status]} gap-1 text-xs font-medium`}
              >
                <span
                  className={`size-1.5 rounded-full ${STORE_STATUS_DOT_CLASSES[store.status]}`}
                />
                {STORE_STATUS_LABELS[store.status]}
              </Badge>
            </div>
            <FocusableGatedButton
              allowedRoles={canEdit ? undefined : NO_ROLES}
              requiredPermission={Permission.StoresEdit}
              denyTooltip={canEdit ? undefined : editStoreDenyReason(user, store.id)}
              size="sm"
              className="shrink-0 gap-1"
              onClick={() =>
                router.push(withReturnTo(navigate('/stores/[id]/edit', store.id), backToListHref))
              }
            >
              <Pencil className="size-4" />
              編集
            </FocusableGatedButton>
          </div>
        </div>

        <Alert className="border-warning/50 bg-warning/15" role="status">
          <TriangleAlert className="text-warning size-4 shrink-0" aria-hidden />
          <AlertDescription className="text-muted-foreground text-xs">
            機能制限や入退館設定の変更は、会員の利用に即時反映されます。
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pb-6 md:px-8">
        <Tabs
          value={activeTab}
          onValueChange={(tab: StoreDetailTab) => void setActiveTab(tab)}
          className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-0 overflow-hidden"
        >
          <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between lg:gap-6">
            <TabsList variant="line">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="business">営業設定</TabsTrigger>
              <TabsTrigger value="contract">契約・料金</TabsTrigger>
              <TabsTrigger value="access">入退館設定</TabsTrigger>
              {/* Y-02 FR-006 / Y-02-05 — every role that can open the store sees it (FR-110) */}
              <TabsTrigger value="map">店舗マップ</TabsTrigger>
              {canViewChangeHistory && <TabsTrigger value="history">変更履歴</TabsTrigger>}
            </TabsList>
          </div>

          {/* `key={activeTab}` remounts the scroll area on every tab switch: Base UI's
              `ScrollArea` only re-measures when the viewport element itself resizes, and the
              viewport is a fixed-height `flex-1` box, so switching from a tall tab to a short
              one (e.g. 基本情報 → 変更履歴) would otherwise leave the vertical scrollbar
              showing over content that no longer overflows. */}
          <ScrollArea key={activeTab} className="mt-4 min-h-0 min-w-0 flex-1 overflow-hidden pr-2">
            <TabsContent value="basic" className="focus-visible:outline-none">
              <BasicInfoTab store={store} />
            </TabsContent>
            <TabsContent value="business" className="focus-visible:outline-none">
              <BusinessSettingsTab storeId={store.id} />
            </TabsContent>
            <TabsContent value="contract" className="focus-visible:outline-none">
              <ContractTab storeId={store.id} storeBrand={store.brandEnum} />
            </TabsContent>
            <TabsContent value="access" className="focus-visible:outline-none">
              <AccessSettingsTab storeId={store.id} storeBrand={store.brandEnum} />
            </TabsContent>
            <TabsContent value="map" className="focus-visible:outline-none">
              <StoreMapTab storeId={store.id} storeName={store.name} />
            </TabsContent>
            {canViewChangeHistory && (
              <TabsContent value="history" className="focus-visible:outline-none">
                <ChangeHistoryTab storeId={store.id} />
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
