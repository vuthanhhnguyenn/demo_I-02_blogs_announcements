'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';

import { OptionalMark } from '@/components/common/field-marker';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import { adminExerciseMasterControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminExerciseListResponseDto, ExerciseListItemDto } from '@/lib/api-real/types.gen';

import {
  ROUTINE_MAX_SETS_MESSAGE,
  ROUTINE_MAX_SETS_PER_EXERCISE,
  ROUTINE_SET_MAX,
  getRoutineMinWeight,
} from '../../_constants/routine.constants';
import {
  type RoutineFormValues,
  createEmptyRoutineFormSet,
  isIntegerOrEmptyString,
  isNonNegativeNumberString,
  isValidRpeString,
  isWithinMaxNumberString,
} from '../../_schemas/routine-form.schema';

// `px-1`: at 1024px the seven set columns leave ~40px each, and the default `px-3` clipped
// the RPE value to a sliver.
const SET_INPUT_CLASS_NAME = 'h-8 min-w-12 px-1 text-center text-xs';

function isValidSetValue(value: string, max: number): boolean {
  return isNonNegativeNumberString(value) && isWithinMaxNumberString(value, max);
}

function isValidIntegerSetValue(value: string, max: number): boolean {
  return isValidSetValue(value, max) && isIntegerOrEmptyString(value);
}

const EXERCISE_PICKER_PAGE_SIZE = 50;

type RoutineFormSetRowProps = {
  exerciseIndex: number;
  setIndex: number;
  /** False once the exercise holds ROUTINE_MAX_SETS_PER_EXERCISE sets. */
  canCopy: boolean;
  onCopy: () => void;
  onRemove: () => void;
};

