'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatDateTime } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminQuestionnaireResponseControllerListCrossResponsesOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { QuestionnaireResponseListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import {
  SURVEY_RESPONSE_CATEGORY_BADGE_CLASSES,
  SURVEY_RESPONSE_CATEGORY_LABELS,
} from '../_constants/constants';
import { useLastDefined } from './use-last-defined';

// Only a response that is not a finished submission carries a status badge, so a completed
// one keeps the prototype's plain card. Wording and tone follow the response list's 未完了 badge.
function getIncompleteStatus(
  item: QuestionnaireResponseListItemDto,
): { label: string; className: string } | null {
  if (item.responseStatus === 'declined') {
    return { label: '辞退', className: 'bg-muted text-muted-foreground border-border' };
  }
  if (item.responseStatus === 'in_progress' || !item.isComplete) {
    return { label: '未完了', className: 'bg-warning/15 text-warning border-warning/20' };
  }
  return null;
}

interface SurveyResponseHistoryCardProps {
  memberId: string;
  title?: string;
  /** The response currently on screen, if any — listed with 「表示中」 and not clickable. */
  currentAnswerId?: string;
}

export function SurveyResponseHistoryCard({
  memberId,
  title = 'アンケート回答履歴',
  currentAnswerId,
}: Readonly<SurveyResponseHistoryCardProps>) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminQuestionnaireResponseControllerListCrossResponsesOptions({
      query: {
        memberId,
        sort: 'submittedAt',
        order: 'desc',
        page,
        limit: PAGE_SIZE,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const pagination = useLastDefined(data?.pagination);
  const total = pagination?.totalItems ?? 0;
  const limit = pagination?.limit ?? PAGE_SIZE;
  const totalPages = Math.ceil(total / limit);
  // `keepPreviousData` keeps the old page on screen while the next one loads; dim it meanwhile
  const showOverlay = isFetching && !isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <History className="text-muted-foreground size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!data}
        errorDescription={resolveApiErrorMessage(error)}
        skeleton={<SurveyResponseHistorySkeleton />}
        onRetry={() => refetch()}
      >
        <CardContent
          className={cn('px-4 transition-opacity', showOverlay && 'opacity-50')}
          aria-busy={showOverlay}
        >
          {items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-xs">回答なし</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const incompleteStatus = getIncompleteStatus(item);
                const isCurrent = item.answerId === currentAnswerId;
                return (
                  <button
                    key={item.answerId}
                    type="button"
                    disabled={isCurrent}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() =>
                      router.push(
                        // The response detail is keyed by questionnaire + answer, so the destination
                        // gets `questionnaireId` alongside the answer id in the path.
                        navigate('/surveys/responses/[responseId]', item.answerId, {
                          questionnaireId: item.questionnaire.questionnaireId,
                        }),
                      )
                    }
                    className={cn(
                      'flex flex-col gap-1 rounded-md border p-3 text-left transition-colors',
                      isCurrent ? 'bg-muted/40 cursor-default' : 'hover:bg-accent cursor-pointer',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 text-sm font-medium break-all">
                        {item.questionnaire.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {isCurrent && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            表示中
                          </Badge>
                        )}
                        {incompleteStatus && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-normal ${incompleteStatus.className}`}
                          >
                            {incompleteStatus.label}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal ${SURVEY_RESPONSE_CATEGORY_BADGE_CLASSES[item.questionnaire.category]}`}
                        >
                          {SURVEY_RESPONSE_CATEGORY_LABELS[item.questionnaire.category]}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(item.submittedAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </DataStateBoundary>
      {/* Pagination stays outside the boundary: a failed page must still offer the way back */}
      {pagination && (
        <CardContent className="px-0 py-0">
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            isLoading={isFetching}
          />
        </CardContent>
      )}
    </Card>
  );
}

function SurveyResponseHistorySkeleton() {
  return (
    <CardContent className="flex flex-col gap-2 px-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </CardContent>
  );
}
