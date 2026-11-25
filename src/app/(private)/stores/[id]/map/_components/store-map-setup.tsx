'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useMediaUploadOutcome } from '@/hooks/use-media-upload-outcome.hook';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { UnsavedChangesBar } from '@/components/common/unsaved-changes-bar';

import {
  adminLockerControllerListLockersInfiniteOptions,
  adminLockerControllerListLockersQueryKey,
  adminLockerControllerUpdateLockerMutation,
  adminStoreControllerDetailOptions,
  adminStoreControllerGetDetailsOptions,
  adminStoreControllerGetDetailsQueryKey,
  adminStoreControllerUpsertDetailsMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LockerListResponseDto,
  StoreCmsContentUpdateBodyDto,
  StoreCmsDetailDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { canEditStore } from '../../../_utils/can-edit-store.util';
import {
  getStoreErrorCode,
  getStoreErrorStatus,
  isStoreForbiddenError,
  isStoreNotFoundError,
} from '../../../_utils/store-api.util';
import { FloorImageCard, type PlacedCabinet } from './floor-image-card';
import { LockerPanel } from './locker-panel';
import {
  FOLLOW_HEADER_QUERY,
  StoreMapNoAccess,
  StoreMapShell,
  headerScopedStoreMapHref,
} from './store-map-shell';
import {
  IMAGE_CHANGE_LABELS,
  type MapPosition,
  type SavedPosition,
  clamp01,
  useStoreMapDraft,
} from './use-store-map-draft';

/** 配置 starts at the image centre and steps diagonally off an occupied spot (prototype L60-L63) */
const PLACE_START = 0.5;
const PLACE_SHIFT = 0.04;
const PLACE_MAX_SHIFTS = 10;

/** `limit` is capped at 100 by the API; a store with more cabinets is read page by page */
const LOCKER_PAGE_SIZE = 100;

/** Same formats and cap as the card's local check (FR-013); the upload re-checks before presigning */
const FLOOR_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;
const FLOOR_IMAGE_MAX_MB = 5;

/**
 * The full `PUT …/details` body with only the floor map changed. The endpoint clears every
 * omitted field, so the CMS copy the member app shows is sent back as read. Every writable field
 * is listed (the read-only `gymMapUrl` / `updatedBy` / `updatedAt` are not), so a field the BE
 * adds later is a type error here (`Required<…>`) rather than a silent wipe.
 */
function toDetailsBody(
  details: StoreCmsDetailDto,
  gymMapS3Key: string | null,
): Required<StoreCmsContentUpdateBodyDto> {
  return {
    operationTime: details.operationTime,
    staffTime: details.staffTime,
    callCenterInfo: details.callCenterInfo,
    parkingInfo: details.parkingInfo,
    accessInfo: details.accessInfo,
    otherInfo: details.otherInfo,
    indoorViewUrl: details.indoorViewUrl,
    mapUrl: details.mapUrl,
    xUrl: details.xUrl,
    instagramUrl: details.instagramUrl,
    lineUrl: details.lineUrl,
    facebookUrl: details.facebookUrl,
    youtubeUrl: details.youtubeUrl,
    gymMapS3Key,
  };
}

/** Locker write refusals this screen words itself (matched on `ErrorResponseDto.code`, D12) */
const LOCKER_ERROR_CODE = {
  /** 422 — `expectedUpdatedAt` is stale: the cabinet changed since it was read */
  stale: 'E-LOC-006',
  /** 403 — the role may not write cabinets */
  forbidden: 'E-LOC-101',
} as const;

const NO_ACCESS_MESSAGE = {
  role: '店舗マップ設定は本部・System 権限、店舗マネージャー、または所属店舗のスタッフのみ利用できます。',
  otherStore: '所属店舗以外の店舗マップは閲覧・設定できません。',
} as const;

const OFFLINE_SAVE_MESSAGE =
  'オフラインのため保存できませんでした。通信状況を確認してから再度保存してください';

/** A fetch that never got an answer rejects with a TypeError; an HTTP error rejects with its body */
function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

/** 401: the session could not be renewed and the shared interceptor is signing the user out */
function isSessionEndedError(error: unknown): boolean {
  return getStoreErrorStatus(error) === 401;
}

/** Per-cabinet copy for a failed position write (FR-046, FR-047, FR-064) */
function positionSaveErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return '通信エラーのため保存できませんでした';
  const code = getStoreErrorCode(error);
  if (code === LOCKER_ERROR_CODE.stale) return '他の人が変更しました。再読み込みしてください';
  if (code === LOCKER_ERROR_CODE.forbidden || isStoreForbiddenError(error)) {
    return '権限がないため保存できませんでした';
  }
  if (getStoreErrorStatus(error) === 404) return 'このロッカーは削除されたため保存できませんでした';
  return '保存できませんでした';
}

