import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type {
  AdminQuestionnaireQuestionDto,
  QnrAnswerDetailAnswerDto,
} from '@/lib/api-real/types.gen';

import { SURVEY_REAL_QUESTION_FORMAT_LABELS } from '../../../_constants/constants';

interface ResponseAnswersSectionProps {
  answers: QnrAnswerDetailAnswerDto[];
  /** The questionnaire's questions: the response only carries the answered ones. */
  questions?: AdminQuestionnaireQuestionDto[];
}

/** An active question the member left out, shown as 未回答 (FR-R05). */
function toUnansweredItem(question: AdminQuestionnaireQuestionDto): QnrAnswerDetailAnswerDto {
  return {
    questionId: question.questionId,
    displayOrder: question.displayOrder,
    text: question.text,
    format: question.format as QnrAnswerDetailAnswerDto['format'],
    choices: [],
    textValue: null,
    ratingValue: null,
  };
}

/** The picked choices, the free text, or the star rating — whichever the format carries. */
function answerValues(answer: QnrAnswerDetailAnswerDto): string[] {
  if (answer.format === 'free_text') return answer.textValue ? [answer.textValue] : [];
  if (answer.format === 'rating')
    return answer.ratingValue != null ? [`${answer.ratingValue}`] : [];
  return answer.choices.map((choice) => choice.text);
}

export function ResponseAnswersSection({ answers, questions }: ResponseAnswersSectionProps) {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const unanswered = (questions ?? [])
    .filter((question) => question.status === 'active' && !answeredIds.has(question.questionId))
    .map(toUnansweredItem);
  const sortedAnswers = [...answers, ...unanswered].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          回答内容（{sortedAnswers.length}問）
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-5">
          {sortedAnswers.map((answer, index) => {
            const values = answerValues(answer);
            const isFreeText = answer.format === 'free_text';

            return (
              <div
                key={answer.questionId}
                className="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5 shrink-0 text-xs">
                    Q{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-sm font-medium break-words">{answer.text}</p>
                    <Badge variant="outline">
                      {SURVEY_REAL_QUESTION_FORMAT_LABELS[answer.format] ?? answer.format}
                    </Badge>
                  </div>
                </div>

                <div className="ml-8 min-w-0">
                  {values.length > 0 ? (
                    isFreeText ? (
                      <p className="bg-muted/40 rounded-md p-3 text-sm leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
                        {values[0]}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => (
                          <Badge
                            key={`${answer.questionId}-${value}`}
                            variant="outline"
                            className="h-auto max-w-full py-0.5 text-left break-words whitespace-normal"
                          >
                            {value}
                          </Badge>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="text-muted-foreground text-xs">未回答</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
