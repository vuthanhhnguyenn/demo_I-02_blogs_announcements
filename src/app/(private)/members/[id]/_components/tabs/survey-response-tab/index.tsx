'use client';

import { SurveyResponseHistoryCard } from '@/app/(private)/surveys/_components/survey-response-history-card';

export function SurveyResponseHistoryTab({ memberId }: { memberId: string }) {
  return <SurveyResponseHistoryCard memberId={memberId} />;
}