/**
 * 店舗マップ設定 (Y-02-05): the store's floor-plan image and where each locker cabinet stands on
 * it. Ported from the prototype's `store-map-setup.tsx`.
 *
 * - Positions are real data: read from `GET /admin/lockers?storeId=` (`mapX` / `mapY`) and
 *   written per cabinet with `PATCH /admin/lockers/{id}` under the optimistic lock.
 * - The image is the store's CMS floor map: shown from `gymMapUrl`, uploaded through
 *   `POST /media/presign` (tag `store-image`) and stored with `PUT /admin/stores/{id}/details`.
 *
 * Access is an intentional divergence from V0 (which lets every role in and every Staff edit):
 * System / Headquarter edit any store and Staff their own (`canEditStore`); a Manager gets the
 * read-only view; Staff on another store and Trainer / Observer get the permission wall.
 */
export function StoreMapSetup({ storeId }: Readonly<{ storeId: string }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const { currentStoreId, setCurrentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();
  /** Opened through `/stores/map`: the header's store selector drives this screen (FR-004, FR-052) */
  const followsHeader = searchParams.get(FOLLOW_HEADER_QUERY.key) === FOLLOW_HEADER_QUERY.value;

  const canEdit = canEditStore(user, storeId);
  const isNoAccessRole = user?.role === UserRole.Trainer || user?.role === UserRole.Observer;
  const isStaffOnOtherStore = user?.role === UserRole.Staff && !canEdit;
  const canOpen = Boolean(user) && !isNoAccessRole && !isStaffOnOtherStore;

  const storeQuery = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeId } }),
    enabled: canOpen,
  });

  const detailsQuery = useQuery({
    ...adminStoreControllerGetDetailsOptions({ path: { id: storeId } }),
    enabled: canOpen,
  });

  const lockersQuery = useInfiniteQuery({
    ...adminLockerControllerListLockersInfiniteOptions({
      // FR-036: the store's active cabinets only — this screen never lists a retired one
      query: {
        storeId,
        isActive: true,
        limit: LOCKER_PAGE_SIZE,
        sort: 'locationCode',
        order: 'asc',
      },
    }),
    initialPageParam: 1,
    getNextPageParam: ({ pagination }: LockerListResponseDto) =>
      pagination.page < pagination.totalPages ? pagination.page + 1 : undefined,
    enabled: canOpen,
  });

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = lockersQuery;
  // Read every page before showing the panel: a half-read list would miscount 未配置 / 配置済み.
  // A failed page stops the chain (the error state offers 再試行) — re-requesting it on every
  // settle would loop.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const lockerPages = lockersQuery.data?.pages;
  const lockers = useMemo(
    () =>
      lockerPages && !hasNextPage
        ? lockerPages.flatMap((page) => page.items).filter((locker) => locker.isActive)
        : undefined,
    [lockerPages, hasNextPage],
  );

  const map = useStoreMapDraft(lockers, detailsQuery.data?.gymMapUrl);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /** The cabinet 配置 just put down; the hint shows while it stays selected and unmoved */
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  /** Why each cabinet's last write failed — shown on its row until the next save or discard */
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  /** A save write answered 401 — the shared interceptor is already redirecting to the login */
  const [saveHitSessionEnd, setSaveHitSessionEnd] = useState(false);
  const runSave = useInFlightGuard();

  // A read-only user can produce no draft, but gate on `canEdit` anyway so no guard ever arms
  const isDirty = canEdit && map.isDirty;
  // Once the session has ended the draft can no longer be saved, and the leave guard must stand
  // aside: kept armed, every redirect to the login re-raises the browser's leave prompt, and
  // choosing to stay there re-triggers the redirect (BUG-U8-06). The bar itself stays visible.
  const sessionEnded =
    saveHitSessionEnd ||
    [storeQuery.error, detailsQuery.error, lockersQuery.error].some(isSessionEndedError);
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty && !sessionEnded);

  // --- header store switch (FR-052) ---
  const seenHeaderStoreIdRef = useRef(currentStoreId);
  useEffect(() => {
    if (!followsHeader) return;
    // The header scope settles while it loads; only a later change is the user's switch
    if (isStoreScopeLoading) {
      seenHeaderStoreIdRef.current = currentStoreId;
      return;
    }
    if (currentStoreId === seenHeaderStoreIdRef.current) return;
    seenHeaderStoreIdRef.current = currentStoreId;
    if (currentStoreId === storeId) return;
    const href =
      currentStoreId === ALL_STORES
        ? navigate('/stores/map')
        : headerScopedStoreMapHref(currentStoreId);
    confirmDiscard(
      () => router.replace(href),
      // 編集を続ける: the header switch is undone too, so the header names the store still on screen
      () => setCurrentStoreId(storeId),
    );
  }, [
    followsHeader,
    isStoreScopeLoading,
    currentStoreId,
    storeId,
    confirmDiscard,
    router,
    setCurrentStoreId,
  ]);

  const { uploadFile } = useMediaUploadOutcome({
    tag: 'store-image',
    maxSizeMB: FLOOR_IMAGE_MAX_MB,
    acceptedTypes: FLOOR_IMAGE_TYPES,
  });

  // A refusal rides the shared MutationCache toast
  // `networkMode: 'always'`: offline, the default mode pauses a mutation until the connection
  // returns, which left the save stuck on 「保存中...」 (BUG-U8-05); this way the write fails and the
  // draft stays 未保存.
  const upsertDetails = useMutation({
    ...adminStoreControllerUpsertDetailsMutation(),
    networkMode: 'always',
  });

  const updateLocker = useMutation({
    ...adminLockerControllerUpdateLockerMutation(),
    networkMode: 'always',
    // Failures are reported once, per cabinet, by `handleSave` — not one shared toast per write
    meta: { suppressErrorToast: true },
  });

  // --- selection ---
  /** Selecting another cabinet, or clearing the selection, ends the placement hint (L359-L363) */
  function selectCabinet(id: string | null) {
    setSelectedId(id);
    if (id !== justPlacedId) setJustPlacedId(null);
  }

  /** A drag or arrow-key move: the moved cabinet is selected and the hint has done its job */
  function handleMoveStart(id: string) {
    setSelectedId(id);
    setJustPlacedId(null);
  }

  // --- placement (L365-L389) ---
  function placeCabinet(id: string) {
    if (!map.draftImage) return;
    const others = map.cabinets
      .map((cabinet) => (cabinet.id === id ? null : map.draft[cabinet.id]))
      .filter((position): position is MapPosition => Boolean(position));
    const position = { x: PLACE_START, y: PLACE_START };
    for (let i = 0; i < PLACE_MAX_SHIFTS; i++) {
      const occupied = others.some(
        (other) => Math.hypot(other.x - position.x, other.y - position.y) <= PLACE_SHIFT,
      );
      if (!occupied) break;
      position.x = clamp01(position.x + PLACE_SHIFT);
      position.y = clamp01(position.y + PLACE_SHIFT);
    }
    map.place(id, position);
    setSelectedId(id);
    setJustPlacedId(id);
  }

  function unplaceCabinet(id: string) {
    map.unplace(id);
    if (id === justPlacedId) setJustPlacedId(null);
  }

  function removeImage() {
    map.removeImage();
    setJustPlacedId(null);
    setImageError(null);
  }

  // --- save / discard (L335-L357) ---
  /** 変更を保存: one save at a time, however fast the clicks land (BUG-U8-04) */
  function requestSave() {
    // `handleSave` reports its own failures; this only keeps a stray rejection from going unhandled
    runSave(handleSave).catch(() => undefined);
  }

  async function handleSave() {
    // Offline, nothing would be sent: say so and keep the draft as it is (FR-046)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error(OFFLINE_SAVE_MESSAGE);
      return;
    }
    setIsSaving(true);
    try {
      await writeDraft();
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * FR-085: the image is written first (presign → S3 PUT → PUT …/details), the positions only
   * after it is stored — so a cabinet placed on a new image is never stored against an image that
   * failed. When the image step fails nothing else is written and the whole draft stays 未保存.
   */
  async function writeDraft() {
    const dirtyIds = [...map.dirtyIds];
    const imageChanged = map.imageChange !== null;
    const nameOf = (id: string) => map.cabinets.find((cabinet) => cabinet.id === id)?.name ?? id;

    const imageSaved = imageChanged ? await saveImage(dirtyIds.length > 0) : false;
    if (imageChanged && !imageSaved) return;

    const results = await Promise.allSettled(
      dirtyIds.map(async (id): Promise<SavedPosition> => {
        const position = map.draft[id] ?? null;
        const updated = await updateLocker.mutateAsync({
          path: { lockerId: id },
          // Written as a pair; both null unplaces the cabinet
          body: {
            mapX: position?.x ?? null,
            mapY: position?.y ?? null,
            expectedUpdatedAt: map.versions[id],
          },
        });
        return { id, position, updatedAt: updated.updatedAt };
      }),
    );

    const saved: SavedPosition[] = [];
    const failures: Record<string, string> = {};
    results.forEach((result, index) => {
      const id = dirtyIds[index]!;
      if (result.status === 'fulfilled') saved.push(result.value);
      else failures[id] = positionSaveErrorMessage(result.reason);
    });
    if (
      results.some((result) => result.status === 'rejected' && isSessionEndedError(result.reason))
    ) {
      setSaveHitSessionEnd(true);
    }

    // Whatever succeeded becomes saved; failures stay 未保存 in the draft (FR-046)
    map.markSaved({ positions: saved, image: imageSaved });
    setSaveErrors(failures);
    setJustPlacedId(null);

    // FR-048: the detail's 店舗マップ tab (and this screen's saved state) re-read the positions.
    // `storeId` is required on this endpoint; a key with only it partially matches every list
    // and infinite variant for this store.
    void queryClient.invalidateQueries({
      queryKey: adminLockerControllerListLockersQueryKey({ query: { storeId } }),
    });

    const failedIds = Object.keys(failures);
    if (failedIds.length > 0) {
      toast.error(`ロッカーの位置を保存できませんでした（${failedIds.map(nameOf).join('・')}）`);
      return;
    }
    const count = saved.length;
    toast.success(
      imageChanged
        ? count > 0
          ? `フロア図とロッカーの位置を保存しました（${count}台）`
          : 'フロア図を保存しました'
        : `ロッカーの位置を保存しました（${count}台）`,
    );
  }

  /**
   * Uploads a picked image (a removal uploads nothing) and writes the whole CMS row back with the
   * new `gymMapS3Key`. Resolves false on failure, which leaves the image change 未保存.
   * `positionsPending`: the upload's failure toast also says the positions were not written.
   */
  async function saveImage(positionsPending: boolean): Promise<boolean> {
    const details = detailsQuery.data;
    if (!details) return false;

    let gymMapS3Key: string | null = null;
    const file = map.draftImage?.file;
    if (file) {
      const outcome = await uploadFile(file);
      if (!outcome.ok) {
        const reason =
          outcome.reason === 'network'
            ? 'フロア図をアップロードできませんでした（通信エラー）'
            : 'フロア図をアップロードできませんでした';
        toast.error(positionsPending ? `${reason}。ロッカーの位置も保存していません` : reason);
        return false;
      }
      gymMapS3Key = outcome.s3Key;
    }

    try {
      await upsertDetails.mutateAsync({
        path: { id: storeId },
        body: toDetailsBody(details, gymMapS3Key),
      });
    } catch (error) {
      // The refusal itself is toasted by the shared MutationCache
      if (isSessionEndedError(error)) setSaveHitSessionEnd(true);
      return false;
    }
    void queryClient.invalidateQueries({
      queryKey: adminStoreControllerGetDetailsQueryKey({ path: { id: storeId } }),
    });
    return true;
  }

  function handleDiscard() {
    map.discard();
    selectCabinet(null);
    setJustPlacedId(null);
    setImageError(null);
    setSaveErrors({});
    toast.success('変更を破棄しました');
  }

  const navigateGuarded = (href: string) => confirmDiscard(() => router.push(href));

  // --- states before the map ---
  // The role is known only once auth resolves; deciding earlier would flash the wall
  if (isAuthLoading) {
    return (
      <StoreMapShell>
        <DataStateBoundary isLoading isEmpty={false} />
      </StoreMapShell>
    );
  }

  if (!canOpen) {
    return (
      <StoreMapShell>
        <StoreMapNoAccess
          message={isStaffOnOtherStore ? NO_ACCESS_MESSAGE.otherStore : NO_ACCESS_MESSAGE.role}
        />
      </StoreMapShell>
    );
  }

  const store = storeQuery.data;

  if (storeQuery.isError || !store) {
    // A permission or existence answer is not a transient failure, so it gets no retry
    if (isStoreForbiddenError(storeQuery.error)) {
      return (
        <StoreMapShell>
          <StoreMapNoAccess message={NO_ACCESS_MESSAGE.otherStore} />
        </StoreMapShell>
      );
    }
    return (
      <StoreMapShell>
        {isStoreNotFoundError(storeQuery.error) ? (
          // Never an unnamed empty map for a store that does not exist (spec Edge Cases)
          <DataStateBoundary
            isLoading={false}
            isError
            isEmpty={false}
            errorTitle="店舗が見つかりません"
            errorDescription="この店舗は存在しないか、削除された可能性があります。"
          />
        ) : (
          <DataStateBoundary
            isLoading={storeQuery.isLoading}
            isError={storeQuery.isError}
            isEmpty={false}
            onRetry={() => void storeQuery.refetch()}
            errorTitle="店舗情報の取得に失敗しました"
          />
        )}
      </StoreMapShell>
    );
  }

  const storeCrumb = { id: store.id, name: store.name };

  if (!lockers || !detailsQuery.data) {
    // A 403 on the store's cabinets or floor map is a permission answer, not a network failure
    // (e.g. a Manager on a store outside their scope — BUG-U8-07): the wall, with no retry
    if (isStoreForbiddenError(lockersQuery.error) || isStoreForbiddenError(detailsQuery.error)) {
      return (
        <StoreMapShell store={storeCrumb}>
          <StoreMapNoAccess message={NO_ACCESS_MESSAGE.otherStore} />
        </StoreMapShell>
      );
    }
    const isError = lockersQuery.isError || detailsQuery.isError;
    return (
      <StoreMapShell store={storeCrumb}>
        <DataStateBoundary
          isLoading={!isError}
          isError={isError}
          isEmpty={false}
          onRetry={() => {
            if (lockersQuery.isError) void lockersQuery.refetch();
            if (detailsQuery.isError) void detailsQuery.refetch();
          }}
          errorTitle="店舗マップの取得に失敗しました"
        />
      </StoreMapShell>
    );
  }

  // --- derived view state ---
  const placedCabinets: PlacedCabinet[] = map.cabinets.flatMap((cabinet) => {
    const position = map.draft[cabinet.id];
    return position ? [{ ...cabinet, position }] : [];
  });
  const placedIds = new Set(placedCabinets.map((cabinet) => cabinet.id));
  const justPlacedName =
    justPlacedId && selectedId === justPlacedId && placedIds.has(justPlacedId)
      ? (map.cabinets.find((cabinet) => cabinet.id === justPlacedId)?.name ?? null)
      : null;

  // 「未保存の変更があります（位置 2台・フロア画像の差し替え）」 — positions first (L317-L321)
  const unsavedParts = [
    map.dirtyIds.size > 0 ? `位置 ${map.dirtyIds.size}台` : null,
    map.imageChange ? `フロア画像の${IMAGE_CHANGE_LABELS[map.imageChange]}` : null,
  ].filter((part): part is string => part !== null);

  return (
    <>
      <StoreMapShell
        store={storeCrumb}
        onNavigate={navigateGuarded}
        footer={
          isDirty && (
            <UnsavedChangesBar
              message={`未保存の変更があります（${unsavedParts.join('・')}）`}
              isSaving={isSaving}
              onSave={requestSave}
              onDiscard={handleDiscard}
            />
          )
        }
      >
        <div className="flex items-start gap-4">
          <FloorImageCard
            storeName={store.name}
            canEdit={canEdit}
            draftImage={map.draftImage}
            imageChange={map.imageChange}
            imageError={imageError}
            placed={placedCabinets}
            dirtyIds={map.dirtyIds}
            selectedId={selectedId}
            hoveredId={hoveredId}
            justPlacedName={justPlacedName}
            onImageAccepted={map.setImage}
            onImageError={setImageError}
            onRemoveImage={removeImage}
            onSelect={selectCabinet}
            onHoverChange={setHoveredId}
            onMoveStart={handleMoveStart}
            onMove={map.move}
          />
          <LockerPanel
            cabinets={map.cabinets}
            placedIds={placedIds}
            dirtyIds={map.dirtyIds}
            saveErrors={saveErrors}
            selectedId={selectedId}
            hoveredId={hoveredId}
            canEdit={canEdit}
            hasImage={map.draftImage !== null}
            onSelect={selectCabinet}
            onHoverChange={setHoveredId}
            onPlace={placeCabinet}
            onUnplace={unplaceCabinet}
          />
        </div>
      </StoreMapShell>
    </>
  );
}
