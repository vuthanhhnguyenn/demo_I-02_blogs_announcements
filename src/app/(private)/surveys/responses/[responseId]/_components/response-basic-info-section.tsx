import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { BrandBadge } from '@/components/common/brand-badge';
import { Field } from '@/components/common/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { QuestionnaireAnswerDetailDto } from '@/lib/api-real/types.gen';

import { formatSurveyMemberName, toSurveyBrandEnum } from '../../../_constants/constants';

interface ResponseBasicInfoSectionProps {
  response: QuestionnaireAnswerDetailDto;
}

export function ResponseBasicInfoSection({ response }: ResponseBasicInfoSectionProps) {
  const brand = toSurveyBrandEnum(response.store?.brandEnum);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          <Field label="会員番号" value={response.member.memberNumber ?? '—'} mono />
          <Field label="会員名" value={formatSurveyMemberName(response.member)} />
          <Field label="アンケート名" value={response.questionnaire.name} />
          <Field label="アンケートID" value={response.questionnaire.code} mono />
          <Field label="ブランド" value={brand ? <BrandBadge brand={brand} /> : '—'} />
          <Field label="店舗" value={response.store?.name ?? '—'} />
          <Field label="回答日時" value={formatDateYYYYMMDD_HHMM(response.submittedAt, '—')} />
        </div>
      </CardContent>
    </Card>
  );
}
