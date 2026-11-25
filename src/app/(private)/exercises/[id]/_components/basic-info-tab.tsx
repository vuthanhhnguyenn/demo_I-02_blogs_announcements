'use client';

import { type ReactNode, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { format } from 'date-fns';
import { AlertTriangle, Dumbbell, ExternalLink } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { ExerciseDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { ExerciseImageGallery } from '../../_components/exercise-image-gallery';
import { ExerciseLevelBadge } from '../../_components/exercise-level-badge';
import {
  EXERCISE_BODYWEIGHT_TOOL_LABEL,
  EXERCISE_CATEGORY_BADGE_CLASSES,
  EXERCISE_HAND_USAGE_LABELS,
  EXERCISE_STATUS_BADGE_CLASSES,
  EXERCISE_STATUS_DOT_CLASSES,
  EXERCISE_STATUS_LABELS,
  EXERCISE_VALUE_UNAVAILABLE,
  type ExerciseStatus,
} from '../../_constants/constants';
import { useToolTypeLabel } from '../../_hooks/use-exercise-master-options';
import { exerciseImageSrc } from '../../_utils/exercise-image-url.util';

type BasicInfoTabProps = {
  exercise: ExerciseDetailDto;
  publishStatus: ExerciseStatus;
  onOpenPublishStatusDialog: () => void;
};

function FieldBlock({
  label,
  value,
  className,
}: Readonly<{
  label: string;
  value: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      {/* Long unbroken tokens (e.g. a 200-char EN name) wrap inside the column. */}
      <div className="text-sm font-medium wrap-anywhere">{value}</div>
    </div>
  );
}

/**
 * 器具種別 label. The BFF merges `toolName` from the tool master, which leaves the 「なし（自重）」
 * row (code `none`) unnamed, so the name is read from `tool-types/{id}`; a null `toolId` is also
 * "no tool" by the DTO's contract.
 */
function useToolLabel(toolId: string | null, toolName: string | null) {
  const masterLabel = useToolTypeLabel(toolName ? null : toolId);
  if (toolName) return toolName;
  if (!toolId) return EXERCISE_BODYWEIGHT_TOOL_LABEL;
  return masterLabel;
}

/** Rows per page of the 紐づけ機材 table (paged in the browser — the detail carries every row). */
const LINKED_EQUIPMENT_PAGE_SIZE = 10;

/**
 * 紐づけ機材 (FR-008): rows from the detail's `equipments`, each opening its E-03 detail. A row the
 * BE answers with a null name (deleted, or gate-svc unreadable) is flagged instead of linked.
 */
function LinkedEquipmentCard({
  equipments,
}: Readonly<{ equipments: ExerciseDetailDto['equipments'] }>) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(equipments.length / LINKED_EQUIPMENT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = equipments.slice(
    (currentPage - 1) * LINKED_EQUIPMENT_PAGE_SIZE,
    currentPage * LINKED_EQUIPMENT_PAGE_SIZE,
  );

  const renderBody = () => {
    if (equipments.length === 0) {
      return <p className="text-muted-foreground px-4 text-sm">未設定</p>;
    }
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-4 text-xs font-semibold">機材名</TableHead>
              <TableHead className="px-4 text-xs font-semibold">器具種別</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((item) =>
              item.name ? (
                <TableRow
                  key={item.id}
                  className="hover:bg-accent/50 cursor-pointer"
                  onClick={() => router.push(navigate('/training-equipment/[id]', item.id))}
                >
                  <TableCell className="px-4 text-xs wrap-anywhere whitespace-normal">
                    {item.name}
                  </TableCell>
                  <TableCell className="px-4 text-xs wrap-anywhere whitespace-normal">
                    {item.toolName ?? EXERCISE_VALUE_UNAVAILABLE}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={item.id}>
                  <TableCell colSpan={2} className="px-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="text-muted-foreground min-w-0 truncate text-xs line-through"
                        title={item.id}
                      >
                        不明な機材
                      </span>
                      <Badge
                        variant="destructive"
                        className="shrink-0 gap-1 text-[10px] font-normal"
                        title="機材が削除されたか、機材情報を取得できませんでした"
                      >
                        <AlertTriangle className="size-3" />
                        取得不可
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
        {totalPages > 1 ? (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={equipments.length}
            limit={LINKED_EQUIPMENT_PAGE_SIZE}
            onPageChange={setPage}
          />
        ) : null}
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">紐づけ機材</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{renderBody()}</CardContent>
    </Card>
  );
}

export function BasicInfoTab({
  exercise,
  publishStatus,
  onOpenPublishStatusDialog,
}: Readonly<BasicInfoTabProps>) {
  const isPrivate = publishStatus === 'private';
  const { ja, en } = exercise.descriptions;
  const exerciseName = ja.name ?? exercise.name;
  // Rows saved before BE_REQUEST No.13 carry the URL in `videoS3Key` (Q-R24).
  const videoUrl = exercise.videos[0]?.videoUrl ?? exercise.videos[0]?.videoS3Key ?? null;
  const toolLabel = useToolLabel(exercise.toolId, exercise.toolName);
  const updatedDate = format(new Date(exercise.updatedAt), 'yyyy/MM/dd');
  const galleryImages = exercise.images.map((image) => ({
    id: image.id,
    src: exerciseImageSrc(image),
    isPrimary: image.isPrimary,
  }));

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <Card className="min-w-0 flex-1">
        <CardHeader>
          <CardTitle className="text-base font-semibold">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {/* Field order follows the prototype. */}
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            <FieldBlock
              className="md:col-span-2"
              label="エクササイズ名（英語）"
              value={en?.name || '未設定'}
            />
            <FieldBlock
              label="カテゴリ"
              value={
                exercise.categoryName ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-auto max-w-full text-xs font-normal whitespace-normal',
                      EXERCISE_CATEGORY_BADGE_CLASSES,
                    )}
                  >
                    {exercise.categoryName}
                  </Badge>
                ) : (
                  '未設定'
                )
              }
            />
            <FieldBlock label="主働筋" value={exercise.primaryMuscleName ?? '未設定'} />
            <FieldBlock
              label="協働筋"
              value={
                exercise.secondaryMuscles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {exercise.secondaryMuscles.map((muscle) => (
                      <Badge
                        key={muscle.id}
                        variant="outline"
                        className="h-auto max-w-full text-xs font-normal whitespace-normal"
                      >
                        {muscle.name ?? EXERCISE_VALUE_UNAVAILABLE}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  '未設定'
                )
              }
            />
            <FieldBlock label="器具種別" value={toolLabel} />
            <FieldBlock label="エクササイズタイプ" value={exercise.exerciseTypeName ?? '未設定'} />
            <FieldBlock
              label="両手使用区分"
              value={EXERCISE_HAND_USAGE_LABELS[exercise.limbUsage]}
            />
            <FieldBlock
              label="レベル"
              // Spec レベル = `isBeginnerVisible` (D27).
              value={<ExerciseLevelBadge isBeginnerVisible={exercise.isBeginnerVisible} />}
            />
            <FieldBlock
              label="休憩時間"
              value={exercise.restSeconds == null ? '未設定' : `${exercise.restSeconds}秒`}
            />
            <FieldBlock
              label="ステータス"
              value={
                <Badge
                  variant="outline"
                  className={cn('gap-1 text-xs', EXERCISE_STATUS_BADGE_CLASSES[publishStatus])}
                >
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      EXERCISE_STATUS_DOT_CLASSES[publishStatus],
                    )}
                  />
                  {EXERCISE_STATUS_LABELS[publishStatus]}
                </Badge>
              }
            />
            <FieldBlock label="最終更新日" value={updatedDate} />
            {/* FR-005 更新者; null for a row never saved by staff (seed). */}
            <FieldBlock
              label="更新者"
              value={exercise.updatedBy?.name ?? EXERCISE_VALUE_UNAVAILABLE}
            />
            <FieldBlock
              className="md:col-span-2"
              label="説明文"
              value={
                <p className="leading-relaxed whitespace-pre-wrap">{ja.overview || '未設定'}</p>
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="w-full space-y-4 lg:sticky lg:top-0 lg:w-[40%]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">ステータス</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <div
              className={cn(
                'flex size-24 items-center justify-center rounded-full',
                isPrivate ? 'bg-muted/40' : 'bg-success/15',
              )}
            >
              <Dumbbell
                className={cn('size-10', isPrivate ? 'text-muted-foreground' : 'text-success')}
              />
            </div>
            <Badge
              variant="outline"
              className={cn('gap-1 text-xs', EXERCISE_STATUS_BADGE_CLASSES[publishStatus])}
            >
              <span
                className={cn('size-1.5 rounded-full', EXERCISE_STATUS_DOT_CLASSES[publishStatus])}
              />
              {EXERCISE_STATUS_LABELS[publishStatus]}
            </Badge>
            <p className="text-muted-foreground text-xs">最終更新: {updatedDate}</p>
            <div className="w-full border-t pt-3">
              <RoleGatedButton
                requiredPermission={Permission.ExercisesPublish}
                fullWidth
                variant="outline"
                className="h-10 w-full justify-center"
                onClick={onOpenPublishStatusDialog}
              >
                {isPrivate ? '公開する' : '非公開にする'}
              </RoleGatedButton>
            </div>
          </CardContent>
        </Card>

        <ExerciseImageGallery images={galleryImages} exerciseName={exerciseName} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">動画URL</CardTitle>
          </CardHeader>
          <CardContent>
            {videoUrl ? (
              <Link
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm wrap-anywhere hover:underline"
              >
                <ExternalLink className="size-4 shrink-0" />
                {videoUrl}
              </Link>
            ) : (
              <p className="text-muted-foreground text-sm">未設定</p>
            )}
          </CardContent>
        </Card>

        <LinkedEquipmentCard equipments={exercise.equipments} />
      </div>
    </div>
  );
}
