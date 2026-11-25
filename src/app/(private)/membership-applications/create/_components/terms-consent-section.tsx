'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { useRef } from 'react';
import { type Control } from 'react-hook-form';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import { Loader2 } from 'lucide-react';

import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';

import type { TermsDocumentSummaryDto } from '@/lib/api-real/types.gen';

import type { DirectEnrollmentFormValues } from '../_schemas/enrollment-form.schema';

interface TermsConsentSectionProps {
  readonly control: Control<DirectEnrollmentFormValues>;
  readonly hasBrand: boolean;
  readonly terms: TermsDocumentSummaryDto[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
}

/**
 * 規約同意 (prototype 9/17) — the published terms documents requiring consent (Y-04 規約文書管理,
 * API-076 §3), narrowed to the selected brand once one is picked; every one listed must be
 * agreed before 入会登録, and each is sent as a `termsConsents` row. The list scrolls inside the
 * card and pulls the next page as its end comes into view.
 */
export function TermsConsentSection({
  control,
  hasBrand,
  terms,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: TermsConsentSectionProps) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  // The sentinel stays mounted while every loaded row is filtered out, so a page with no
  // matching terms keeps pulling the next one instead of stopping on the empty notice.
  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore,
    rootRef: scrollRootRef,
    enabled: !isError,
  });

  const notice = isError
    ? '規約を取得できませんでした。時間をおいて再度お試しください。'
    : !isLoading && !hasNextPage && terms.length === 0
      ? '同意が必要な規約が登録されていません。'
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>規約同意</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="consent.terms"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-4">
              <p className="text-muted-foreground text-xs">
                申請者が以下の規約に同意したことを確認してください。すべての規約への同意が必要です。
                {!hasBrand && '（ブランドを選択すると、そのブランドの規約に絞り込まれます）'}
              </p>
              {notice ? (
                <p
                  className={isError ? 'text-destructive text-sm' : 'text-muted-foreground text-sm'}
                >
                  {notice}
                </p>
              ) : isLoading ? (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              ) : (
                <div ref={scrollRootRef} className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                  {terms.map((term) => (
                    <label key={term.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={!!field.value[term.id]}
                        onCheckedChange={(v) => field.onChange({ ...field.value, [term.id]: !!v })}
                        className="mt-0.5"
                      />
                      <span className="flex min-w-0 flex-col gap-1 leading-snug">
                        <span className="wrap-anywhere">
                          {term.title}に同意した
                          <span className="text-destructive ml-0.5">*</span>
                        </span>
                        <span className="text-muted-foreground text-xs wrap-anywhere">
                          {term.version}（{formatDateYYYYMMDD(term.effectiveFrom)}施行）
                        </span>
                      </span>
                    </label>
                  ))}
                  {hasNextPage && (
                    <div
                      ref={sentinelRef}
                      className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
                    >
                      {isFetchingNextPage && (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          読み込み中...
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
