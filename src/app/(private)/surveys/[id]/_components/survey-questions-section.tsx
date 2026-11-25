import { Empty } from '@/components/common/data-state-boundary/empty';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { AdminQuestionnaireQuestionDto } from '@/lib/api-real/types.gen';

import { SURVEY_REAL_QUESTION_FORMAT_LABELS } from '../../_constants/constants';

interface SurveyQuestionsSectionProps {
  questions: AdminQuestionnaireQuestionDto[];
  /** 店舗選択中か（全店舗ビューではテンプレート全体を表示し範囲文を出さない） */
  isStoreScoped: boolean;
  storeName: string | undefined;
  /** Selected store; a question / choice is hidden for it when listed in `hiddenStoreIds`. */
  storeId: string;
}

export function SurveyQuestionsSection({
  questions,
  isStoreScoped,
  storeName,
  storeId,
}: SurveyQuestionsSectionProps) {
  const storeLabel = storeName ?? 'この店舗';
  const isHidden = (hiddenStoreIds: string[]) => isStoreScoped && hiddenStoreIds.includes(storeId);

  const annotated = [...questions]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((question) => ({
      ...question,
      visible: !isHidden(question.hiddenStoreIds),
      choices: [...question.choices]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((choice) => ({ ...choice, visible: !isHidden(choice.hiddenStoreIds) })),
    }));

  const offQuestions = annotated.filter((question) => !question.visible);
  const offChoiceQuestions = annotated.filter(
    (question) => question.visible && question.choices.some((choice) => !choice.visible),
  );
  const offChoiceCount = annotated
    .filter((question) => question.visible)
    .flatMap((question) => question.choices)
    .filter((choice) => !choice.visible).length;
  const joinNos = (items: typeof annotated) =>
    items.map((item) => `Q${item.displayOrder}`).join('、');

  const scopeText =
    offQuestions.length + offChoiceCount === 0
      ? `${storeLabel}で使う内容を表示中／すべての設問・回答選択肢を使用`
      : `${storeLabel}で使う内容を表示中／使わない${[
          offQuestions.length > 0
            ? `設問 ${offQuestions.length}問（${joinNos(offQuestions)}）`
            : null,
          offChoiceCount > 0
            ? `回答選択肢 ${offChoiceCount}件（${joinNos(offChoiceQuestions)}）`
            : null,
        ]
          .filter(Boolean)
          .join('・')}を除く`;

  const rows = annotated
    .filter((question) => question.visible)
    .map((question) => ({
      ...question,
      choices: question.choices.filter((choice) => choice.visible),
    }));

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="py-4">
        <CardTitle className="text-base font-semibold">設問一覧</CardTitle>
        {isStoreScoped ? (
          <CardDescription className="text-xs tabular-nums">{scopeText}</CardDescription>
        ) : null}
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 text-xs font-semibold">#</TableHead>
            <TableHead className="text-xs font-semibold">設問内容</TableHead>
            <TableHead className="w-[120px] text-xs font-semibold">回答形式</TableHead>
            <TableHead className="w-16 text-center text-xs font-semibold">必答</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                <Empty variant="empty" title="この店舗で使う設問はありません" />
              </TableCell>
            </TableRow>
          )}
          {rows.map((question) => (
            <TableRow key={question.questionId}>
              <TableCell className="text-muted-foreground align-top text-xs">
                {question.displayOrder}
              </TableCell>
              <TableCell className="align-top text-xs font-medium whitespace-normal">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="wrap-anywhere">{question.text}</span>
                  {question.choices.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {question.choices.map((choice) => (
                        <Badge
                          key={choice.choiceId}
                          variant="outline"
                          className="h-auto max-w-full shrink text-left wrap-anywhere whitespace-normal"
                        >
                          {choice.displayOrder}. {choice.text}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {question.choices.length === 0 && question.format === 'free_text' && (
                    <span className="text-muted-foreground text-[10px]">
                      （自由記述のため選択肢なし）
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <Badge variant="outline">
                  {SURVEY_REAL_QUESTION_FORMAT_LABELS[question.format] ?? question.format}
                </Badge>
              </TableCell>
              <TableCell className="text-center align-top text-xs">
                {question.required ? '○' : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
