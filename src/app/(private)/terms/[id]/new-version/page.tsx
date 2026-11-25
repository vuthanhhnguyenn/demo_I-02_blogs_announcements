'use client';

import { useParams, useRouter } from 'next/navigation';

import { TermsForm } from '@/app/(private)/terms/_components/terms-form/terms-form';
import { TermsFormSkeleton } from '@/app/(private)/terms/_components/terms-form/terms-form-skeleton';
import {
  TERMS_BRANDS,
  TERMS_ID_PATTERN,
  type TermsBrand,
  type TermsType,
} from '@/app/(private)/terms/_constants/constants';
import { useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Button } from '@/components/ui/button';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminTermsControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

export default function TermsNewVersionPage() {
  const params = useParams();
  const router = useRouter();
  const termsId = params.id as string;
  const isValidId = TERMS_ID_PATTERN.test(termsId);

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminTermsControllerDetailOptions({ path: { id: termsId } }),
    enabled: isValidId,
  });
  // An unknown / out-of-scope id (404 E-TERM-001) or a non-UUID one is a not-found, not a
  // network failure (staffs / transfers detail pattern).
  const isNotFound = !isValidId || getApiErrorStatus(error) === 404;

  // A deleted document cannot be the source of a new version (FR-008): block the direct URL the
  // same way the button is hidden, pointing back to its detail (still viewable, FR-004).
  if (!data || data.deletedAt) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || (!isLoading && !isError)}
        onRetry={() => void refetch()}
        emptyState={
          data?.deletedAt
            ? {
                variant: 'empty',
                title: '削除済みの規約文書から新規バージョンは作成できません',
                description: `規約ID（${termsId}）は削除済みのため新規バージョンを作成できません。詳細画面から内容を確認できます。`,
                action: (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => router.push(navigate('/terms/[id]', termsId))}
                  >
                    詳細に戻る
                  </Button>
                ),
              }
            : {
                variant: 'empty',
                title: '規約文書が見つかりません',
                description: `指定された規約ID（${termsId}）は存在しないか、参照権限がありません。`,
                action: (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => router.push(navigate('/terms'))}
                  >
                    規約文書管理に戻る
                  </Button>
                ),
              }
        }
        skeleton={<TermsFormSkeleton />}
      />
    );
  }

  return (
    <TermsForm
      mode="new-version"
      sourceId={termsId}
      // The new version joins the source's lineage under its original (`parentTermsId ?? id`), so
      // the whole lineage is listed with the same badges as the detail timeline.
      relatedLineage={{ originalId: data.parentTermsId ?? data.id, versions: data.relatedVersions }}
      defaultValues={{
        // A shared document (`brandEnum: null`) belongs to both brand groups: both ticked (D-1).
        brandEnum: data.brandEnum ? [data.brandEnum as TermsBrand] : [...TERMS_BRANDS],
        title: data.title,
        termsType: data.termsType as TermsType,
        displayOrder: data.displayOrder,
        requiresConsent: data.requiresConsent,
      }}
    />
  );
}
