'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Info, Loader2, Lock, X } from 'lucide-react';

import { useDebounce } from '@/hooks/use-debounce.hook';

import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { adminTrainerControllerMeOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { UserRole } from '@/types/permission.type';

import {
  addMinutesToTime,
  lessonScheduleAllPagesOptions,
  threeMonthsLater,
} from '../../_utils/lesson-schedule-api.util';
import { PICKER_SEARCH_DEBOUNCE_MS, TRAINER_LOOKUP_LIMIT } from '../_constants/constants';
import { useStudioList, useTrainerSearch } from '../_hooks/use-form-option-lists.hook';
import { useScheduleDatePlan } from '../_hooks/use-generated-schedule-dates.hook';
import { useSelectedLesson } from '../_hooks/use-lesson-options.hook';
import type { LessonScheduleFormValues } from '../_schemas/lesson-schedule-form.schema';
import { InstructorAvatar } from './instructor-avatar';
import { InstructorConflictWarning } from './instructor-conflict-warning';
import { ListLoadError } from './list-load-error';

interface InstructorOption {
  instructor_id: string;
  instructor_name: string;
  /** TODO(round2): `facePhotoUrl` still echoes the S3 key (no resolve RPC) — initials until then */
  photo_url: string | null;
}

/** Bounds how many recurring occurrences are checked for instructor conflicts. */
const MAX_CONFLICT_CHECK_OCCURRENCES = 30;

export function LessonScheduleFormInstructors() {
  const form = useFormContext<LessonScheduleFormValues>();

  const [
    lessonType,
    storeId,
    studioId,
    capacity,
    selectedInstructorIdsRaw,
    scheduleDate,
    scheduleStartDate,
    startTime,
    lessonId,
  ] = useWatch({
    control: form.control,
    name: [
      'lesson_type',
      'store_id',
      'studio_id',
      'capacity',
      'instructor_ids',
      'date',
      'start_date',
      'start_time',
      'lesson_id',
    ],
  });
  const selectedInstructorIds = useMemo(
    () => selectedInstructorIdsRaw ?? [],
    [selectedInstructorIdsRaw],
  );

  // D-01 権限マトリクス: Trainer は自分担当のみ。本人を固定し read-only にする（FR-003-014a）。
  // A trainer's own trainer row is resolved by GET /admin/trainers/me (staff id ≠ trainer id).
  const { user } = useAuthUser();
  const isTrainer = user?.role === UserRole.Trainer;
  const { data: selfTrainer } = useQuery({
    ...adminTrainerControllerMeOptions(),
    enabled: isTrainer,
    retry: false,
  });
  const selfInstructorId = selfTrainer?.id ?? '';

  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim(), PICKER_SEARCH_DEBOUNCE_MS);
  // Names of the trainers picked here — the chips keep them whatever the picker has loaded (it
  // searches on the server)
  const [pickedNames, setPickedNames] = useState<Record<string, string>>({});

  // Active trainers holding the coach type the lesson needs (studio → instructor, PT → trainer).
  // The trainer master has no store link (API-109), so the list is not narrowed by store — the
  // lookup endpoint serves every active trainer, filtered by type on the server.
  const requiredCoachType = lessonType === 'personal' ? 'trainer' : 'instructor';
  const trainersQuery = useTrainerSearch(search, requiredCoachType, open && !isTrainer);
  const instructorList: InstructorOption[] = useMemo(
    () =>
      trainersQuery.trainers.map((t) => ({
        instructor_id: t.id,
        instructor_name: `${t.lastName} ${t.firstName}`.trim(),
        photo_url: null,
      })),
    [trainersQuery.trainers],
  );
  const isTrainersLoading = trainersQuery.isFetching;
  const isTrainersError = trainersQuery.isError;
  // The lookup stops at TRAINER_LOOKUP_LIMIT rows: say so, so a missing name is searched for
  const isTrainerListCapped = trainersQuery.trainers.length >= TRAINER_LOOKUP_LIMIT;

  const { data: studios } = useStudioList(storeId, lessonType === 'studio');

  // The new session's length comes from the lesson master (the chosen lesson's detail)
  const { lesson: selectedLesson } = useSelectedLesson(lessonId, lessonType, storeId);
  const durationMinutes = selectedLesson?.durationMinutes ?? 60;

  const { dates: generatedDates } = useScheduleDatePlan(form.control);

  const checkDates = useMemo(() => {
    if (scheduleDate) return [scheduleDate];
    if (scheduleStartDate) {
      return generatedDates.slice(0, MAX_CONFLICT_CHECK_OCCURRENCES).map((d) => d.isoDate);
    }
    return [];
  }, [scheduleDate, scheduleStartDate, generatedDates]);

  // FR-003 trainer double-booking: each selected trainer's schedules AT THIS STORE over the checked
  // dates (the list allows a 3-month window), compared by time range client-side.
  // TODO(round2) B11: the list needs a `storeId` on view=store (API-112 §4.1, 400 E-VAL-001
  // otherwise), so another store's clash cannot be previewed here — the save still checks every
  // store (single: rejected, recurrence: `conflictedDates` in the toast).
  const conflictWindow = useMemo(() => {
    if (checkDates.length === 0) return null;
    const from = checkDates[0];
    const lastWanted = checkDates[checkDates.length - 1];
    const cap = threeMonthsLater(from);
    return { from, to: lastWanted < cap ? lastWanted : cap };
  }, [checkDates]);

  const conflictQueries = useQueries({
    queries: (selectedInstructorIds as string[]).map((trainerId) => ({
      ...lessonScheduleAllPagesOptions({
        view: 'store',
        storeId: storeId ?? '',
        trainerId,
        from: conflictWindow?.from ?? '',
        to: conflictWindow?.to ?? '',
      }),
      enabled: !!conflictWindow && !!startTime && !!storeId,
    })),
  });

  // The warning is one fixed line (D-01 No3), so only whether any live schedule overlaps matters
  const hasConflict = useMemo(() => {
    if (!startTime) return false;
    const newEnd = addMinutesToTime(startTime, durationMinutes);
    const wanted = new Set(checkDates);
    return conflictQueries.some((query) =>
      (query.data ?? []).some(
        (existing) =>
          !existing.isCancelled &&
          wanted.has(existing.scheduledDate) &&
          existing.startTime < newEnd &&
          startTime < existing.endTime,
      ),
    );
  }, [conflictQueries, checkDates, startTime, durationMinutes]);

  // A failed probe must not read as 「no conflict」
  const failedConflictQueries = conflictQueries.filter((q) => q.isError && !q.isFetching);

  const selectedStudio = (studios ?? []).find((s) => s.id === studioId);
  const effectiveMaxCapacity = selectedStudio
    ? selectedStudio.capacity + selectedStudio.bufferCapacity
    : undefined;

  const selectedInstructors: InstructorOption[] = (selectedInstructorIds as string[]).map((id) => ({
    instructor_id: id,
    instructor_name: pickedNames[id] ?? id,
    photo_url: null,
  }));

  // Trainer ログイン時は本人を自動セットして固定する（追加・削除不可）。
  useEffect(() => {
    if (!isTrainer || !selfInstructorId) return;
    const current = selectedInstructorIds as string[];
    if (current.length === 1 && current[0] === selfInstructorId) return;
    form.setValue('instructor_ids', [selfInstructorId], {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [isTrainer, selfInstructorId, selectedInstructorIds, form]);

  const selfInstructorName = selfTrainer
    ? `${selfTrainer.lastName} ${selfTrainer.firstName}`.trim()
    : (user?.name ?? '');

  function handleAdd(instructorId: string) {
    if (!instructorId || (selectedInstructorIds as string[]).includes(instructorId)) return;
    form.setValue('instructor_ids', [...(selectedInstructorIds as string[]), instructorId], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleRemove(instructorId: string) {
    form.setValue(
      'instructor_ids',
      (selectedInstructorIds as string[]).filter((id) => id !== instructorId),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function handleToggle(instructor: InstructorOption) {
    if ((selectedInstructorIds as string[]).includes(instructor.instructor_id)) {
      handleRemove(instructor.instructor_id);
    } else {
      setPickedNames((prev) => ({
        ...prev,
        [instructor.instructor_id]: instructor.instructor_name,
      }));
      handleAdd(instructor.instructor_id);
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearchInput('');
  };

  const expectedRole = lessonType === 'personal' ? 'トレーナー' : 'インストラクター';
  return (
    <Card>
      <CardContent className="px-6">
        <h2 className="mb-4 text-base font-bold">インストラクター・定員</h2>
        <div className="space-y-4">
          {/* インストラクター選択 */}
          <FormField
            control={form.control}
            name="instructor_ids"
            render={({ fieldState }) => (
              <FormItem>
                <FormLabel>
                  インストラクター <span className="text-destructive">*</span>
                </FormLabel>
                {isTrainer ? (
                  // FR-003-014a: Trainer は本人固定（read-only）。追加コンボボックス・削除ボタンなし。
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className="flex h-7 items-center gap-2 pr-2 pl-1 text-xs font-normal"
                      >
                        <InstructorAvatar
                          photoUrl={null}
                          name={selfInstructorName}
                          className="size-5"
                          iconClassName="size-3"
                        />
                        {selfInstructorName}
                        <span className="text-muted-foreground text-[10px]">（あなた）</span>
                        <Lock className="text-muted-foreground ml-0.5 size-3" />
                      </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Info className="size-3" />
                      ご自身が担当するスケジュールのみ登録できます。担当インストラクターはご自身に固定されます。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Popover open={open} onOpenChange={handleOpenChange}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            aria-invalid={!!fieldState.error}
                            className="h-8 w-full justify-between text-sm font-normal"
                          />
                        }
                      >
                        <span className="text-muted-foreground">
                          {(selectedInstructorIds as string[]).length === 0
                            ? '選択してください'
                            : '追加する...'}
                        </span>
                        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-(--anchor-width) p-0" align="start">
                        {/* The search runs on the server (name / nickname), not over the loaded rows */}
                        <Command shouldFilter={false}>
                          <CommandInput
                            value={searchInput}
                            onValueChange={setSearchInput}
                            placeholder={`${expectedRole}を検索...`}
                            className="h-8"
                          />
                          <CommandList>
                            {isTrainersLoading ? (
                              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                                <Loader2 className="size-4 animate-spin" />
                                検索中...
                              </div>
                            ) : isTrainersError ? (
                              <div className="px-3 py-4">
                                <ListLoadError
                                  label={expectedRole}
                                  onRetry={() => void trainersQuery.refetch()}
                                />
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>該当なし</CommandEmpty>
                                <CommandGroup heading={expectedRole}>
                                  {instructorList.map((inst) => {
                                    const isSelected = (selectedInstructorIds as string[]).includes(
                                      inst.instructor_id,
                                    );
                                    return (
                                      <CommandItem
                                        key={inst.instructor_id}
                                        value={inst.instructor_id}
                                        onSelect={() => {
                                          handleToggle(inst);
                                          handleOpenChange(false);
                                        }}
                                        className="flex items-center gap-2"
                                      >
                                        <InstructorAvatar
                                          photoUrl={inst.photo_url}
                                          name={inst.instructor_name}
                                          className="size-6"
                                          iconClassName="size-3"
                                        />
                                        <TextWithTooltip
                                          text={inst.instructor_name}
                                          wrapperClassName="min-w-0 flex-1"
                                          side="right"
                                          align="center"
                                        />
                                        <Check
                                          className={cn(
                                            'ml-auto size-4',
                                            isSelected ? 'opacity-100' : 'opacity-0',
                                          )}
                                        />
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                                {isTrainerListCapped && (
                                  <p className="text-muted-foreground px-3 py-2 text-center text-xs">
                                    先頭{TRAINER_LOOKUP_LIMIT}
                                    件を表示しています。名前で絞り込んでください。
                                  </p>
                                )}
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* 選択済みチップ */}
                    {selectedInstructors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedInstructors.map((inst) => (
                          <Badge
                            key={inst.instructor_id}
                            variant="secondary"
                            className="flex h-7 items-center gap-2 pr-1 pl-1 text-xs font-normal"
                          >
                            <InstructorAvatar
                              photoUrl={inst.photo_url}
                              name={inst.instructor_name}
                              className="size-5"
                              iconClassName="size-3"
                            />
                            {inst.instructor_name}
                            <button
                              type="button"
                              onClick={() => handleRemove(inst.instructor_id)}
                              className="hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5"
                              aria-label={`${inst.instructor_name}を削除`}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <FormMessage />

                {hasConflict && <InstructorConflictWarning />}
                {failedConflictQueries.length > 0 && (
                  <ListLoadError
                    label="担当者の予定（重複チェック）"
                    onRetry={() => failedConflictQueries.forEach((q) => void q.refetch())}
                  />
                )}
              </FormItem>
            )}
          />

          {/* 定員（スタジオレッスンのみ） */}
          {lessonType === 'studio' && (
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    定員 <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input
                        type="number"
                        className="h-8 w-[120px] text-sm"
                        placeholder="例: 10"
                        min={1}
                        max={effectiveMaxCapacity}
                        value={String(field.value ?? '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : Number(val));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <Label className="text-muted-foreground text-sm">名</Label>
                    {selectedStudio && (
                      <Label className="text-muted-foreground text-xs">
                        （上限: {effectiveMaxCapacity}名 ／ 物理定員 {selectedStudio.capacity}名 +
                        バッファ {selectedStudio.bufferCapacity}名）
                      </Label>
                    )}
                  </div>
                  {!studioId ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      スタジオを選択すると定員の上限（物理定員＋バッファ）が表示されます
                    </p>
                  ) : null}
                  {selectedStudio &&
                  capacity !== undefined &&
                  Number(capacity) > effectiveMaxCapacity! ? (
                    <p className="text-destructive text-xs">
                      定員が物理定員＋バッファ値（{effectiveMaxCapacity}
                      名）を超えているため登録できません
                    </p>
                  ) : null}
                  {selectedStudio &&
                  capacity !== undefined &&
                  Number(capacity) > selectedStudio.capacity &&
                  Number(capacity) <= effectiveMaxCapacity! ? (
                    <p className="text-warning text-xs">
                      定員がスタジオの物理定員を超えています。見学・体験枠を含む場合はこのまま進められます
                    </p>
                  ) : null}
                  {selectedStudio &&
                  capacity !== undefined &&
                  Number(capacity) > 0 &&
                  Number(capacity) <= selectedStudio.capacity ? (
                    <p className="text-muted-foreground text-xs">
                      例: {selectedStudio.capacity}名のスタジオで
                      {Number(capacity)}
                      名限定開催
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
