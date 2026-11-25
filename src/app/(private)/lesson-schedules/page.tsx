'use client';

import { Suspense, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { DataStateBoundary, Empty } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminLessonScheduleControllerAreaDashboardOptions,
  adminLessonScheduleControllerStoreDashboardOptions,
  adminOrganizationControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import { AreaHeatmap } from './_components/area-heatmap';
import { AreaKpiSummary } from './_components/area-kpi-summary';
import { AreaSelect } from './_components/area-select';
import { AreaSummaryTable } from './_components/area-summary-table';
import { KpiSummary } from './_components/kpi-summary';
import {
  AreaKpiSkeleton,
  LessonScheduleKpiSkeleton,
  LessonSchedulePageSkeleton,
  LessonScheduleTableSkeleton,
  LessonScheduleTimelineSkeleton,
  LessonScheduleWeeklyCalendarSkeleton,
} from './_components/lesson-schedule-skeletons';
import { LessonScheduleToolbar } from './_components/lesson-schedule-toolbar';
import { ManualReservationModal } from './_components/manual-reservation-modal';
import { ScheduleChangeModal } from './_components/schedule-change-modal';
import { ScheduleListView } from './_components/schedule-list-view';
import { TimelineView } from './_components/timeline-view';
import { WeeklyCalendarView } from './_components/weekly-calendar-view';
import { LessonScheduleFiltersProvider } from './_contexts/lesson-schedule-filters-context';
import { useLessonScheduleFiltersContext } from './_contexts/lesson-schedule-filters-context';
import type { ScheduleAxis } from './_hooks/use-lesson-schedule-filters.hook';
import {
  type LessonScheduleListQuery,
  lessonScheduleAllPagesOptions,
} from './_utils/lesson-schedule-api.util';

// ---------------------------------------------------------------------------
// Inner page (needs filter context)
// ---------------------------------------------------------------------------

function LessonSchedulePageInner() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { user, isLoading: isUserLoading, hasPermission } = useAuthUser();
  const { currentStoreId, setCurrentStoreId, restrictedStores } = useCurrentStore();
  const isTrainer = user?.role === UserRole.Trainer;
  const isManager = user?.role === UserRole.Manager;
  const isHeadquarter = user?.role === UserRole.Headquarter || user?.role === UserRole.System;
  const canManageSchedule = hasPermission(Permission.LessonsScheduleManage);

  const { filters, setFilters, dateWindow } = useLessonScheduleFiltersContext();

  // A Manager's scope is their managed stores only (API-082 §6.1 — the home store is not added).
  // With none registered every store read answers 403 E-LSC-100, so the page says why instead.
  const managedStoreIds = useMemo(
    () => new Set(isManager ? (user?.managedStoreIds ?? []) : []),
    [isManager, user],
  );
  const hasNoManagedStores = isManager && managedStoreIds.size === 0;

  // The header offers a Manager no 管轄エリア yet (D-01 補足), so their エリア別 covers the areas of
  // their managed stores instead: store → Y-15 territory → the territory's area.
  const managedTerritoryIds = useMemo(
    () =>
      new Set(
        restrictedStores.flatMap((s) =>
          managedStoreIds.has(s.id) && s.territoryId ? [s.territoryId] : [],
        ),
      ),
    [restrictedStores, managedStoreIds],
  );
  const territoryNodesQuery = useQuery({
    ...adminOrganizationControllerListOptions({
      query: { nodeType: 'territory', isActive: true, includeStoreCount: false },
    }),
    enabled: managedTerritoryIds.size > 0,
  });
  const managedAreaIds = useMemo(
    () =>
      new Set(
        (territoryNodesQuery.data?.items ?? []).flatMap((t) =>
          managedTerritoryIds.has(t.id) && t.parentId ? [t.parentId] : [],
        ),
      ),
    [territoryNodesQuery.data, managedTerritoryIds],
  );

  // The header store switcher scopes every page; 「全店舗（本部）」 is HQ's only cross-store state.
  const headerStoreId = currentStoreId === ALL_STORES ? null : currentStoreId;
  const isAllStoresHeader = isHeadquarter && !headerStoreId;
  // FR-001-a: エリア別 is live for HQ with the header wider than one store (a single store selected
  // disables it) and for a Manager whose managed stores sit in an area; never for the other roles.
  const canViewArea = isAllStoresHeader || (isManager && managedAreaIds.size > 0);
  // Trainer is locked to my_schedule; エリア別 falls back to 店舗別 once it is disabled
  const effectiveAxis = isTrainer
    ? 'my_schedule'
    : filters.axis === 'area' && !canViewArea
      ? 'store'
      : filters.axis;
  // 店舗別 shows ONE store (FR-001-a); on 全店舗 that store is picked from the area's stores
  const picksStore = isAllStoresHeader && effectiveAxis === 'store';

  // --- Queries ---
  // The area backs the エリア別 tab and the store picker of 店舗別 on 全店舗
  const needsArea = effectiveAxis === 'area' || picksStore;
  const areaNodesQuery = useQuery({
    ...adminOrganizationControllerListOptions({
      query: { nodeType: 'area', isActive: true, includeStoreCount: false },
    }),
    enabled: needsArea,
  });
  const areas = useMemo(() => {
    const items = areaNodesQuery.data?.items ?? [];
    return isManager ? items.filter((a) => managedAreaIds.has(a.id)) : items;
  }, [areaNodesQuery.data, isManager, managedAreaIds]);
  // An `area_id` from the URL outside the list falls back to the first area
  const areaId = areas.some((a) => a.id === filters.area_id)
    ? filters.area_id
    : (areas[0]?.id ?? null);

  const areaDashboardQuery = useQuery({
    ...adminLessonScheduleControllerAreaDashboardOptions({
      query: { areaId: areaId ?? '', date: filters.date },
    }),
    enabled: needsArea && !!areaId,
  });
  const isAreaLoading = areaNodesQuery.isLoading || areaDashboardQuery.isLoading;

  const storeList =
    areaDashboardQuery.data?.storeRows.map((s) => ({ id: s.storeId, name: s.storeName })) ?? [];
  // The picked store, else the area's first (stores with alerts come first)
  const pickedStoreId = storeList.some((s) => s.id === filters.store_id)
    ? filters.store_id
    : (storeList[0]?.id ?? null);
  // The one store the KPI cards and the store calendar describe, if any. A Manager without managed
  // stores has none: the header's home-store fallback is outside their scope and answers 403.
  const scopedStoreId = hasNoManagedStores
    ? null
    : (headerStoreId ?? (picksStore ? pickedStoreId : null));

  const storeDashboardQuery = useQuery({
    ...adminLessonScheduleControllerStoreDashboardOptions({
      query: { storeId: scopedStoreId ?? '', date: filters.date },
    }),
    enabled: !!scopedStoreId && effectiveAxis !== 'area',
  });

  // API-112 §4.1: `view=store` needs a `storeId` (400 E-VAL-001 without it, for every role). With
  // no store to show (no area registered, so nothing to pick on 全店舗) there is no valid scope —
  // ask for a store instead of sending an invalid query.
  const listScope =
    effectiveAxis === 'my_schedule'
      ? { view: 'trainer-self' as const }
      : effectiveAxis === 'store' && scopedStoreId
        ? { view: 'store' as const, storeId: scopedStoreId }
        : null;
  const isPickingStore = picksStore && isAreaLoading;
  const needsStoreSelection = effectiveAxis === 'store' && listScope === null && !isPickingStore;

  // 比較表の行・ヒートマップのセル → the store's 店舗別 tab (FR-001-a 遷移). A Manager's 店舗別 is the
  // header store, so the header follows the click; their area can hold stores outside their scope.
  const openStore = (storeId: string) => {
    if (isManager) {
      if (!managedStoreIds.has(storeId)) {
        toast.info('管轄店舗ではないため、店舗別を表示できません');
        return;
      }
      setCurrentStoreId(storeId);
    }
    setFilters({ axis: 'store', store_id: storeId });
  };

  const listQuery: LessonScheduleListQuery = {
    from: dateWindow.from,
    to: dateWindow.to,
    sort: 'scheduledDate',
    order: 'asc',
    // Cancelled sessions stay on the calendar (struck through) so they can still be opened.
    // `includeCancelled` is the pre-spec toggle; `isCancelled` cannot mix both in one call.
    includeCancelled: true,
    ...(listScope ?? {}),
  };

  const schedulesQuery = useQuery({
    ...lessonScheduleAllPagesOptions(listQuery),
    enabled: !isUserLoading && listScope !== null,
  });

  // 店舗別 of a Manager without managed stores has no store to show (D-01 No6)
  const showsNoManagedStores = hasNoManagedStores && effectiveAxis === 'store';

  // A store outside the caller's scope answers 403 E-LSC-100 — a retry can only fail again
  const isScopeDenied =
    effectiveAxis === 'store' &&
    [storeDashboardQuery.error, schedulesQuery.error].some((e) => getApiErrorStatus(e) === 403);
  const isStoreViewBlocked = showsNoManagedStores || isScopeDenied;

  const [changeTarget, setChangeTarget] = useState<LessonScheduleListItemDto | null>(null);
  const [manualReservationOpen, setManualReservationOpen] = useState(false);

  const handleScheduleClick = (schedule: LessonScheduleListItemDto) => {
    router.push(withReturnTo(navigate('/lesson-schedules/[id]/reservations', schedule.id)));
  };

  // Filter options come from the whole loaded window; the studio / trainer filters then run
  // client-side so the option lists don't collapse to the current selection.
  const allSchedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const uniqueInstructors = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    allSchedules.forEach((s) =>
      s.trainerIds.forEach((id, i) => {
        if (!byId.has(id)) byId.set(id, { id, name: s.trainerNames[i] || id });
      }),
    );
    return Array.from(byId.values());
  }, [allSchedules]);
  const uniqueStudios = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    allSchedules.forEach((s) => {
      if (s.studioId && !byId.has(s.studioId)) {
        byId.set(s.studioId, { id: s.studioId, name: s.studioName ?? s.studioId });
      }
    });
    return Array.from(byId.values());
  }, [allSchedules]);
  const schedules = useMemo(
    () =>
      allSchedules.filter(
        (s) =>
          (!filters.studio_id || s.studioId === filters.studio_id) &&
          (!filters.instructor_id || s.trainerIds.includes(filters.instructor_id)),
      ),
    [allSchedules, filters.studio_id, filters.instructor_id],
  );
  // An unfiltered day with nothing on it is 「no lessons that day」, not a search miss (D-01 No1)
  const isUnfilteredDay = filters.view === 'day' && !filters.studio_id && !filters.instructor_id;

  // 要対応 alerts exist per store × day (store dashboard), keyed for the schedule views
  const alertsById = useMemo(
    () => new Map((storeDashboardQuery.data?.alerts.items ?? []).map((a) => [a.scheduleId, a])),
    [storeDashboardQuery.data],
  );

  if (isUserLoading) {
    return <LessonSchedulePageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="予約管理"
        actions={
          <div className="flex items-center gap-2">
            <RoleGatedButton
              requiredPermission={Permission.LessonsReservationManage}
              denyTooltip="予約手動入力の権限がありません"
              variant="outline"
              size="sm"
              onClick={() => setManualReservationOpen(true)}
            >
              手動予約入力
            </RoleGatedButton>
            <RoleGatedButton
              requiredPermission={Permission.LessonsScheduleManage}
              denyTooltip="スケジュール登録の権限がありません"
              size="sm"
              onClick={() => router.push(withReturnTo(navigate('/lesson-schedules/create')))}
            >
              <Plus className="size-4" />
              スケジュール登録
            </RoleGatedButton>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-4">
        {/* View tabs (FR-001-a) */}
        <Tabs
          value={effectiveAxis}
          onValueChange={(v) => {
            if (!isTrainer) setFilters({ axis: v as ScheduleAxis });
          }}
          className="shrink-0 gap-0"
        >
          <TabsList variant="line">
            <TabsTrigger value="store" disabled={isTrainer} className="text-sm">
              店舗別
            </TabsTrigger>
            <TabsTrigger value="my_schedule" className="text-sm">
              自分のスケジュール
            </TabsTrigger>
            {canViewArea ? (
              <TabsTrigger value="area" className="text-sm">
                エリア別
              </TabsTrigger>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <TabsTrigger value="area" disabled className="text-sm">
                      エリア別
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      {/* FR-001-a 異常系: a Manager outside the org hierarchy — no managed store, or
                          none of them under an area — reads 「所属エリアが設定されていません」 */}
                      {isHeadquarter
                        ? 'ヘッダーで選択中の店舗が表示されています。エリア別はヘッダーを『全店舗（本部）』に切替えてください'
                        : isManager
                          ? '所属エリアが設定されていません'
                          : 'エリア別を参照する権限がありません'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </TabsList>
        </Tabs>

        {/* エリア別: area picker + 横断KPI + 店舗比較表 + 時間帯ヒートマップ (FR-001-a) */}
        {effectiveAxis === 'area' && (
          <div className="space-y-4">
            <AreaSelect
              areas={areas}
              value={areaId}
              disabled={areaNodesQuery.isLoading}
              onChange={(id) => setFilters({ area_id: id, store_id: null })}
            />
            <DataStateBoundary
              isLoading={isAreaLoading}
              isError={areaNodesQuery.isError || areaDashboardQuery.isError}
              isEmpty={!areaDashboardQuery.data?.storeRows.length}
              onRetry={() =>
                areaNodesQuery.isError ? areaNodesQuery.refetch() : areaDashboardQuery.refetch()
              }
              skeleton={<AreaKpiSkeleton />}
              emptyTitle={
                areas.length === 0 ? '所属エリアが設定されていません' : 'エリアデータがありません'
              }
            >
              {areaDashboardQuery.data && (
                <div className="space-y-4">
                  <AreaKpiSummary crossKpi={areaDashboardQuery.data.crossKpi} />
                  <AreaSummaryTable
                    stores={areaDashboardQuery.data.storeRows}
                    onStoreClick={openStore}
                  />
                  <AreaHeatmap rows={areaDashboardQuery.data.heatmap} onStoreClick={openStore} />
                </div>
              )}
            </DataStateBoundary>
          </div>
        )}

        {/* 店舗別 the caller has no scope over: one notice in place of the KPIs and the calendar */}
        {showsNoManagedStores && (
          <Empty
            variant="empty"
            title="管轄店舗が登録されていません"
            description="本部に管轄店舗の登録を依頼してください。登録後、管轄店舗のスケジュールが表示されます。"
          />
        )}
        {isScopeDenied && (
          <DataStateBoundary
            isLoading={false}
            isError
            isEmpty={false}
            errorTitle="アクセス権限がありません"
            errorDescription="この店舗のスケジュールを表示する権限がありません。"
          />
        )}

        {/* KPI Summary — the store dashboard describes one store */}
        {effectiveAxis !== 'area' && !isStoreViewBlocked && scopedStoreId && (
          <DataStateBoundary
            isLoading={storeDashboardQuery.isLoading}
            isError={storeDashboardQuery.isError}
            isEmpty={!storeDashboardQuery.data}
            onRetry={() => storeDashboardQuery.refetch()}
            skeleton={<LessonScheduleKpiSkeleton />}
            emptyTitle="KPIデータがありません"
          >
            {storeDashboardQuery.data && <KpiSummary dashboard={storeDashboardQuery.data} />}
          </DataStateBoundary>
        )}

        {effectiveAxis !== 'area' && !isStoreViewBlocked && (
          <>
            {/* Toolbar: date nav + view mode + filters */}
            <LessonScheduleToolbar
              stores={picksStore ? storeList : []}
              selectedStoreId={scopedStoreId}
              instructors={uniqueInstructors}
              studios={uniqueStudios}
              isTrainer={isTrainer}
            />

            {/* Schedule view */}
            <DataStateBoundary
              isLoading={schedulesQuery.isLoading || isPickingStore}
              isError={schedulesQuery.isError}
              isEmpty={needsStoreSelection || (schedules.length === 0 && !schedulesQuery.isLoading)}
              onRetry={() => schedulesQuery.refetch()}
              skeleton={
                filters.view === 'week' ? (
                  <LessonScheduleWeeklyCalendarSkeleton />
                ) : filters.view === 'list' ? (
                  <LessonScheduleTableSkeleton />
                ) : (
                  <LessonScheduleTimelineSkeleton />
                )
              }
              emptyTitle={
                needsStoreSelection
                  ? '店舗を選択してください'
                  : isUnfilteredDay
                    ? 'この日のレッスンはありません'
                    : 'レッスンが見つかりません'
              }
              emptyDescription={
                needsStoreSelection
                  ? 'エリアが登録されていないため、全店舗ではスケジュールを表示できません。ヘッダーで店舗を選択してください。'
                  : isUnfilteredDay
                    ? undefined
                    : '条件を変更して再検索してください'
              }
            >
              {filters.view === 'day' && (
                <TimelineView
                  schedules={schedules}
                  alertsById={alertsById}
                  isLoading={schedulesQuery.isFetching && !schedulesQuery.data}
                  showBookedMembers={effectiveAxis === 'my_schedule'}
                  onScheduleClick={handleScheduleClick}
                  onEditClick={setChangeTarget}
                  canEdit={canManageSchedule}
                />
              )}
              {filters.view === 'week' && (
                <WeeklyCalendarView
                  schedules={schedules}
                  alertsById={alertsById}
                  weekStart={filters.week_start}
                  isLoading={schedulesQuery.isFetching && !schedulesQuery.data}
                  onScheduleClick={handleScheduleClick}
                  onEditClick={setChangeTarget}
                  canEdit={canManageSchedule}
                />
              )}
              {filters.view === 'list' && (
                <ScheduleListView
                  schedules={schedules}
                  alertsById={alertsById}
                  isLoading={schedulesQuery.isFetching && !schedulesQuery.data}
                  onScheduleClick={handleScheduleClick}
                />
              )}
            </DataStateBoundary>
          </>
        )}
      </div>

      {/* Schedule change modal */}
      <ScheduleChangeModal
        open={!!changeTarget}
        schedule={changeTarget}
        instructorOptions={uniqueInstructors}
        onOpenChange={(open) => {
          if (!open) setChangeTarget(null);
        }}
      />

      {/* Manual reservation modal (FR-006, API-113) — the shown day's sessions in the list scope */}
      <ManualReservationModal
        open={manualReservationOpen}
        onOpenChange={setManualReservationOpen}
        date={filters.date}
        scope={listScope}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper — provides filter context
// ---------------------------------------------------------------------------

export default function LessonSchedulesPage() {
  return (
    <Suspense fallback={<LessonSchedulePageSkeleton />}>
      <LessonScheduleFiltersProvider>
        <LessonSchedulePageInner />
      </LessonScheduleFiltersProvider>
    </Suspense>
  );
}
