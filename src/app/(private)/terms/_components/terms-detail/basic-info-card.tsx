'use client';

import Link from 'next/link';

import { TermsBodyPreview } from '@/app/(private)/terms/_components/terms-body-preview';
import { formatFileSize } from '@/utils/format.util';
import { Eye, FileText } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Field } from '@/components/common/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { TermsDocumentDetailDto as TermsDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

interface BasicInfoCardProps {
  terms: TermsDetailDto;
}

export function BasicInfoCard({ terms }: Readonly<BasicInfoCardProps>) {
  // `pdfUrl` currently echoes the S3 key, so only an absolute URL is openable.
  const previewUrl = terms.pdfUrl?.startsWith('http') ? terms.pdfUrl : undefined;
  const isApplied = terms.status === 'published' && !terms.deletedAt;
  const backToListHref = useBackToListHref(navigate('/terms'));
  const withReturnTo = useWithReturnTo();
  // A version points at its original via `parentTermsId` (null on the original itself, FR-005).
  const original = terms.parentTermsId
    ? terms.relatedVersions.find((version) => version.id === terms.parentTermsId)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-4">
            <Field label="規約名" value={terms.title} />
            {terms.parentTermsId && (
              <Field
                label="オリジナル規約"
                value={
                  <Link
                    href={withReturnTo(
                      navigate('/terms/[id]', terms.parentTermsId),
                      backToListHref,
                    )}
                    className="text-primary hover:underline"
                  >
                    {original?.version ?? terms.parentTermsId}
                    {original?.isDeleted && '（削除済み）'}
                  </Link>
                }
              />
            )}
            <Field
              label="備考"
              value={
                terms.remarks ? <span className="whitespace-pre-wrap">{terms.remarks}</span> : null
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* This document's own body text / file / preview, whatever its status — a draft must be
          checkable before it takes effect, a deleted one stays viewable (FR-004/FR-005, US2-7). */}
      <Card>
        <CardHeader className="grid-cols-[minmax(0,1fr)]">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base font-semibold">
            <span className="shrink-0">規約本文</span>
            {isApplied && (
              <Badge variant="outline" className="min-w-0 shrink" title={`${terms.version} 適用中`}>
                <span className="truncate">{terms.version} 適用中</span>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">
              PDFはモバイルアプリで会員に配信されます。CRM 側ではテキスト本文で内容確認できます
            </p>
            <TermsBodyPreview bodyText={terms.bodyText} className="h-80" />
            <div className="bg-background flex w-fit max-w-full items-center gap-2 rounded-md border px-3 py-2">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              {terms.pdfFileName ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary min-w-0 text-xs wrap-anywhere hover:underline"
                >
                  {terms.pdfFileName}
                </a>
              ) : (
                <span className="text-muted-foreground min-w-0 text-xs">
                  ファイル情報を取得できません
                </span>
              )}
              {terms.pdfFileName && (
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  ({formatFileSize(terms.pdfFileSize)})
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-2 h-7 shrink-0 gap-1 text-[10px]"
                disabled={!previewUrl}
                onClick={() =>
                  previewUrl && window.open(previewUrl, '_blank', 'noopener,noreferrer')
                }
              >
                <Eye className="size-3" />
                プレビュー
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
