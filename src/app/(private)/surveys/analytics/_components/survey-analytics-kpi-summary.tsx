import { Card, CardContent } from '@/components/ui/card';

interface SurveyAnalyticsKpiSummaryProps {
  /** `submittedCount` — 辞退 is not an answer. */
  totalResponses: number;
  /** `submittedCount / decidedCount`; null until someone decides (rendered —). */
  responseRatePct: number | null;
}

export function SurveyAnalyticsKpiSummary({
  totalResponses,
  responseRatePct,
}: SurveyAnalyticsKpiSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-muted-foreground mb-1 text-xs">総回答数</p>
          <p className="text-xl font-bold whitespace-nowrap">{totalResponses.toLocaleString()}件</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-muted-foreground mb-1 text-xs">回答率</p>
          <p className="text-xl font-bold whitespace-nowrap">
            {responseRatePct === null ? '—' : `${responseRatePct.toFixed(1)}%`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
