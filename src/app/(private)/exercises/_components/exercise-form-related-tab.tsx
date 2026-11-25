'use client';

import { type ReactNode, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Loader2, TriangleAlert, X } from 'lucide-react';

import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type {
  CandidatePaging,
  EquipmentRow,
  SelectedEquipment,
  SelectedRelatedExercise,
} from '../_hooks/use-exercise-form-candidates';
import { useExerciseTagGroups } from '../_hooks/use-exercise-master-options';
import type { ExerciseFormInput } from '../_schemas/exercise-form.schema';

export type RelatedExerciseOption = {
  id: string;
  name: string;
  exerciseCode: string | null;
  categoryLabel: string;
};

/** FR-013: at most 3 related exercises. */
const RELATED_EXERCISE_MAX = 3;

/** 器具種別不一致 badge (same as E-03 training-equipment-detail). */
function ToolMismatchBadge({
  equipmentToolName,
  exerciseToolLabel,
}: {
  equipmentToolName: string | null;
  exerciseToolLabel: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
          <Badge
            variant="outline"
            className="bg-warning/15 text-warning border-warning/20 cursor-help gap-1 text-[10px]"
          >
            <TriangleAlert className="size-3" />
            種別不一致
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px]">
          <p className="text-xs wrap-anywhere">
            この機材の器具種別（{equipmentToolName ?? '未設定'}）がこのエクササイズの器具種別（
            {exerciseToolLabel || '未選択'}）と異なります
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** A linked 機材 the BE answers with null fields: deleted, or gate-svc could not be read. */
function EquipmentUnavailableBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
          <Badge variant="destructive" className="cursor-help gap-1 text-[10px] font-normal">
            <TriangleAlert className="size-3" />
            取得不可
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px]">
          <p className="text-xs wrap-anywhere">
            機材が削除されたか、機材情報を取得できませんでした。不要な場合はチェックを外してください
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ToolTypeBadge({ toolName }: { toolName: string | null }) {
  if (!toolName) return null;
  return (
    <Badge
      variant="secondary"
      className="max-w-[160px] shrink-0 truncate text-[10px] font-normal"
      title={toolName}
    >
      {toolName}
    </Badge>
  );
}

/**
 * Scrollable candidate list that loads the next page when its end scrolls into view. The
 * sentinel stays mounted even when every loaded row is filtered out (already selected / self),
 * so a page with nothing to show keeps pulling the next one instead of stopping on the empty text.
 */
