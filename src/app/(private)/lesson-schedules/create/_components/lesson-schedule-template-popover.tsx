'use client';

import { useState } from 'react';
import { useForm, useFormContext, useWatch } from 'react-hook-form';

import { useAuthUser } from '@/contexts/auth-user.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Info, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  adminLessonControllerDetailOptions,
  adminLessonScheduleControllerCreateTemplateMutation,
  adminLessonScheduleControllerDeleteTemplateMutation,
  adminLessonScheduleControllerListTemplatesQueryKey,
  adminLessonScheduleControllerUpdateTemplateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleTemplateDto } from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

import {
  DAY_OF_WEEK_LABELS,
  END_CONDITION_LABELS,
  REPEAT_TYPE_LABELS,
} from '../_constants/constants';
import { studioListQueryOptions, useTemplateList } from '../_hooks/use-form-option-lists.hook';
import { useSelectedLesson } from '../_hooks/use-lesson-options.hook';
import {
  templateDaysOfWeek,
  toCreateTemplateBody,
  toTemplateSettings,
} from '../_schemas/lesson-schedule-form.mapper';
import type { LessonScheduleFormValues } from '../_schemas/lesson-schedule-form.schema';
import {
  type LessonScheduleTemplateSaveValues,
  lessonScheduleTemplateSaveSchema,
} from '../_schemas/lesson-schedule-template.schema';
import { ListLoadError } from './list-load-error';

/** Monday-first, like the day picker */
function formatDays(days: readonly number[]): string {
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => DAY_OF_WEEK_LABELS[d])
    .join('');
}

