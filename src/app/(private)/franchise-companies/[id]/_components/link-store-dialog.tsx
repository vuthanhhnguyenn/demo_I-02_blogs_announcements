'use client';

import { useMemo, useRef, useState } from 'react';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import {
  adminFcCompanyControllerAssignStoreMutation,
  adminFcCompanyControllerDetailQueryKey,
  adminFcCompanyControllerHistoryQueryKey,
  adminFcCompanyControllerListQueryKey,
  adminFcCompanyControllerListStoresQueryKey,
  adminStoreControllerListInfiniteOptions,
  adminStoreControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  FcCompanyDetailDto,
  StoreListResponseDto,
  StoreSummaryDto,
} from '@/lib/api-real/types.gen';

import { FC_COMPANY_ERROR_CODE, getFcCompanyErrorCode } from '../../_utils/fc-company-api.util';
import { FRANCHISE_COMPANY_TAB_LIMIT, getPrefectureLabel } from '../_constants/detail.constants';
import { RealBrandBadge } from './real-brand-badge';

const SEARCH_DEBOUNCE_MS = 300;
/** GET /admin/stores rejects a longer keyword with 400 */
const SEARCH_KEYWORD_MAX_LENGTH = 100;
const DIRECT_OPERATOR_LABEL = '直営';

/** Stores the BE refreshes the candidate list for (the store moved / closed / vanished meanwhile) */
const STALE_CANDIDATE_CODES = new Set<string>([
  FC_COMPANY_ERROR_CODE.storeClosed,
  FC_COMPANY_ERROR_CODE.storeNotFound,
]);

interface LinkStoreDialogProps {
  company: FcCompanyDetailDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function operatorLabel(store: StoreSummaryDto) {
  if (!store.fcCompanyId) return DIRECT_OPERATOR_LABEL;
  return store.fcCompanyName ?? '—';
}

export function LinkStoreDialog({ company, open, onOpenChange }: Readonly<LinkStoreDialogProps>) {
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword.trim(), SEARCH_DEBOUNCE_MS);
  // Y-03 FR-005: a store belongs to one operating company — linking another company's store
  // moves it, so that case is confirmed first (user decision B4)
  const [reassignTarget, setReassignTarget] = useState<StoreSummaryDto | null>(null);

