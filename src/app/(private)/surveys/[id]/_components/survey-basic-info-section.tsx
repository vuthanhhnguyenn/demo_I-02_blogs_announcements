import { formatDateYYYYMMDD } from '@/utils/date.util';

import { BrandBadge, type BrandEnumValue } from '@/components/common/brand-badge';
import { Field } from '@/components/common/field';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { QuestionnaireDetailDto } from '@/lib/api-real/types.gen';

import {
  SURVEY_RESPONSE_CATEGORY_BADGE_CLASSES,
  SURVEY_RESPONSE_CATEGORY_LABELS,
  type SurveyResponseCategory,
} from '../../_constants/constants';
import { collapseSurveyBrandEnums } from '../../_constants/survey-brand-group';

interface SurveyBasicInfoSectionProps {
  survey: QuestionnaireDetailDto;
}

export function SurveyBasicInfoSection({ survey }: SurveyBasicInfoSectionProps) {
  const category = survey.category as SurveyResponseCategory;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          <Field label="アンケートID" value={survey.code} />
          <Field label="アンケート名" value={survey.name} />
          <Field
            label="種別"
            value={
              <Badge variant="outline" className={SURVEY_RESPONSE_CATEGORY_BADGE_CLASSES[category]}>
                {SURVEY_RESPONSE_CATEGORY_LABELS[category] ?? survey.category}
              </Badge>
            }
          />
          <Field
            label="ブランド"
            value={
              survey.brandEnums.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {collapseSurveyBrandEnums(survey.brandEnums as BrandEnumValue[]).map((brand) => (
                    <BrandBadge key={brand} brand={brand} />
                  ))}
                </div>
              ) : (
                '—'
              )
            }
          />
          <Field
            label="発動トリガー"
            value={
              survey.triggerCode ? (
                <Badge variant="outline">{survey.triggerName ?? survey.triggerCode}</Badge>
              ) : (
                '—'
              )
            }
          />
          <Field label="作成日" value={formatDateYYYYMMDD(survey.createdAt, '—')} />
          <Field label="最終更新日" value={formatDateYYYYMMDD(survey.updatedAt, '—')} />
        </div>
      </CardContent>
    </Card>
  );
}
