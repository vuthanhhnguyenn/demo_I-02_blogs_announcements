'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  TERMS_STATUS_TONES,
  TERMS_TIMELINE_STATUS_LABELS,
  type TermsVersionKind,
  VERSION_KIND_LABELS,
} from '@/app/(private)/terms/_constants/constants';
import { sortVersionsNewestFirst } from '@/app/(private)/terms/_utils/terms-versions.util';
import { formatDate } from '@/utils/format.util';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { ToneBadge } from '@/components/common/tone-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminTermsControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { TermsDocumentDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

interface VersionTimelineProps {
  terms: Pick<TermsDocumentDetailDto, 'id' | 'parentTermsId' | 'relatedVersions'>;
}

const INITIAL_VISIBLE_COUNT = 3;

export function VersionTimeline({ terms }: Readonly<VersionTimelineProps>) {
  const versions = sortVersionsNewestFirst(terms.relatedVersions);
  const originalId = terms.parentTermsId ?? terms.id;
  const [showAll, setShowAll] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const backToListHref = useBackToListHref(navigate('/terms'));
  const withReturnTo = useWithReturnTo();

  // The timeline carries no PDF URL; fetch that version's detail only when its button is clicked.
  const previewVersion = async (versionId: string) => {
    // Open the tab synchronously (inside the click) so the popup blocker allows it, then navigate.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    setPreviewingId(versionId);
    try {
      const detail = await queryClient.fetchQuery(
        adminTermsControllerDetailOptions({ path: { id: versionId } }),
      );
      if (detail.pdfUrl?.startsWith('http') && tab) {
        tab.location.href = detail.pdfUrl;
        return;
      }
      tab?.close();
      toast.error('PDFを開けませんでした');
    } catch (error) {
      tab?.close();
      toast.error(resolveApiErrorMessage(error));
    } finally {
      setPreviewingId(null);
    }
  };

  const kindOf = (id: string): TermsVersionKind => (id === originalId ? 'original' : 'version');
  // A version links to its original's detail page (Y-04 FR-005 L169); the original itself and a
  // document opened on the original have nothing to link to.
  const isLinkedOriginal = (id: string) => kindOf(id) === 'original' && id !== terms.id;
  const isApplied = (version: (typeof versions)[number]) =>
    version.status === 'published' && !version.isDeleted;

  const visibleVersions = showAll ? versions : versions.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-3">
      {visibleVersions.map((version, index) => (
        <div key={version.id} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'mt-1 size-3 rounded-full',
                isApplied(version) ? 'bg-success' : 'bg-muted-foreground/30',
              )}
            />
            {index < visibleVersions.length - 1 && <div className="bg-border w-px flex-1" />}
          </div>
          <div
            className={cn(
              'relative mb-2 flex-1 rounded-lg border p-4',
              isApplied(version) && 'border-success/30 bg-success/15',
              isLinkedOriginal(version.id) && 'hover:bg-muted/50 transition-colors',
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{version.version}</span>
                {/* Stretched link: the ::after covers the whole card; プレビュー sits above it. */}
                {isLinkedOriginal(version.id) ? (
                  <Badge
                    variant="outline"
                    render={
                      <Link
                        href={withReturnTo(navigate('/terms/[id]', version.id), backToListHref)}
                      />
                    }
                    className="text-primary overflow-visible after:absolute after:inset-0 after:rounded-lg hover:underline"
                  >
                    {VERSION_KIND_LABELS.original}
                  </Badge>
                ) : (
                  <Badge variant="outline">{VERSION_KIND_LABELS[kindOf(version.id)]}</Badge>
                )}
                <ToneBadge tone={TERMS_STATUS_TONES[version.status]}>
                  {TERMS_TIMELINE_STATUS_LABELS[version.status]}
                </ToneBadge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="relative z-10 h-7 gap-1 text-[10px]"
                disabled={previewingId === version.id}
                onClick={() => previewVersion(version.id)}
              >
                <Eye className="size-3" />
                プレビュー
              </Button>
            </div>
            <p className="text-muted-foreground mb-1 text-xs">
              {formatDate(version.effectiveFrom)} 〜{' '}
              {version.effectiveTo ? formatDate(version.effectiveTo) : '現在'}
            </p>
            {version.remarks && (
              <p className="text-sm wrap-anywhere whitespace-pre-wrap">{version.remarks}</p>
            )}
          </div>
        </div>
      ))}
      {versions.length > INITIAL_VISIBLE_COUNT && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground ml-7 w-fit gap-1 text-xs"
          onClick={() => setShowAll(true)}
        >
          <ChevronDown className="size-3" />
          過去のバージョンを表示（全{versions.length}件）
        </Button>
      )}
    </div>
  );
}
