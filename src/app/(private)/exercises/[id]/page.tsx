'use client';

import { Suspense, useRef, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, MoreHorizontal, Pencil, SearchX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
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

import { isRecordNotFoundError, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminExerciseMasterControllerDetailOptions,
  adminExerciseMasterControllerDetailQueryKey,
  adminExerciseMasterControllerListQueryKey,
  adminExerciseMasterControllerPublishMutation,
  adminExerciseMasterControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { ExerciseDeleteDialogs } from '../_components/exercise-delete-dialogs';
import {
  EXERCISE_STATUS_BADGE_CLASSES,
  EXERCISE_STATUS_DOT_CLASSES,
  EXERCISE_STATUS_LABELS,
  type ExerciseDeleteBlockReason,
} from '../_constants/constants';
import { getExerciseDeleteBlockReason } from '../_utils/exercise-error.util';
import {
  getExercisePublishStatus,
  hasIncompleteExerciseSteps,
  toPublishBody,
} from '../_utils/exercise-status.util';
import { BasicInfoTab } from './_components/basic-info-tab';
import { ExerciseDetailSkeleton } from './_components/exercise-detail-skeleton';
import { ExplanationStepsTab } from './_components/explanation-steps-tab';
import { RelatedInfoTab } from './_components/related-info-tab';

function ExerciseDetailPageContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/exercises'));
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [deleteMode, setDeleteMode] = useState<'blocked' | 'confirm' | null>(null);
  const [deleteBlockReason, setDeleteBlockReason] = useState<ExerciseDeleteBlockReason>();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Repeat clicks land before the pending state re-renders the buttons — refs drop them (B-02).
  const statusSubmittingRef = useRef(false);
  const deleteSubmittingRef = useRef(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminExerciseMasterControllerDetailOptions({ path: { id } }),
    enabled: Boolean(id),
  });

  const statusMutation = useMutation({
    ...adminExerciseMasterControllerPublishMutation(),
    onSuccess: (response) => {
      toast.success(
        getExercisePublishStatus(response) === 'public'
          ? 'エクササイズを公開しました'
          : 'エクササイズを非公開にしました',
      );
      queryClient.setQueryData(
        adminExerciseMasterControllerDetailQueryKey({ path: { id } }),
        response,
      );
      void queryClient.invalidateQueries({
        queryKey: adminExerciseMasterControllerListQueryKey(),
      });
    },
    // Already deleted elsewhere (404 E-EXM-001): the shared toast explains it; leave the stale
    // detail the same way delete does.
    onError: (statusError) => {
      if (!isRecordNotFoundError(statusError, 'id')) return;
      setStatusDialogOpen(false);
      void queryClient.invalidateQueries({
        queryKey: adminExerciseMasterControllerListQueryKey(),
      });
      router.replace(navigate('/exercises'));
    },
  });

  // The delete-blocked 409s render in the dialog (FR-006), so the shared toast is suppressed and
  // every other failure is toasted here with the shared wording.
  const deleteMutation = useMutation({
    ...adminExerciseMasterControllerRemoveMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success('エクササイズを削除しました');
      void queryClient.invalidateQueries({
        queryKey: adminExerciseMasterControllerListQueryKey(),
      });
      // `replace`: browser Back must not return to the deleted record's cached detail.
      router.replace(navigate('/exercises'));
    },
    onError: (deleteError) => {
      const blockReason = getExerciseDeleteBlockReason(deleteError);
      if (blockReason) {
        setDeleteBlockReason(blockReason);
        setDeleteMode('blocked');
        return;
      }
      toast.error(resolveApiErrorMessage(deleteError));
      // Already deleted elsewhere (404 E-EXM-001): this detail is stale — back to the list (B-16).
      if (isRecordNotFoundError(deleteError, 'id')) {
        setDeleteMode(null);
        void queryClient.invalidateQueries({
          queryKey: adminExerciseMasterControllerListQueryKey(),
        });
        router.replace(navigate('/exercises'));
      }
    },
    onSettled: () => {
      deleteSubmittingRef.current = false;
    },
  });

  const exercise = data;
  const publishStatus = exercise ? getExercisePublishStatus(exercise) : 'private';
  const exerciseName = exercise ? (exercise.descriptions.ja.name ?? exercise.name) : '';
  const hasIncompleteSteps = exercise
    ? hasIncompleteExerciseSteps(exercise.descriptions.ja)
    : false;

  if (isLoading) {
    return <ExerciseDetailSkeleton />;
  }

  // An unknown id (404 E-EXM-001) or a malformed one (400 on `id`) is a not-found, not a failure
  // worth retrying (B-17).
  const isNotFound = isRecordNotFoundError(error, 'id');

  if (isError || !exercise) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <PageHeader
          breadcrumb={
            <BackToListLink label="エクササイズ管理に戻る" listPath={navigate('/exercises')} />
          }
          title="エクササイズ詳細"
        />
        <div className="px-6 py-4">
          <DataStateBoundary
            isLoading={false}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || !exercise}
            onRetry={() => refetch()}
            emptyState={{
              variant: 'empty',
              icon: SearchX,
              title: 'エクササイズが見つかりません',
              description: '指定されたエクササイズは存在しないか、削除された可能性があります。',
              actionLabel: 'エクササイズ一覧に戻る',
              onAction: () => router.push(backToListHref),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        breadcrumb={
          <BackToListLink label="エクササイズ管理に戻る" listPath={navigate('/exercises')} />
        }
        title={exerciseName}
        subtitle={exercise.exerciseCode ?? undefined}
        badge={
          <Badge
            variant="outline"
            className={cn('gap-1 text-xs', EXERCISE_STATUS_BADGE_CLASSES[publishStatus])}
          >
            <span
              className={cn('size-1.5 rounded-full', EXERCISE_STATUS_DOT_CLASSES[publishStatus])}
            />
            {EXERCISE_STATUS_LABELS[publishStatus]}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <RoleGatedButton
              requiredPermission={Permission.ExercisesEdit}
              variant="default"
              onClick={() =>
                router.push(
                  withReturnTo(navigate('/exercises/[id]/edit', exercise.id), backToListHref),
                )
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
                  requiredPermission={Permission.ExercisesDelete}
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    // A published exercise cannot be deleted (FR-006); the routine-use block
                    // arrives as a 409 from the confirm step.
                    if (publishStatus === 'public') {
                      setDeleteBlockReason('published');
                      setDeleteMode('blocked');
                      return;
                    }
                    setDeleteMode('confirm');
                  }}
                >
                  <Trash2 className="size-4" />
                  削除
                </RoleGatedMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <div className="px-6 pt-4">
          <TabsList variant="line">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="steps">解説ステップ</TabsTrigger>
            <TabsTrigger value="related">関連情報</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="min-h-0 flex-1 overflow-y-auto px-6 pt-0 pb-4">
          <BasicInfoTab
            exercise={exercise}
            publishStatus={publishStatus}
            onOpenPublishStatusDialog={() => setStatusDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="steps" className="min-h-0 flex-1 overflow-y-auto px-6 pt-0 pb-4">
          <ExplanationStepsTab descriptions={exercise.descriptions} />
        </TabsContent>

        <TabsContent value="related" className="min-h-0 flex-1 overflow-y-auto px-6 pt-0 pb-4">
          <RelatedInfoTab exercise={exercise} />
        </TabsContent>
      </Tabs>

      <ExerciseDeleteDialogs
        mode={deleteMode}
        open={Boolean(deleteMode)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteMode(null);
          }
        }}
        exerciseName={exerciseName}
        blockReason={deleteBlockReason}
        isPending={deleteMutation.isPending}
        onConfirmDelete={() => {
          if (deleteSubmittingRef.current) return;
          deleteSubmittingRef.current = true;
          deleteMutation.mutate({ path: { id: exercise.id } });
        }}
      />

      <AlertDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!statusMutation.isPending) setStatusDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {publishStatus === 'private'
                ? 'エクササイズを公開しますか？'
                : 'エクササイズを非公開にしますか？'}
            </AlertDialogTitle>
            <div className="text-muted-foreground space-y-3 text-sm wrap-anywhere">
              {publishStatus === 'private' ? (
                <div>「{exerciseName}」を公開し、モバイルアプリで会員に表示します。</div>
              ) : (
                <div>
                  「{exerciseName}
                  」は非公開に変更され、モバイルアプリで会員に表示されなくなります。
                </div>
              )}
              {publishStatus === 'private' && hasIncompleteSteps ? (
                <Alert className="border-warning/50 bg-warning/15">
                  <AlertTriangle className="text-warning size-4" />
                  <AlertDescription className="text-xs">
                    解説ステップ（ステップ0〜4）に未入力の項目があります。未入力のまま公開できますが、モバイルアプリで解説が表示されません。
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                publishStatus === 'public'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined,
              )}
              disabled={statusMutation.isPending}
              onClick={() => {
                if (statusSubmittingRef.current) return;
                statusSubmittingRef.current = true;
                statusMutation.mutate(
                  {
                    path: { id: exercise.id },
                    body: toPublishBody(publishStatus === 'private' ? 'public' : 'private'),
                  },
                  {
                    onSuccess: () => setStatusDialogOpen(false),
                    onSettled: () => {
                      statusSubmittingRef.current = false;
                    },
                  },
                );
              }}
            >
              {publishStatus === 'private' ? '公開する' : '非公開にする'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ExerciseDetailPage() {
  return (
    <Suspense fallback={<ExerciseDetailSkeleton />}>
      <ExerciseDetailPageContent />
    </Suspense>
  );
}
