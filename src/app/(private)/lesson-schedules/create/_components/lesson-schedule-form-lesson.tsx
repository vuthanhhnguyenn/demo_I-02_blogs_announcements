'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { TextWithTooltip } from '@/components/common/text-with-tooltip';
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
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';

import { PICKER_SEARCH_DEBOUNCE_MS } from '../_constants/constants';
import { useLessonSearch, useSelectedLesson } from '../_hooks/use-lesson-options.hook';
import type { LessonScheduleFormValues } from '../_schemas/lesson-schedule-form.schema';
import { ListLoadError } from './list-load-error';

const formatLesson = (lesson: { name: string; durationMinutes?: number | null }) =>
  `${lesson.name}${lesson.durationMinutes ? ` (${lesson.durationMinutes}分)` : ''}`;

export function LessonScheduleFormLesson() {
  const form = useFormContext<LessonScheduleFormValues>();
  const [lessonType, storeId, lessonId] = useWatch({
    control: form.control,
    name: ['lesson_type', 'store_id', 'lesson_id'],
  });
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim(), PICKER_SEARCH_DEBOUNCE_MS);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Active lesson masters of the chosen kind and the store's brand (API-111), searched on the
  // server and read page by page as the list scrolls
  const lessons = useLessonSearch(lessonType, storeId, search, open);
  const sentinelRef = useInfiniteScroll({
    hasMore: lessons.hasNextPage && !lessons.isFetchNextPageError,
    isLoading: lessons.isFetchingNextPage,
    onLoadMore: lessons.fetchNextPage,
    rootRef: listRef,
    enabled: open,
  });

  // The chosen lesson's name / length come from its detail, whichever page it was picked from
  const { lesson: selectedLesson, isAllowed } = useSelectedLesson(lessonId, lessonType, storeId);

  // A lesson chosen before the kind or the store changed may no longer be allowed — drop it
  useEffect(() => {
    if (lessonId && isAllowed === false) {
      form.setValue('lesson_id', '', { shouldDirty: true });
    }
  }, [lessonId, isAllowed, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearchInput('');
  };

  return (
    <Card>
      <CardContent className="px-6">
        <h2 className="mb-4 text-base font-bold">レッスン内容</h2>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="lesson_id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  レッスン <span className="text-destructive">*</span>
                </FormLabel>
                <Popover open={open} onOpenChange={handleOpenChange}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-invalid={!!fieldState.error}
                        className="h-8 w-full min-w-0 justify-between text-sm font-normal"
                      />
                    }
                  >
                    {/* A long name ends in 「…」 with the full name on hover, like the store select */}
                    {field.value && selectedLesson?.id === field.value ? (
                      <TextWithTooltip
                        text={formatLesson(selectedLesson)}
                        wrapperClassName="min-w-0 flex-1"
                        className="w-full text-left"
                      />
                    ) : (
                      <span className="text-muted-foreground">レッスンを選択してください</span>
                    )}
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-(--anchor-width) p-0" align="start">
                    {/* The search runs on the server, not over the loaded rows */}
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={searchInput}
                        onValueChange={setSearchInput}
                        placeholder="レッスンを検索..."
                        className="h-8"
                      />
                      <CommandList ref={listRef}>
                        {lessons.isLoading ? (
                          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                            <Loader2 className="size-4 animate-spin" />
                            検索中...
                          </div>
                        ) : lessons.isError ? (
                          <div className="px-3 py-4">
                            <ListLoadError label="レッスン" onRetry={lessons.refetch} />
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>該当なし</CommandEmpty>
                            <CommandGroup>
                              {lessons.lessons.map((lesson) => (
                                <CommandItem
                                  key={lesson.id}
                                  value={lesson.id}
                                  onSelect={() => {
                                    field.onChange(lesson.id);
                                    handleOpenChange(false);
                                  }}
                                >
                                  <TextWithTooltip
                                    text={formatLesson(lesson)}
                                    wrapperClassName="min-w-0 flex-1"
                                    side="right"
                                    align="center"
                                  />
                                  <Check
                                    className={cn(
                                      'ml-auto size-4',
                                      field.value === lesson.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            {lessons.isFetchNextPageError ? (
                              <div className="px-3 py-2">
                                <ListLoadError
                                  label="続きのレッスン"
                                  onRetry={lessons.fetchNextPage}
                                />
                              </div>
                            ) : (
                              lessons.hasNextPage && (
                                <div
                                  ref={sentinelRef}
                                  className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
                                >
                                  {lessons.isFetchingNextPage && (
                                    <>
                                      <Loader2 className="size-3 animate-spin" />
                                      読み込み中...
                                    </>
                                  )}
                                </div>
                              )
                            )}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
