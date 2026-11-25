'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

import { ExerciseLevelBadge } from '../../_components/exercise-level-badge';
import { EXERCISE_CATEGORY_BADGE_CLASSES } from '../../_constants/constants';
import { useExerciseTagGroups } from '../../_hooks/use-exercise-master-options';

type RelatedInfoTabProps = {
  exercise: ExerciseDetailDto;
};

/** Long names (a 200-char token included) wrap inside the badge instead of overflowing the card. */
const WRAPPING_BADGE_CLASSES = 'h-auto max-w-full text-left whitespace-normal wrap-anywhere';

function TagSettingsCard({ enabledTagIds }: Readonly<{ enabledTagIds: readonly string[] }>) {
  // Same query as the form's tag switches, so the cache is shared.
  const tagMaster = useExerciseTagGroups();
  const enabledSet = useMemo(() => new Set(enabledTagIds), [enabledTagIds]);

  const renderBody = () => {
    if (tagMaster.isLoading) {
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-5 w-20 rounded-full" />
          ))}
        </div>
      );
    }
    if (tagMaster.isError) {
      return <p className="text-destructive text-sm">タグを取得できませんでした</p>;
    }
    if (tagMaster.groups.length === 0) {
      return <p className="text-muted-foreground text-sm">タグが登録されていません</p>;
    }
    // Grouped under the tag axis (グリップ / 向き …, R302 / B18).
    return (
      <div className="space-y-4">
        {tagMaster.groups.map((group) => (
          <div key={group.axisCode ?? '__none__'} className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">{group.axisName}</p>
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag) => {
                const isEnabled = enabledSet.has(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    // Prototype: ON = outline badge, OFF = neutral tone badge.
                    variant="outline"
                    className={cn(
                      'text-xs font-normal',
                      WRAPPING_BADGE_CLASSES,
                      !isEnabled && 'bg-card text-muted-foreground border-border',
                    )}
                  >
                    {tag.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">タグ設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-muted-foreground mb-4 text-xs">
          このエクササイズで有効化されているタグです。ONのタグのみ、モバイルアプリで会員がエクササイズ記録時に選択できます。
        </p>
        {renderBody()}
      </CardContent>
    </Card>
  );
}

export function RelatedInfoTab({ exercise }: Readonly<RelatedInfoTabProps>) {
  const router = useRouter();

  // The detail carries each related exercise's card fields (`relatedExercises`); an id missing
  // there (deleted since) gets a placeholder row.
  const relatedById = useMemo(
    () => new Map(exercise.relatedExercises.map((item) => [item.id, item])),
    [exercise.relatedExercises],
  );

  return (
    <div className="space-y-4">
      <TagSettingsCard enabledTagIds={exercise.enabledTagIds} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">関連エクササイズ（最大3件）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {exercise.relatedExerciseIds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4 text-xs font-semibold">エクササイズ名</TableHead>
                  <TableHead className="px-4 text-xs font-semibold">カテゴリ</TableHead>
                  <TableHead className="px-4 text-xs font-semibold">レベル</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercise.relatedExerciseIds.map((relatedId) => {
                  const related = relatedById.get(relatedId);

                  if (!related) {
                    // A readable placeholder, never the raw id (FR-013).
                    return (
                      <TableRow key={relatedId}>
                        <TableCell colSpan={3} className="px-4">
                          <span className="text-muted-foreground text-sm">
                            エクササイズ情報を取得できませんでした
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={relatedId}
                      className="hover:bg-accent/50 cursor-pointer"
                      onClick={() => router.push(navigate('/exercises/[id]', relatedId))}
                    >
                      <TableCell className="px-4 text-sm font-medium wrap-anywhere whitespace-normal">
                        {related.name}
                      </TableCell>
                      <TableCell className="px-4">
                        {related.categoryName ? (
                          <Badge
                            variant="outline"
                            className={cn('text-xs font-normal', EXERCISE_CATEGORY_BADGE_CLASSES)}
                          >
                            {related.categoryName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">未設定</span>
                        )}
                      </TableCell>
                      {/* Spec レベル = `isBeginnerVisible` (D27). */}
                      <TableCell className="px-4">
                        <ExerciseLevelBadge isBeginnerVisible={related.isBeginnerVisible} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground px-4 text-sm">未設定</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
