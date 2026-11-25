'use client';

import { useMemo, useState } from 'react';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { ChevronDownIcon } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';

import { adminQuestionnaireControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  QuestionnaireListItemDto,
  QuestionnaireListResponseDto,
} from '@/lib/api-real/types.gen';

const PAGE_SIZE = 20;
/** `nameQuery` is capped at 100 characters by the API. */
const SEARCH_MAX_LENGTH = 100;

interface SurveyAnalyticsSurveySelectProps {
  surveyId: string;
  surveyName?: string;
  onChange: (surveyId: string) => void;
}

export function SurveyAnalyticsSurveySelect({
  surveyId,
  surveyName,
  onChange,
}: Readonly<SurveyAnalyticsSurveySelectProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const {
    data,
    isFetching,
    isError,
    isFetchNextPageError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...adminQuestionnaireControllerListInfiniteOptions({
      query: { limit: PAGE_SIZE, nameQuery: search || undefined },
    }),
    enabled: isOpen,
    // Keeps the list on screen while a new search term loads, instead of flashing the empty state.
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    getNextPageParam: (lastPage: QuestionnaireListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const surveys = useMemo(() => data?.pages.flatMap((page) => page.items ?? []) ?? [], [data]);

  return (
    <SearchableSelect<QuestionnaireListItemDto>
      value={surveyId || null}
      valueLabel={surveyName ?? 'アンケートを選択'}
      options={surveys}
      placeholder="アンケートを選択"
      searchPlaceholder="アンケート名・コードで検索..."
      searchMaxLength={SEARCH_MAX_LENGTH}
      emptyMessage={isError ? 'アンケートの取得に失敗しました' : '該当するアンケートがありません'}
      loadingMessage="アンケートを読み込み中..."
      loadingMoreMessage="読み込み中..."
      isLoading={isFetching}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearch}
      onSelect={(survey) => survey && onChange(survey.questionnaireId)}
      getOptionKey={(survey) => survey.questionnaireId}
      getOptionLabel={(survey) => survey.name}
      getOptionKeywords={(survey) => [survey.name, survey.code].filter(Boolean).join(' ')}
      renderOption={(survey) => (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TextWithTooltip
            text={survey.name}
            wrapperClassName="min-w-0 flex-1"
            className="w-full"
            side="right"
            align="center"
          />
          <span className="text-muted-foreground shrink-0 text-[11px]">{survey.code}</span>
        </div>
      )}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
      loadMoreFailed={isFetchNextPageError}
      endIcon={<ChevronDownIcon className="text-muted-foreground ml-2 size-4 shrink-0" />}
      triggerClassName="w-[400px] max-w-full"
      contentClassName="w-[400px]"
    />
  );
}