  // D11: no linkable-stores endpoint — search the store master, then drop stores already on
  // this company and closed stores (the BE would refuse them with E-FC-004). GET /admin/stores
  // can't exclude either server-side, so a single page filtered in the browser would hide
  // linkable stores past it — page through the whole result instead.
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isFetching, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...adminStoreControllerListInfiniteOptions({
        query: {
          keyword: debouncedKeyword || undefined,
          limit: FRANCHISE_COMPANY_TAB_LIMIT,
          sort: 'code',
          order: 'asc',
        },
      }),
      enabled: open,
      placeholderData: keepPreviousData,
      initialPageParam: 1,
      getNextPageParam: (lastPage: StoreListResponseDto, allPages: StoreListResponseDto[]) => {
        const loadedPages = allPages.length;
        return loadedPages < lastPage.pagination.totalPages ? loadedPages + 1 : undefined;
      },
    });
  const candidates = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? []).filter(
        (store) => store.fcCompanyId !== company.id && store.status !== 'closed',
      ),
    [data, company.id],
  );
  // The sentinel stays mounted even while every loaded row is filtered out, so a page with no
  // candidates keeps pulling the next one instead of stopping on the empty state
  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
    rootRef: scrollRootRef,
    enabled: open && !isError,
  });

  const refreshStores = () => {
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerListStoresQueryKey({ path: { id: company.id } }),
    });
    void queryClient.invalidateQueries({ queryKey: adminStoreControllerListQueryKey() });
  };

  // 付け替え moves the store off another company — capture that company before the PATCH
  // so its cached 管轄店舗 / detail (store count, deletability) / history are refreshed too
  const previousCompanyIdRef = useRef<string | null>(null);
  const refreshCompany = (id: string) => {
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerListStoresQueryKey({ path: { id } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerDetailQueryKey({ path: { id } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerHistoryQueryKey({ path: { id } }),
    });
  };

  const linkMutation = useMutation({
    ...adminFcCompanyControllerAssignStoreMutation(),
    onSuccess: (store) => {
      refreshStores();
      refreshCompany(company.id);
      if (previousCompanyIdRef.current) refreshCompany(previousCompanyIdRef.current);
      // A reassign also changes the previous company's count
      void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
      toast.success(`「${store.name}」を管轄店舗に紐づけました`);
    },
    onError: (error) => {
      const code = getFcCompanyErrorCode(error);
      if (code && STALE_CANDIDATE_CODES.has(code)) refreshStores();
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleLink = (store: StoreSummaryDto) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    previousCompanyIdRef.current =
      store.fcCompanyId && store.fcCompanyId !== company.id ? store.fcCompanyId : null;
    linkMutation.mutate({ path: { id: company.id, storeId: store.id } });
  };

  // 候補行の「紐づけ」: 他社管轄なら付け替え確認を挟み、直営（未設定）なら即紐づけ
  const requestLink = (store: StoreSummaryDto) => {
    if (store.fcCompanyId && store.fcCompanyId !== company.id) {
      setReassignTarget(store);
      return;
    }
    handleLink(store);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setKeyword('');
          onOpenChange(next);
        }}
      >
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>店舗を紐づけ</DialogTitle>
            <DialogDescription>
              このFC企業の管轄に追加する店舗を選択します。紐づけの変更は変更履歴に記録されます。
            </DialogDescription>
          </DialogHeader>

          {/* The store master is too large to list whole (API max 100 rows) — search server-side */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="店舗名・店舗IDで検索..."
              maxLength={SEARCH_KEYWORD_MAX_LENGTH}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>

          <div ref={scrollRootRef} className="max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <p className="text-muted-foreground py-6 text-center text-sm">読み込み中...</p>
            ) : isError ? (
              // A failed search is not "no linkable stores" — say so instead of the empty state
              <p className="text-destructive py-6 text-center text-sm">店舗の取得に失敗しました</p>
            ) : candidates.length === 0 && !hasNextPage ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                紐づけ可能な店舗がありません
              </p>
            ) : (
              <div
                className={
                  isFetching && !isFetchingNextPage
                    ? 'flex flex-col divide-y opacity-60'
                    : 'flex flex-col divide-y'
                }
              >
                {candidates.map((store) => (
                  <div key={store.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium wrap-anywhere">{store.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {store.code}・{getPrefectureLabel(store.prefecture)}
                      </p>
                      <p
                        className="text-muted-foreground truncate text-xs"
                        title={`現在: ${operatorLabel(store)}`}
                      >
                        現在: {operatorLabel(store)}
                      </p>
                    </div>
                    <RealBrandBadge brandEnum={store.brandEnum} />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={linkMutation.isPending}
                      onClick={() => requestLink(store)}
                    >
                      紐づけ
                    </Button>
                  </div>
                ))}
                {hasNextPage && (
                  <div
                    ref={sentinelRef}
                    className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
                  >
                    {isFetchingNextPage && (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        読み込み中...
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={reassignTarget !== null}
        onOpenChange={(next) => {
          if (!next) setReassignTarget(null);
        }}
      >
        {/* Long unbroken store / company names wrap inside the body — the buttons stay on-screen */}
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>運営企業を付け替えますか？</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              「{reassignTarget?.name}」は現在「
              {reassignTarget ? operatorLabel(reassignTarget) : ''}
              」の管轄です。このFC企業に紐づけると、元の企業の管轄から外れます。変更は変更履歴に記録されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reassignTarget) handleLink(reassignTarget);
                setReassignTarget(null);
              }}
            >
              付け替えて紐づける
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
