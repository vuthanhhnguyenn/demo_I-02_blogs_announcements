'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';

import { Check, ChevronDown, Loader2, X } from 'lucide-react';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';

import {
  type RestrictionKind,
  useRestrictionCandidates,
} from '../../_hooks/use-restriction-candidates.hook';
import type { LessonFormValues } from '../../_schemas/lesson-form.schema';

const SEARCH_DEBOUNCE_MS = 300;

type ContractFieldName = 'restrictedMainContracts' | 'restrictedOptionContracts';

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
        {number}
      </div>
      <h3 className="text-sm font-bold">{title}</h3>
    </div>
  );
}

function LoadError({
  label,
  className,
  onRetry,
}: {
  label: string;
  className?: string;
  onRetry: () => void;
}) {
  return (
    <p className={cn('text-destructive flex items-center justify-center gap-1 text-xs', className)}>
      {label}の取得に失敗しました
      <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={onRetry}>
        再試行
      </Button>
    </p>
  );
}

interface ContractMultiSelectProps {
  name: ContractFieldName;
  kind: RestrictionKind;
  brand: LessonFormValues['brand'] | undefined;
  label: string;
  /** What the candidates are called in a load error (主契約 / オプション契約) */
  candidateLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  /** Names of the stored restrictions (編集・複製) — the chips need no candidate list */
  knownLabels?: Readonly<Record<string, string>>;
  disabled?: boolean;
}

const ContractMultiSelect = memo(function ContractMultiSelect({
  name,
  kind,
  brand,
  label,
  candidateLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  knownLabels,
  disabled = false,
}: ContractMultiSelectProps) {
  const { control } = useFormContext<LessonFormValues>();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  // Names of the rows picked here — the chips keep them after the search moves on
  const [pickedLabels, setPickedLabels] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const candidates = useRestrictionCandidates(kind, brand, search, open);
  const sentinelRef = useInfiniteScroll({
    hasMore: candidates.hasNextPage && !candidates.isFetchNextPageError,
    isLoading: candidates.isFetchingNextPage,
    onLoadMore: candidates.fetchNextPage,
    rootRef: listRef,
    enabled: open,
  });

  const {
    field: { value, onChange },
  } = useController({ control, name });
  const selected = value as string[];
  const labelOf = (id: string) => pickedLabels[id] ?? knownLabels?.[id] ?? id;

  const toggle = useCallback(
    (id: string, itemLabel?: string) => {
      if (itemLabel) setPickedLabels((prev) => ({ ...prev, [id]: itemLabel }));
      onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
    },
    [onChange, selected],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearchInput('');
  };

  // Many picks wrap onto more rows and a long name truncates — the picker never widens its column
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-xs font-medium">{label}</label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              disabled={disabled}
              className="h-auto min-h-8 w-full items-center justify-between text-sm font-normal whitespace-normal"
            />
          }
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((item) => (
                <Badge key={item} variant="secondary" className="max-w-full gap-1 text-[11px]">
                  <span className="truncate" title={labelOf(item)}>
                    {labelOf(item)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${labelOf(item)}`}
                    className="hover:text-destructive shrink-0 cursor-pointer"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(item);
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="text-muted-foreground ml-1 size-4 shrink-0" />
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          {/* The search runs on the server (name / option code), not over the loaded rows */}
          <Command shouldFilter={false}>
            <CommandInput
              value={searchInput}
              onValueChange={setSearchInput}
              placeholder={searchPlaceholder}
            />
            <CommandList ref={listRef}>
              {candidates.isLoading ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  検索中...
                </div>
              ) : candidates.isError ? (
                <LoadError label={candidateLabel} className="py-6" onRetry={candidates.refetch} />
              ) : (
                <>
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {candidates.candidates.map((item) => {
                      const isSelected = selected.includes(item.value);
                      return (
                        <CommandItem
                          key={item.value}
                          value={item.value}
                          onSelect={() => toggle(item.value, item.label)}
                        >
                          <Check
                            className={cn('mr-2 size-4', isSelected ? 'opacity-100' : 'opacity-0')}
                          />
                          {item.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {candidates.isFetchNextPageError ? (
                    <LoadError
                      label={`続きの${candidateLabel}`}
                      className="py-2"
                      onRetry={candidates.fetchNextPage}
                    />
                  ) : (
                    candidates.hasNextPage && (
                      <div
                        ref={sentinelRef}
                        className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
                      >
                        {candidates.isFetchingNextPage && (
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
    </div>
  );
});

interface LessonFormRestrictionsProps {
  /** id → name of the stored plan / option restrictions (編集・複製) */
  knownLabels?: Readonly<Record<string, string>>;
}

/**
 * 予約制限 — the plans / options of the lesson's brand that may book it (ids; empty = everyone).
 * Each picker searches the selected brand's plan / option master on the server and reads the next
 * page as it scrolls, so every candidate can be found; until a brand is picked there is nothing to
 * choose from.
 */
export function LessonFormRestrictions({ knownLabels }: LessonFormRestrictionsProps) {
  const { control } = useFormContext<LessonFormValues>();
  const brand = useWatch({ control, name: 'brand' });

  return (
    <Card>
      <CardContent className="px-6">
        <SectionHeader number={2} title="予約制限" />
        <div className="grid grid-cols-2 gap-4">
          <ContractMultiSelect
            name="restrictedMainContracts"
            kind="plan"
            brand={brand}
            label="制限主契約"
            candidateLabel="主契約"
            placeholder="制限なし（複数選択可）"
            searchPlaceholder="主契約を検索..."
            emptyText="該当する契約がありません"
            knownLabels={knownLabels}
            disabled={!brand}
          />
          <ContractMultiSelect
            name="restrictedOptionContracts"
            kind="option"
            brand={brand}
            label="制限オプション契約"
            candidateLabel="オプション契約"
            placeholder="制限なし（複数選択可）"
            searchPlaceholder="オプション契約を検索..."
            emptyText="該当するオプションがありません"
            knownLabels={knownLabels}
            disabled={!brand}
          />
        </div>
      </CardContent>
    </Card>
  );
}
