'use client';

import { TermsStatusBadge } from '@/app/(private)/terms/_components/terms-detail/terms-status-badge';
import { TERMS_TYPE_LABELS, termsBrandEnums } from '@/app/(private)/terms/_constants/constants';
import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { BrandBadge } from '@/components/common/brand-badge';
import { Field } from '@/components/common/field';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { TermsDocumentDetailDto as TermsDetailDto } from '@/lib/api-real/types.gen';

interface ManagementInfoCardProps {
  terms: TermsDetailDto;
}

export function ManagementInfoCard({ terms }: Readonly<ManagementInfoCardProps>) {
  const appliedVersion = terms.relatedVersions.find(
    (version) => version.status === 'published' && !version.isDeleted,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">管理情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <Field label="ステータス" value={<TermsStatusBadge terms={terms} />} />
          <Field
            label="適用中バージョン"
            value={
              appliedVersion ? (
                <Badge variant="outline" className="max-w-full" title={appliedVersion.version}>
                  <span className="truncate">{appliedVersion.version}</span>
                </Badge>
              ) : undefined
            }
          />
          <Field label="規約ID" value={terms.id} />
          <Field label="承諾ボタン表示" value={terms.requiresConsent ? 'オン' : 'オフ'} />
          <Field label="規約タイプ" value={TERMS_TYPE_LABELS[terms.termsType] ?? terms.termsType} />
          <Field
            label="ブランド"
            value={
              <div className="flex flex-wrap gap-1">
                {termsBrandEnums(terms.brandEnum).map((brand) => (
                  <BrandBadge key={brand} brand={brand} />
                ))}
              </div>
            }
          />
          <Field label="適用開始日" value={formatDateYYYYMMDD(terms.effectiveFrom)} />
          <Field
            label="適用終了予定日"
            value={terms.effectiveTo ? formatDateYYYYMMDD(terms.effectiveTo) : undefined}
          />
          <Field label="表示順" value={terms.displayOrder ?? undefined} />
          <div className="border-t pt-4">
            <div className="flex flex-col gap-4">
              <Field label="作成日時" value={formatDateYYYYMMDD_HHMM(terms.createdAt)} />
              <Field label="最終更新日時" value={formatDateYYYYMMDD_HHMM(terms.updatedAt)} />
              <Field label="最終更新者" value={terms.updatedByName || undefined} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
