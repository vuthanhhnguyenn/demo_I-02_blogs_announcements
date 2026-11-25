import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  SURVEY_RESPONSE_ROW_STATUS_BADGE_CLASSES,
  SURVEY_RESPONSE_ROW_STATUS_LABELS,
  type SurveyResponseRowStatus,
} from '../../../_constants/constants';

interface ResponseStatusSectionProps {
  status: SurveyResponseRowStatus;
  submittedAt: string | null;
}

export function ResponseStatusSection({
  status,
  submittedAt,
}: Readonly<ResponseStatusSectionProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">回答ステータス</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">ステータス</p>
            <Badge variant="outline" className={SURVEY_RESPONSE_ROW_STATUS_BADGE_CLASSES[status]}>
              {SURVEY_RESPONSE_ROW_STATUS_LABELS[status]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">回答日時</p>
            <p className="text-sm">{formatDateYYYYMMDD_HHMM(submittedAt, '—')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