export function LessonScheduleTemplatePopover() {
  const form = useFormContext<LessonScheduleFormValues>();

  const { confirmDiscard } = useUnsavedChanges(form.formState.isDirty);
  const queryClient = useQueryClient();
  const { user } = useAuthUser();

  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');

  const saveForm = useForm<LessonScheduleTemplateSaveValues>({
    resolver: zodResolver(lessonScheduleTemplateSaveSchema),
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  const [
    storeId,
    lessonType,
    lessonId,
    studioId,
    repeatType,
    daysOfWeek,
    startDate,
    startTime,
    endCondition,
    endDate,
    endCount,
    skipHolidays,
  ] = useWatch({
    control: form.control,
    name: [
      'store_id',
      'lesson_type',
      'lesson_id',
      'studio_id',
      'repeat_type',
      'days_of_week',
      'start_date',
      'start_time',
      'end_condition',
      'end_date',
      'end_count',
      'skip_holidays',
    ],
  });

  // A template belongs to one store and needs a lesson (a studio lesson also its studio), a
  // cadence, its days and a start time (API-112 v0.10)
  const canSaveCurrentSettings =
    !!storeId &&
    !!lessonId &&
    (lessonType !== 'studio' || !!studioId) &&
    !!startTime &&
    templateDaysOfWeek({ repeat_type: repeatType, days_of_week: daysOfWeek, start_date: startDate })
      .length > 0;

  // The selected store's active templates (every page)
  const templatesQuery = useTemplateList(storeId);
  const { isLoading } = templatesQuery;
  const templates = templatesQuery.data ?? [];

  // The selected lesson's name for the 保存される内容 summary (same cached detail as the form)
  const { lesson } = useSelectedLesson(lessonId, lessonType, storeId);
  const lessonName = lesson?.name;

  // Staff and trainers may only change or delete their own templates (403 E-LSC-101)
  const canManageTemplate = (tpl: LessonScheduleTemplateDto) =>
    !(user?.role === UserRole.Staff || user?.role === UserRole.Trainer) ||
    tpl.createdBy === user.id;

  const invalidateTemplates = () =>
    queryClient.invalidateQueries({
      queryKey: adminLessonScheduleControllerListTemplatesQueryKey(),
    });

  const createMutation = useMutation({
    ...adminLessonScheduleControllerCreateTemplateMutation(),
    onSuccess: () => void invalidateTemplates(),
  });

  const updateMutation = useMutation({
    ...adminLessonScheduleControllerUpdateTemplateMutation(),
    onSuccess: () => void invalidateTemplates(),
  });

  const deleteMutation = useMutation({
    ...adminLessonScheduleControllerDeleteTemplateMutation(),
    onSuccess: () => void invalidateTemplates(),
  });

  // TODO(round2) B9: the 終了条件 is not part of an API template (FR-013 Q&A), so 読込 restores the
  // store, the lesson + studio and the cadence only.
  async function handleLoadTemplate(tpl: LessonScheduleTemplateDto) {
    setLoadedTemplateId(tpl.id);
    setPopoverOpen(false);
    // The template names its lesson but not the lesson's kind — read it so the レッスン区分 and the
    // lesson picker match (a lesson of the other kind would be dropped from the form)
    const lesson = await queryClient
      .fetchQuery(adminLessonControllerDetailOptions({ path: { lessonId: tpl.lessonId } }))
      .catch(() => null);
    // Picking a studio by hand also fills 定員 with its capacity — do the same for the restored one
    // (same query as the studio select, so usually cached)
    const studio = tpl.studioId
      ? await queryClient
          .fetchQuery(studioListQueryOptions(tpl.storeId))
          .then((studios) => studios.find((s) => s.id === tpl.studioId) ?? null)
          .catch(() => null)
      : null;
    if (tpl.storeId !== form.getValues('store_id')) {
      form.setValue('store_id', tpl.storeId, { shouldDirty: true });
    }
    if (lesson) {
      const lessonType = lesson.lessonType === 'personal_training' ? 'personal' : 'studio';
      if (lessonType !== form.getValues('lesson_type') && user?.role !== UserRole.Trainer) {
        // Same rule as switching the レッスン区分 radio (CRM UT D-04 No16): coaches are picked for
        // one lesson type and the BE does not re-check it (API-112 §6.1 #4a), so a template that
        // changes the type drops the picks. A Trainer stays as self.
        form.setValue('instructor_ids', [], { shouldDirty: true });
      }
      form.setValue('lesson_type', lessonType, { shouldDirty: true });
    }
    form.setValue('lesson_id', tpl.lessonId, { shouldDirty: true });
    form.setValue('studio_id', tpl.studioId ?? '', { shouldDirty: true });
    if (studio) form.setValue('capacity', studio.capacity, { shouldDirty: true });
    form.setValue('repeat_type', tpl.recurrenceType, { shouldDirty: true });
    form.setValue('days_of_week', tpl.daysOfWeek, { shouldDirty: true });
    form.setValue('skip_holidays', tpl.skipHolidays, { shouldDirty: true });
    form.setValue('start_time', tpl.startTime, { shouldDirty: true });
  }

  async function handleSaveTemplate(values: LessonScheduleTemplateSaveValues) {
    const name = values.name.trim();
    const current = form.getValues();
    const loaded = loadedTemplateId ? templates.find((t) => t.id === loadedTemplateId) : null;

    try {
      if (saveMode === 'overwrite' && loaded) {
        await updateMutation.mutateAsync({
          path: { templateId: loaded.id },
          body: { name, ...toTemplateSettings(current), expectedUpdatedAt: loaded.updatedAt },
        });
      } else {
        const result = await createMutation.mutateAsync({
          body: toCreateTemplateBody(name, current),
        });
        setLoadedTemplateId(result.id);
      }
      toast.success('テンプレートを保存しました');
      setSaveDialogOpen(false);
      saveForm.reset({ name: '' });
    } catch {
      // The shared MutationCache already toasted the API error
    }
  }

  function handleDeleteTemplate(id: string) {
    deleteMutation.mutate(
      { path: { templateId: id } },
      {
        onSuccess: () => {
          toast.success('テンプレートを削除しました');
          if (loadedTemplateId === id) setLoadedTemplateId(null);
        },
      },
    );
  }

  function handleOpenSaveDialog() {
    const loaded = loadedTemplateId ? templates.find((t) => t.id === loadedTemplateId) : null;
    // 上書き is only offered on a template the user may change
    setSaveMode(loaded && canManageTemplate(loaded) ? 'overwrite' : 'new');
    saveForm.reset({ name: loaded?.name ?? '' });
    setSaveDialogOpen(true);
    setPopoverOpen(false);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const loadedTemplate = loadedTemplateId
    ? (templates.find((t) => t.id === loadedTemplateId) ?? null)
    : null;
  const canOverwrite = !!loadedTemplate && canManageTemplate(loadedTemplate);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" className="h-8 shrink-0 gap-2 px-3" />}
        >
          <Bookmark className="size-4" />
          テンプレート
          {templates.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 flex h-4 min-w-5 items-center justify-center px-1 text-[10px]"
            >
              {templates.length}
            </Badge>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">保存済みパターン</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {!storeId ? (
              <div className="text-muted-foreground flex items-center justify-center px-4 py-6 text-xs">
                <Info className="mr-2 size-4" />
                店舗を選択するとテンプレートが表示されます
              </div>
            ) : isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center px-4 py-6 text-xs">
                <Loader2 className="mr-2 size-4 animate-spin" />
                読み込み中...
              </div>
            ) : templatesQuery.isError ? (
              <div className="flex items-center justify-center px-4 py-6">
                <ListLoadError label="テンプレート" onRetry={() => void templatesQuery.refetch()} />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-muted-foreground flex items-center justify-center px-4 py-6 text-xs">
                <Info className="mr-2 size-4" />
                保存済みパターンはありません
              </div>
            ) : (
              <div className="divide-y">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="hover:bg-muted/40 flex items-center gap-2 px-4 py-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Bookmark className="text-muted-foreground size-3 shrink-0" />
                        <p className="truncate text-sm font-medium">{tpl.name}</p>
                      </div>
                      {(tpl.lessonName || tpl.studioName) && (
                        <p className="text-muted-foreground truncate text-xs">
                          {[tpl.lessonName, tpl.studioName].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-muted-foreground truncate text-xs">
                        {REPEAT_TYPE_LABELS[tpl.recurrenceType]}
                        {tpl.daysOfWeek.length > 0 && ` · ${formatDays(tpl.daysOfWeek)}`}
                        {tpl.startTime && ` · ${tpl.startTime}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 text-xs"
                      onClick={() => handleLoadTemplate(tpl)}
                    >
                      読込
                    </Button>
                    {canManageTemplate(tpl) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-7 shrink-0 p-0"
                              disabled={deleteMutation.isPending}
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t p-3">
            {canSaveCurrentSettings ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={handleOpenSaveDialog}
              >
                + 現在の設定を保存
              </Button>
            ) : (
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger render={<span className="flex w-full" />}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="pointer-events-none h-8 w-full text-xs opacity-50"
                      disabled
                      aria-disabled
                    >
                      + 現在の設定を保存
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      店舗・レッスン・スタジオ・開始時刻・曜日を入力してください
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <Form {...saveForm}>
            <form onSubmit={saveForm.handleSubmit(handleSaveTemplate)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>繰り返しパターンを保存</DialogTitle>
                <DialogDescription>
                  現在の繰り返し設定をテンプレートとして保存します。次回以降の登録で呼び出して再利用できます
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {canOverwrite && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block text-xs font-medium">
                      保存モード
                    </Label>
                    <RadioGroup
                      value={saveMode}
                      onValueChange={(v) => setSaveMode(v as 'new' | 'overwrite')}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="overwrite" id="save-overwrite" />
                        <Label htmlFor="save-overwrite" className="cursor-pointer text-sm">
                          「{loadedTemplate?.name}」を上書き保存
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="new" id="save-new" />
                        <Label htmlFor="save-new" className="cursor-pointer text-sm">
                          新しいテンプレートとして保存
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                <FormField
                  control={saveForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        テンプレート名 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-8 text-sm"
                          placeholder="例: 平日朝クラス"
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="border-border/50 bg-muted/50 space-y-1.5 rounded-md border px-3 py-2">
                  <p className="text-xs font-semibold">保存される内容</p>
                  <p className="text-muted-foreground text-xs">
                    レッスン: {lessonName ?? '未設定'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    繰り返しタイプ: {REPEAT_TYPE_LABELS[repeatType ?? 'weekly']}
                    {(daysOfWeek ?? []).length > 0 && `（${formatDays(daysOfWeek ?? [])}）`} /
                    開始時刻: {startTime || '未設定'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    終了条件: {END_CONDITION_LABELS[endCondition ?? 'by_date']}
                    {endCondition === 'by_date' && endDate && `（${endDate}まで）`}
                    {endCondition === 'by_count' && Boolean(endCount) && `（${endCount}回）`} /
                    祝日スキップ設定: {skipHolidays ? '含む（ON）' : '含む（OFF）'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    ※ 日付・インストラクターは個別に入力してください
                  </p>
                  {/* TODO(round2) B9: the API template cannot store the end condition yet (FR-013 Q&A) */}
                  <p className="text-muted-foreground text-xs">
                    ※ 終了条件はテンプレートに保存されません（API未対応）
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => confirmDiscard(() => setSaveDialogOpen(false))}
                  disabled={isSaving}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={!saveForm.formState.isValid || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      保存中...
                    </>
                  ) : canOverwrite && saveMode === 'overwrite' ? (
                    '上書き保存'
                  ) : (
                    '保存'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