function CandidateScrollList({
  children,
  emptyText,
  isEmpty,
  paging,
}: {
  children: ReactNode;
  emptyText: string;
  isEmpty: boolean;
  paging?: CandidatePaging;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    hasMore: paging?.hasMore ?? false,
    isLoading: paging?.isFetchingMore ?? false,
    onLoadMore: () => paging?.loadMore(),
    rootRef,
    enabled: Boolean(paging),
  });
  const isLoadingMore = paging?.isFetchingMore ?? false;

  return (
    <div ref={rootRef} className="max-h-[240px] space-y-1 overflow-y-auto rounded-md border p-3">
      {children}
      {isEmpty && !isLoadingMore && !paging?.hasMore && !paging?.loadFailed ? (
        <p className="text-muted-foreground px-2 py-2 text-xs">{emptyText}</p>
      ) : null}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {isLoadingMore ? (
        <p className="text-muted-foreground flex items-center gap-2 px-2 py-2 text-xs">
          <Loader2 className="size-4 animate-spin" />
          読み込み中...
        </p>
      ) : null}
      {paging?.loadFailed && !isLoadingMore ? (
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <p className="text-destructive text-xs">続きを読み込めませんでした。</p>
          <Button type="button" variant="outline" size="sm" onClick={() => paging.loadMore()}>
            再読み込み
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function EquipmentChecklistSection({
  disabled,
  equipment,
  isMismatch,
  exerciseToolLabel,
  onPick,
  onSearchTextChange,
  onToggle,
  paging,
  searchText,
  selectedIds,
  selectedItems,
}: {
  disabled?: boolean;
  /** Candidates already narrowed by the server-side keyword. */
  equipment: readonly EquipmentRow[];
  /** Whether a linked equipment's 器具種別 differs from the exercise's. */
  isMismatch: (item: SelectedEquipment) => boolean;
  exerciseToolLabel: string;
  /** A candidate row was ticked — the form keeps it to name the selection. */
  onPick: (item: EquipmentRow) => void;
  onSearchTextChange: (value: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  paging: CandidatePaging;
  searchText: string;
  selectedIds: string[];
  /** Selected rows resolved by id — they can sit outside the loaded pages and the search. */
  selectedItems: readonly SelectedEquipment[];
}) {
  const availableItems = equipment.filter((item) => !selectedIds.includes(item.id));

  return (
    <div className="space-y-3">
      {selectedItems.length > 0 ? (
        <div className="bg-primary/5 space-y-1 rounded-md border p-2">
          <p className="text-muted-foreground px-2 text-[10px]">
            選択中（{selectedItems.length}件）
          </p>
          {selectedItems.map((item) => (
            <label
              key={item.id}
              className="hover:bg-muted/30 flex min-w-0 cursor-pointer items-center gap-2 rounded px-2 py-2"
            >
              <Checkbox
                checked
                onCheckedChange={(checked) => onToggle(item.id, Boolean(checked))}
              />
              {item.isUnavailable ? (
                <>
                  <span
                    className="text-muted-foreground min-w-0 truncate text-sm line-through"
                    title={item.id}
                  >
                    不明な機材
                  </span>
                  <EquipmentUnavailableBadge />
                </>
              ) : (
                <>
                  <span className="min-w-0 truncate text-sm" title={item.label}>
                    {item.label}
                  </span>
                  <ToolTypeBadge toolName={item.toolName} />
                </>
              )}
              {isMismatch(item) ? (
                <ToolMismatchBadge
                  equipmentToolName={item.toolName}
                  exerciseToolLabel={exerciseToolLabel}
                />
              ) : null}
            </label>
          ))}
        </div>
      ) : null}

      <Input
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        placeholder="機材名で検索"
        className="h-8 text-xs"
        disabled={disabled}
      />

      <CandidateScrollList
        emptyText="該当する機材がありません"
        isEmpty={!disabled && availableItems.length === 0}
        paging={disabled ? undefined : paging}
      >
        {!disabled
          ? availableItems.map((item) => (
              <label
                key={item.id}
                className="hover:bg-muted/50 flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-2"
              >
                <Checkbox
                  checked={false}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    if (checked) onPick(item);
                    onToggle(item.id, Boolean(checked));
                  }}
                />
                <span className="min-w-0 truncate text-sm" title={item.label}>
                  {item.label}
                </span>
                <ToolTypeBadge toolName={item.toolName} />
                <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
                  {item.id}
                </span>
              </label>
            ))
          : null}
      </CandidateScrollList>
      <p className="text-muted-foreground text-xs">
        器具種別が「なし（自重）」の場合は機材紐づけ不要です。器具種別と異なる機材は「種別不一致」として保存前に確認します
      </p>
    </div>
  );
}

function RelatedExerciseSelectorSection({
  currentExerciseId,
  onSearchTextChange,
  onToggle,
  options,
  paging,
  searchText,
  selectedIds,
  selectedOptions,
}: {
  currentExerciseId?: string;
  onSearchTextChange: (value: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  options: readonly RelatedExerciseOption[];
  paging: CandidatePaging;
  searchText: string;
  selectedIds: string[];
  selectedOptions: readonly SelectedRelatedExercise[];
}) {
  // `options` is already narrowed by the server-side keyword search (D11).
  const availableOptions = options.filter(
    (item) => item.id !== currentExerciseId && !selectedIds.includes(item.id),
  );
  const remaining = Math.max(RELATED_EXERCISE_MAX - selectedIds.length, 0);

  return (
    <div className="space-y-3">
      {selectedOptions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {selectedOptions.map((item) => (
            <div
              key={item.id}
              className="bg-muted/50 flex min-w-0 items-center justify-between gap-2 rounded-md p-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <p
                  className={
                    item.isMissing
                      ? 'text-muted-foreground min-w-0 truncate text-sm font-medium line-through'
                      : 'min-w-0 truncate text-sm font-medium'
                  }
                  title={item.name ?? undefined}
                >
                  {item.isMissing ? '削除されたエクササイズ' : (item.name ?? '読み込み中...')}
                </p>
                {item.isMissing ? (
                  <Badge variant="destructive" className="shrink-0 text-xs font-normal">
                    削除済み
                  </Badge>
                ) : item.categoryLabel ? (
                  <Badge
                    variant="secondary"
                    className="max-w-[160px] shrink-0 truncate text-xs font-normal"
                    title={item.categoryLabel}
                  >
                    {item.categoryLabel}
                  </Badge>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-6 shrink-0"
                aria-label={`${item.name ?? '関連エクササイズ'}を解除`}
                onClick={() => onToggle(item.id, false)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {remaining > 0 ? (
        <>
          <Input
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder={`エクササイズを選択（最大${RELATED_EXERCISE_MAX}件、残り${remaining}件）`}
            aria-label="関連エクササイズを検索"
            className="h-8 text-xs"
          />
          <CandidateScrollList
            emptyText="該当するエクササイズがありません"
            isEmpty={availableOptions.length === 0}
            paging={paging}
          >
            {availableOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="hover:bg-muted/50 focus-visible:bg-muted/50 flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left outline-none"
                onClick={() => onToggle(item.id, true)}
              >
                <span className="min-w-0 truncate text-sm" title={item.name}>
                  {item.name}
                </span>
                {item.categoryLabel ? (
                  <Badge
                    variant="secondary"
                    className="max-w-[160px] shrink-0 truncate text-xs font-normal"
                    title={item.categoryLabel}
                  >
                    {item.categoryLabel}
                  </Badge>
                ) : null}
                <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                  {item.exerciseCode}
                </span>
              </button>
            ))}
          </CandidateScrollList>
        </>
      ) : (
        <p className="text-muted-foreground text-xs">最大3件まで登録できます</p>
      )}
    </div>
  );
}

/** FR-010 タグ switches, grouped under their axis (グリップ / 向き …, R302). */
function TagSwitchGroups({
  enabledTagIds,
  onToggle,
  tagMaster,
}: {
  enabledTagIds: readonly string[];
  onToggle: (tagId: string, next: boolean) => void;
  tagMaster: ReturnType<typeof useExerciseTagGroups>;
}) {
  if (tagMaster.isLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Loader2 className="size-4 animate-spin" />
        読み込み中...
      </p>
    );
  }
  if (tagMaster.isError) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-destructive text-xs">タグを取得できませんでした。</p>
        <Button type="button" variant="outline" size="sm" onClick={tagMaster.refetch}>
          再読み込み
        </Button>
      </div>
    );
  }
  if (tagMaster.groups.length === 0) {
    return <p className="text-muted-foreground text-xs">タグが登録されていません</p>;
  }
  return (
    <div className="space-y-4">
      {tagMaster.groups.map((group) => (
        <div key={group.axisCode ?? '__none__'} className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">{group.axisName}</p>
          <div className="flex flex-wrap gap-4">
            {group.tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2">
                <Switch
                  checked={enabledTagIds.includes(tag.id)}
                  onCheckedChange={(next) => onToggle(tag.id, next)}
                />
                <span className="text-sm">{tag.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type ExerciseFormRelatedTabProps = {
  currentExerciseId?: string;
  equipmentOptions: readonly EquipmentRow[];
  equipmentPaging: CandidatePaging;
  equipmentSearch: string;
  /** The exercise's 器具種別 (empty = not chosen) and its label, for the 種別不一致 check. */
  exerciseToolId: string;
  exerciseToolLabel: string;
  isBodyweightToolSelected: boolean;
  isEquipmentError: boolean;
  isEquipmentLoading: boolean;
  onEquipmentPick: (item: EquipmentRow) => void;
  onEquipmentSearchChange: (value: string) => void;
  onRelatedExerciseSearchChange: (value: string) => void;
  relatedExerciseOptions: readonly RelatedExerciseOption[];
  relatedExercisePaging: CandidatePaging;
  relatedExerciseSearch: string;
  selectedEquipment: readonly SelectedEquipment[];
  selectedRelatedExercises: readonly SelectedRelatedExercise[];
};

export function ExerciseFormRelatedTab({
  currentExerciseId,
  equipmentOptions,
  equipmentPaging,
  equipmentSearch,
  exerciseToolId,
  exerciseToolLabel,
  isBodyweightToolSelected,
  isEquipmentError,
  isEquipmentLoading,
  onEquipmentPick,
  onEquipmentSearchChange,
  onRelatedExerciseSearchChange,
  relatedExerciseOptions,
  relatedExercisePaging,
  relatedExerciseSearch,
  selectedEquipment,
  selectedRelatedExercises,
}: Readonly<ExerciseFormRelatedTabProps>) {
  const form = useFormContext<ExerciseFormInput>();
  const tagMaster = useExerciseTagGroups();
  const enabledTagIds =
    useWatch({
      control: form.control,
      name: 'enabledTagIds',
      defaultValue: [],
    }) ?? [];
  const linkedEquipmentIds =
    useWatch({
      control: form.control,
      name: 'linkedEquipmentIds',
      defaultValue: [],
    }) ?? [];
  const relatedExerciseIds =
    useWatch({
      control: form.control,
      name: 'relatedExerciseIds',
      defaultValue: [],
    }) ?? [];

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">機材紐づけ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-6">
          {isEquipmentLoading ? (
            <p className="text-muted-foreground text-xs">機材一覧を読み込み中です...</p>
          ) : null}
          {isEquipmentError ? (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                機材一覧の取得に失敗しました。時間をおいて再度お試しください。
              </AlertDescription>
            </Alert>
          ) : null}
          <EquipmentChecklistSection
            disabled={isBodyweightToolSelected || isEquipmentLoading || isEquipmentError}
            equipment={isBodyweightToolSelected ? [] : equipmentOptions}
            exerciseToolLabel={exerciseToolLabel}
            isMismatch={(item) =>
              Boolean(exerciseToolId) &&
              !isBodyweightToolSelected &&
              item.toolId !== null &&
              item.toolId !== exerciseToolId
            }
            onPick={onEquipmentPick}
            onSearchTextChange={onEquipmentSearchChange}
            paging={equipmentPaging}
            onToggle={(id, checked) => {
              const current = form.getValues('linkedEquipmentIds') ?? [];
              form.setValue(
                'linkedEquipmentIds',
                checked ? [...current, id] : current.filter((value) => value !== id),
                { shouldDirty: true, shouldValidate: true },
              );
            }}
            searchText={equipmentSearch}
            selectedIds={linkedEquipmentIds}
            selectedItems={selectedEquipment}
          />
          <FormField
            control={form.control}
            name="linkedEquipmentIds"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">関連エクササイズ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-6">
          <p className="text-muted-foreground text-xs">
            モバイルアプリで「関連種目」として表示されます。最大3件まで設定できます。
          </p>
          <RelatedExerciseSelectorSection
            currentExerciseId={currentExerciseId}
            onSearchTextChange={onRelatedExerciseSearchChange}
            onToggle={(id, checked) => {
              const current = form.getValues('relatedExerciseIds') ?? [];
              if (checked && (current.includes(id) || current.length >= RELATED_EXERCISE_MAX)) {
                return;
              }
              form.setValue(
                'relatedExerciseIds',
                checked ? [...current, id] : current.filter((value) => value !== id),
                { shouldDirty: true, shouldValidate: true },
              );
            }}
            options={relatedExerciseOptions}
            paging={relatedExercisePaging}
            searchText={relatedExerciseSearch}
            selectedIds={relatedExerciseIds}
            selectedOptions={selectedRelatedExercises}
          />
          <FormField
            control={form.control}
            name="relatedExerciseIds"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">タグ設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <p className="text-muted-foreground text-xs">
            このエクササイズで有効化するタグを選択してください。ONにしたタグのみ、モバイルアプリで会員がエクササイズ記録時に選択できます。
          </p>
          <TagSwitchGroups
            enabledTagIds={enabledTagIds}
            tagMaster={tagMaster}
            onToggle={(tagId, next) => {
              const current = form.getValues('enabledTagIds') ?? [];
              form.setValue(
                'enabledTagIds',
                next ? [...current, tagId] : current.filter((value) => value !== tagId),
                { shouldDirty: true },
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
