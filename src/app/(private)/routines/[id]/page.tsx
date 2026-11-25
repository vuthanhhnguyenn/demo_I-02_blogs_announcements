'use client';

import { Suspense, use, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
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
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminRoutineMasterControllerDetailOptions,
  adminRoutineMasterControllerDetailQueryKey,
  adminRoutineMasterControllerDuplicateMutation,
  adminRoutineMasterControllerListQueryKey,
  adminRoutineMasterControllerPublishMutation,
  adminRoutineMasterControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { RoutineDeleteDialog } from '../_components/routine-delete-dialog';
import {
  ROUTINE_PUBLISH_STATUS_LABELS,
  getRoutinePublishStatusBadgeClass,
  getRoutinePublishStatusDotClass,
} from '../_constants/routine.constants';
import { useSingleFlight } from '../_hooks/use-single-flight.hook';
import { RoutineBasicInfoTab } from './_components/routine-basic-info-tab';
import { RoutineExerciseCompositionTab } from './_components/routine-exercise-composition-tab';

type RoutineDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function RoutineDetailPage({ params }: RoutineDetailPageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <RoutineDetailPageContent params={params} />
    </Suspense>
  );
}

function RoutineDetailPageContent({ params }: RoutineDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const backToListHref = useBackToListHref(navigate('/routines'));
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const singleFlight = useSingleFlight();

  const activeTab = searchParams.get('tab') ?? 'basic';

  const handleTabChange = (tab: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tab);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminRoutineMasterControllerDetailOptions({ path: { id } }),
  });

  const duplicateMutation = useMutation({
    ...adminRoutineMasterControllerDuplicateMutation(),
    onSuccess: (result) => {
      // The API names the copy 「（元の名称）のコピー」 (FR-012) — shown as returned.
      toast.success(`「${result.name}」を作成しました`, {
        description: '公開ステータス: 非公開。複製先の編集画面に移動します',
      });
      queryClient.invalidateQueries({ queryKey: adminRoutineMasterControllerListQueryKey() });
      router.push(navigate('/routines/[id]/edit', result.id));
    },
  });

  const deleteMutation = useMutation({
    ...adminRoutineMasterControllerRemoveMutation(),
    onSuccess: () => {
      toast.success(`「${data?.name ?? ''}」を削除しました`);
      queryClient.invalidateQueries({ queryKey: adminRoutineMasterControllerListQueryKey() });
      router.push(navigate('/routines'));
    },
  });

  const refreshRoutine = () => {
    queryClient.invalidateQueries({ queryKey: adminRoutineMasterControllerListQueryKey() });
    queryClient.invalidateQueries({
      queryKey: adminRoutineMasterControllerDetailQueryKey({ path: { id } }),
    });
  };

  const publishMutation = useMutation({
    ...adminRoutineMasterControllerPublishMutation(),
    onSuccess: (result) => {
      toast.success(
        result.publishStatus === 'published'
          ? `「${result.name}」を公開にしました`
          : `「${result.name}」を非公開にしました`,
      );
      setPublishOpen(false);
      setDeleteOpen(false);
      refreshRoutine();
    },
    // Error toast (E-RTM-003 stale 0-exercise publish …) comes from the shared MutationCache;
    // refetch so the screen shows the routine's real state.
    onError: () => {
      setPublishOpen(false);
      refreshRoutine();
    },
  });

  const routine = data;

  if (isLoading || isError || !routine) {
    // 404 = unknown routine, 400 = malformed id (E-VAL-001): both are "not found", not a
    // network failure — only other errors keep the retry state.
    const errorStatus = getApiErrorStatus(error);
    const isNotFound = errorStatus === 404 || errorStatus === 400;
    return (
      <>
        <PageHeader
          breadcrumb={<BackLink label="ルーティン管理に戻る" href={backToListHref} />}
          title="ルーティン詳細"
        />
        <div className="px-6 py-4">
          <DataStateBoundary
            isLoading={isLoading}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || !routine}
            onRetry={() => void refetch()}
            errorTitle="ルーティンの取得に失敗しました"
            emptyTitle="ルーティンが見つかりませんでした"
            emptyDescription="削除されたか、存在しないルーティンです。"
          />
        </div>
      </>
    );
  }

  const isPublished = routine.publishStatus === 'published';
  const canPublish = routine.exercises.length > 0;

  const changePublishStatus = (publishStatus: 'published' | 'unpublished') =>
    singleFlight((release) =>
      publishMutation.mutate({ path: { id }, body: { publishStatus } }, { onSettled: release }),
    );

  const publishAction = isPublished ? (
    <RoleGatedButton
      requiredPermission={Permission.RoutinesPublish}
      variant="outline"
      className="w-full gap-1"
      denyTooltip="公開ステータスの変更権限がありません"
      onClick={() => setPublishOpen(true)}
    >
      <EyeOff className="size-4" />
      非公開にする
    </RoleGatedButton>
  ) : (
    <div className="flex flex-col gap-2">
      <RoleGatedButton
        requiredPermission={Permission.RoutinesPublish}
        className="w-full gap-1"
        denyTooltip="公開ステータスの変更権限がありません"
        disabled={!canPublish}
        onClick={() => setPublishOpen(true)}
      >
        <Eye className="size-4" />
        公開する
      </RoleGatedButton>
      {!canPublish && (
        <p className="text-muted-foreground text-center text-xs">
          エクササイズが0件のため公開できません。エクササイズを1件以上登録してください
        </p>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackLink label="ルーティン管理に戻る" href={backToListHref} />}
        title={routine.name}
        subtitle={routine.routineCode ?? '—'}
        badge={
          <Badge
            variant="outline"
            className={`gap-1 text-xs font-medium ${getRoutinePublishStatusBadgeClass(routine.publishStatus)}`}
          >
            <span
              className={`size-1.5 rounded-full ${getRoutinePublishStatusDotClass(routine.publishStatus)}`}
            />
            {ROUTINE_PUBLISH_STATUS_LABELS[routine.publishStatus]}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <RoleGatedButton
              requiredPermission={Permission.RoutinesCreate}
              variant="outline"
              className="gap-1"
              denyTooltip="複製の権限がありません"
              disabled={duplicateMutation.isPending}
              onClick={() =>
                singleFlight((release) =>
                  duplicateMutation.mutate({ path: { id } }, { onSettled: release }),
                )
              }
            >
              <Copy className="size-4" />
              複製
            </RoleGatedButton>
            <RoleGatedButton
              requiredPermission={Permission.RoutinesEdit}
              variant="outline"
              className="gap-1"
              denyTooltip="編集の権限がありません"
              onClick={() =>
                router.push(withReturnTo(navigate('/routines/[id]/edit', id), backToListHref))
              }
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedButton>
            <DropdownMenu>
              <DropdownMenuTrigger className="border-input hover:bg-accent flex size-9 items-center justify-center rounded-md border">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <RoleGatedMenuItem
                  requiredPermission={Permission.RoutinesDelete}
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  削除
                </RoleGatedMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Height-bounded scroller, so the right column's `sticky` pins against it. */}
      <div className="bg-background min-h-0 flex-1 overflow-auto px-6 py-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
          <TabsList variant="line">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="exercises">エクササイズ構成</TabsTrigger>
          </TabsList>
          <TabsContent value="basic">
            <RoutineBasicInfoTab routine={routine} statusAction={publishAction} />
          </TabsContent>
          <TabsContent value="exercises">
            <RoutineExerciseCompositionTab routine={routine} />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPublished ? 'ルーティンを非公開にしますか？' : 'ルーティンを公開しますか？'}
            </AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              {isPublished
                ? `「${routine.name}」は非公開に変更され、モバイルアプリで会員に表示されなくなります。会員がコピー済みのマイルーティンには影響しません。`
                : `「${routine.name}」を公開し、モバイルアプリで会員に表示します。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={
                isPublished
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
              disabled={publishMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                changePublishStatus(isPublished ? 'unpublished' : 'published');
              }}
            >
              {isPublished ? '非公開にする' : '公開する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RoutineDeleteDialog
        variant="detail"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        routineName={routine.name}
        isPublished={isPublished}
        isSubmitting={deleteMutation.isPending}
        onConfirm={() =>
          singleFlight((release) => deleteMutation.mutate({ path: { id } }, { onSettled: release }))
        }
        onUnpublish={() => changePublishStatus('unpublished')}
        isUnpublishing={publishMutation.isPending}
      />
    </div>
  );
}