function RoutineFormSetRow({
  exerciseIndex,
  setIndex,
  canCopy,
  onCopy,
  onRemove,
}: RoutineFormSetRowProps) {
  const form = useFormContext<RoutineFormValues>();
  const reps = useWatch({
    control: form.control,
    name: `exercises.${exerciseIndex}.sets.${setIndex}.reps`,
  });
  const weight = useWatch({
    control: form.control,
    name: `exercises.${exerciseIndex}.sets.${setIndex}.weight`,
  });
  const time = useWatch({
    control: form.control,
    name: `exercises.${exerciseIndex}.sets.${setIndex}.time`,
  });
  const distance = useWatch({
    control: form.control,
    name: `exercises.${exerciseIndex}.sets.${setIndex}.distance`,
  });
  const rpe = useWatch({
    control: form.control,
    name: `exercises.${exerciseIndex}.sets.${setIndex}.rpe`,
  });

  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-center text-xs font-medium">
        {setIndex + 1}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={ROUTINE_SET_MAX.reps}
          step={1}
          className={SET_INPUT_CLASS_NAME}
          placeholder="-"
          aria-invalid={!isValidIntegerSetValue(reps ?? '', ROUTINE_SET_MAX.reps)}
          {...form.register(`exercises.${exerciseIndex}.sets.${setIndex}.reps`)}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={ROUTINE_SET_MAX.weight}
          className={SET_INPUT_CLASS_NAME}
          placeholder="-"
          aria-invalid={!isValidSetValue(weight ?? '', ROUTINE_SET_MAX.weight)}
          {...form.register(`exercises.${exerciseIndex}.sets.${setIndex}.weight`, {
            // Any keystroke makes the weight the user's own, even when it equals the seed.
            onChange: () =>
              form.setValue(`exercises.${exerciseIndex}.sets.${setIndex}.weightSeeded`, false),
          })}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={ROUTINE_SET_MAX.time}
          step={1}
          className={SET_INPUT_CLASS_NAME}
          placeholder="-"
          aria-invalid={!isValidIntegerSetValue(time ?? '', ROUTINE_SET_MAX.time)}
          {...form.register(`exercises.${exerciseIndex}.sets.${setIndex}.time`)}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={ROUTINE_SET_MAX.distance}
          className={SET_INPUT_CLASS_NAME}
          placeholder="-"
          aria-invalid={!isValidSetValue(distance ?? '', ROUTINE_SET_MAX.distance)}
          {...form.register(`exercises.${exerciseIndex}.sets.${setIndex}.distance`)}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={10}
          step={1}
          className={SET_INPUT_CLASS_NAME}
          placeholder="0"
          aria-invalid={!isValidRpeString(rpe ?? '') || !isIntegerOrEmptyString(rpe ?? '')}
          {...form.register(`exercises.${exerciseIndex}.sets.${setIndex}.rpe`)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            title="このセットをコピー"
            disabled={!canCopy}
            onClick={onCopy}
          >
            <Copy className="text-muted-foreground size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            title="このセットを削除"
            onClick={onRemove}
          >
            <Trash2 className="text-destructive size-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

type RoutineFormExerciseRowProps = {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
};

export function RoutineFormExerciseRow({
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Readonly<RoutineFormExerciseRowProps>) {
  const form = useFormContext<RoutineFormValues>();
  const exerciseId = useWatch({ control: form.control, name: `exercises.${index}.exerciseId` });
  const exerciseName = useWatch({ control: form.control, name: `exercises.${index}.exerciseName` });
  const exercises = useWatch({ control: form.control, name: 'exercises' });

  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const exerciseList = useInfiniteQuery({
    ...adminExerciseMasterControllerListInfiniteOptions({
      query: {
        publishStatus: 'published',
        limit: EXERCISE_PICKER_PAGE_SIZE,
        keyword: exerciseSearch || undefined,
      },
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminExerciseListResponseDto, allPages) =>
      allPages.length < lastPage.pagination.totalPages ? allPages.length + 1 : undefined,
    enabled: isExercisePickerOpen,
  });

  const pickedByOtherRows = new Set(
    exercises
      .filter((_, otherIndex) => otherIndex !== index)
      .map((exercise) => exercise.exerciseId)
      .filter(Boolean),
  );
  const exerciseOptions = (exerciseList.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (exercise) => !pickedByOtherRows.has(exercise.id),
  );

  // A routine holds up to ROUTINE_MAX_EXERCISES (100) exercises, so every row of a loaded page can
  // already be picked by other rows. SearchableSelect only renders its load-more sentinel under a
  // non-empty list, so keep paging while nothing is selectable (stopped by a failed page).
  const shouldLoadPastPickedRows =
    isExercisePickerOpen &&
    exerciseOptions.length === 0 &&
    exerciseList.hasNextPage &&
    !exerciseList.isFetching &&
    !exerciseList.isFetchNextPageError;
  const { fetchNextPage } = exerciseList;
  useEffect(() => {
    if (shouldLoadPastPickedRows) void fetchNextPage();
  }, [shouldLoadPastPickedRows, fetchNextPage]);

  const {
    fields: setFields,
    append: appendSet,
    remove: removeSet,
    insert: insertSet,
  } = useFieldArray({
    control: form.control,
    name: `exercises.${index}.sets` as const,
  });

  // FR-012: picking an exercise seeds 重量 with its 器具別最低重量. Only blank weights, or ones still
  // holding a seed (`weightSeeded`), are replaced — a value the user typed is kept, even when it
  // equals the previous pick's seed.
  const handlePickExercise = (picked: ExerciseListItemDto) => {
    const minWeight = getRoutineMinWeight(picked.toolCode);
    form.setValue(`exercises.${index}.exerciseId`, picked.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue(`exercises.${index}.exerciseName`, picked.name, { shouldDirty: true });
    form.setValue(`exercises.${index}.minWeight`, minWeight);
    form.getValues(`exercises.${index}.sets`).forEach((set, setIndex) => {
      if (set.weight === '' || set.weightSeeded) {
        form.setValue(`exercises.${index}.sets.${setIndex}.weight`, minWeight, {
          shouldDirty: true,
        });
        form.setValue(`exercises.${index}.sets.${setIndex}.weightSeeded`, minWeight !== '');
      }
    });
  };

  const canAddSet = setFields.length < ROUTINE_MAX_SETS_PER_EXERCISE;

  const handleAddSet = () => {
    // TODO(round2) B3: rows loaded in edit mode have no minWeight (AdminRoutineExerciseDto has no
    // toolCode), so their new sets still start with a blank 重量.
    appendSet(createEmptyRoutineFormSet(form.getValues(`exercises.${index}.minWeight`)));
  };

  const handleCopySet = (setIndex: number) => {
    const source = form.getValues(`exercises.${index}.sets.${setIndex}`);
    insertSet(setIndex + 1, { ...source });
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="bg-muted/30 flex items-center gap-2 border-b px-3 py-2">
        <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <SearchableSelect<ExerciseListItemDto>
            value={exerciseId || null}
            valueLabel={exerciseName || undefined}
            options={exerciseOptions}
            placeholder="エクササイズを選択"
            searchPlaceholder="エクササイズ名を検索..."
            emptyMessage={exerciseList.isError ? 'エクササイズの取得に失敗しました' : '該当なし'}
            loadingMessage="読み込み中..."
            // While auto-paging past already-picked rows the list is still empty: keep the spinner.
            isLoading={
              (exerciseList.isFetching && !exerciseList.isFetchingNextPage) ||
              (exerciseOptions.length === 0 && exerciseList.isFetchingNextPage)
            }
            hasMore={exerciseList.hasNextPage}
            isLoadingMore={exerciseList.isFetchingNextPage}
            onLoadMore={() => void exerciseList.fetchNextPage()}
            loadMoreFailed={exerciseList.isFetchNextPageError}
            open={isExercisePickerOpen}
            onOpenChange={setIsExercisePickerOpen}
            onSearchChange={setExerciseSearch}
            onSelect={(exercise) => exercise && handlePickExercise(exercise)}
            getOptionKey={(exercise) => exercise.id}
            getOptionLabel={(exercise) => exercise.name}
            triggerClassName="h-8 w-full text-xs font-normal"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isFirst}
            onClick={onMoveUp}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isLast}
            onClick={onMoveDown}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onDelete}>
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            <TableHead className="w-[50px] text-center text-xs font-semibold">セット</TableHead>
            <TableHead className="text-center text-xs font-semibold">Rep数</TableHead>
            <TableHead className="text-center text-xs font-semibold">重量(kg)</TableHead>
            <TableHead className="text-center text-xs font-semibold">時間(秒)</TableHead>
            <TableHead className="text-center text-xs font-semibold">距離(m)</TableHead>
            <TableHead className="text-center text-xs font-semibold">RPE</TableHead>
            <TableHead className="w-[40px] text-xs font-semibold" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {setFields.map((setField, setIndex) => (
            <RoutineFormSetRow
              key={setField.id}
              exerciseIndex={index}
              setIndex={setIndex}
              canCopy={canAddSet}
              onCopy={() => handleCopySet(setIndex)}
              onRemove={() => removeSet(setIndex)}
            />
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2 border-t px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={!canAddSet}
          onClick={handleAddSet}
        >
          <Plus className="size-3" />
          セットを追加
        </Button>
        {!canAddSet && <p className="text-muted-foreground text-xs">{ROUTINE_MAX_SETS_MESSAGE}</p>}
      </div>

      <div className="border-t px-3 py-2">
        <Label className="text-muted-foreground mb-1 block text-xs font-medium">
          本部コメント
          <OptionalMark />
        </Label>
        <Textarea
          className="min-h-[56px] text-xs leading-relaxed"
          placeholder="注意事項・フォームポイント等を入力"
          maxLength={TEXTAREA_MAX_LENGTH}
          {...form.register(`exercises.${index}.hqComment`)}
        />
      </div>
    </div>
  );
}
