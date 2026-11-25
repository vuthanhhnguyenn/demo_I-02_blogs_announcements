import Link from 'next/link';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { QuestionnaireAggregateQuestionDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { SURVEY_REAL_QUESTION_FORMAT_LABELS } from '../../_constants/constants';

type SurveyAnalyticsQuestion = QuestionnaireAggregateQuestionDto;

function formatLabel(format: string) {
  return SURVEY_REAL_QUESTION_FORMAT_LABELS[format] ?? format;
}

/** `percentage` has two decimals; the prototype prints it bare (「0% (0件)」), so trailing zeros go. */
function formatPercentage(percentage: number) {
  return `${Number(percentage.toFixed(1))}%`;
}

function QuestionCardHeader({ no, question }: { no: number; question: SurveyAnalyticsQuestion }) {
  return (
    <CardHeader className="pb-2">
      <div className="flex items-start gap-2">
        <CardTitle className="min-w-0 text-base font-semibold wrap-anywhere">
          設問{no}: {question.text}
        </CardTitle>
        <Badge variant="outline" className="shrink-0">
          {formatLabel(question.format)}
        </Badge>
        {/* A retired question (removed from the form) is listed only because it has answers in the period. */}
        {question.status === 'inactive' && (
          <Badge variant="secondary" className="shrink-0">
            無効
          </Badge>
        )}
      </div>
    </CardHeader>
  );
}

function BarChartRow({
  label,
  percentage,
  count,
}: {
  label: string;
  percentage: number;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-right text-xs wrap-anywhere">{label}</span>
      <div className="bg-muted h-6 flex-1 overflow-hidden rounded-sm">
        <div className="bg-primary/80 h-full rounded-sm" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-muted-foreground w-28 shrink-0 text-xs">
        {formatPercentage(percentage)} ({count}件)
      </span>
    </div>
  );
}

function SelectQuestionCard({ no, question }: { no: number; question: SurveyAnalyticsQuestion }) {
  return (
    <Card>
      <QuestionCardHeader no={no} question={question} />
      <CardContent className="flex flex-col gap-2">
        {question.choices.map((choice) => (
          <BarChartRow
            key={choice.choiceId}
            label={choice.text}
            percentage={choice.percentage}
            count={choice.count}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/** `rating` questions carry no choices: the API gives the mean (`avgRating`, null while unanswered). */
function RatingQuestionCard({ no, question }: { no: number; question: SurveyAnalyticsQuestion }) {
  return (
    <Card>
      <QuestionCardHeader no={no} question={question} />
      <CardContent className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold tabular-nums">
          {question.avgRating == null ? '—' : question.avgRating.toFixed(1)}
        </span>
        <span className="text-muted-foreground text-xs">
          平均評価（5段階）／回答 {question.answeredCount.toLocaleString()}件
        </span>
      </CardContent>
    </Card>
  );
}

function FreeTextQuestionCard({
  no,
  question,
  surveyId,
}: {
  no: number;
  question: SurveyAnalyticsQuestion;
  surveyId: string;
}) {
  return (
    <Card>
      <QuestionCardHeader no={no} question={question} />
      <CardContent>
        <p className="text-muted-foreground mb-3 text-xs">回答例（直近5件）:</p>
        <ul className="flex flex-col gap-2">
          {question.samples.length > 0 ? (
            question.samples.map((sample) => (
              <li key={sample.answerId} className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0 text-xs">-</span>
                <span className="min-w-0 flex-1 text-sm wrap-anywhere whitespace-pre-line">
                  「{sample.text}」
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  — {formatDateYYYYMMDD(sample.answeredAt, '—')}
                </span>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground text-sm">回答例はありません</li>
          )}
        </ul>
        <Link
          href={`${navigate('/surveys/responses')}?survey_id=${encodeURIComponent(surveyId)}`}
          className="text-primary mt-3 inline-flex items-center gap-1 text-xs hover:underline"
        >
          回答一覧で全件を見る
          <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function SurveyAnalyticsQuestionCards({
  questions,
  surveyId,
}: {
  questions: SurveyAnalyticsQuestion[];
  surveyId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {questions.map((question, index) => {
        if (question.format === 'free_text') {
          return (
            <FreeTextQuestionCard
              key={question.questionId}
              no={index + 1}
              question={question}
              surveyId={surveyId}
            />
          );
        }
        if (question.format === 'rating') {
          return (
            <RatingQuestionCard key={question.questionId} no={index + 1} question={question} />
          );
        }
        return <SelectQuestionCard key={question.questionId} no={index + 1} question={question} />;
      })}
    </div>
  );
}
