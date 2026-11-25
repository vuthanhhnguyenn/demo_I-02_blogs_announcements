'use client';

import { useEffect, useRef } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  adminQuestionnaireControllerChoiceVisibilityMutation,
  adminQuestionnaireControllerDetailQueryKey,
  adminQuestionnaireControllerQuestionVisibilityMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminQuestionnaireQuestionDto,
  QuestionnaireDetailDto,
  VisibilityDto,
} from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { SURVEY_REAL_QUESTION_FORMAT_LABELS } from '../_constants/constants';

// 選択式で選択肢 0 件は会員が回答できないため、最後の1件は OFF にできない
const LAST_CHOICE_REASON =
  '回答選択肢は1件以上必要です。設問ごと使わない場合は設問のスイッチを切ってください。';

function hasChoices(question: AdminQuestionnaireQuestionDto) {
  return question.format !== 'free_text';
}

interface SurveyStoreVisibilityEditorProps {
  survey: QuestionnaireDetailDto;
  storeId: string;
  storeName: string;
}

export function SurveyStoreVisibilityEditor({
  survey,
  storeId,
  storeName,
}: Readonly<SurveyStoreVisibilityEditorProps>) {
  const queryClient = useQueryClient();
  // Same-tick clicks both reach the handler before `isSaving` disables the switches.
  const runSave = useInFlightGuard();
  // The header store can change while a save is in flight; its success toast must not show on the other
  // store's view (the save itself still lands on the store it was sent for).
  const currentStoreRef = useRef(storeId);
  useEffect(() => {
    currentStoreRef.current = storeId;
  }, [storeId]);
  const mutationHandlers = {
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: adminQuestionnaireControllerDetailQueryKey({
          path: { id: survey.questionnaireId },
        }),
      });
    },
  };
  const questionMutation = useMutation({
    ...adminQuestionnaireControllerQuestionVisibilityMutation(),
    ...mutationHandlers,
  });
  const choiceMutation = useMutation({
    ...adminQuestionnaireControllerChoiceVisibilityMutation(),
    ...mutationHandlers,
  });
  const isSaving = questionMutation.isPending || choiceMutation.isPending;

  const questions = [...survey.questions].sort((a, b) => a.displayOrder - b.displayOrder);
  const isQuestionVisible = (question: AdminQuestionnaireQuestionDto) =>
    !question.hiddenStoreIds.includes(storeId);
  const isChoiceVisible = (choice: AdminQuestionnaireQuestionDto['choices'][number]) =>
    !choice.hiddenStoreIds.includes(storeId);

  // 即時保存: トグルを切り替えた瞬間に保存扱い（保存ボタンなし）。1 トグル = この店舗だけを hide / show する 1 リクエスト
  const visibilityBody = (visible: boolean): VisibilityDto =>
    visible ? { showStoreIds: [storeId] } : { hideStoreIds: [storeId] };

  // `storeId` here is the one the request was sent for (closure of this render).
  const notifySaved = (message: string) => {
    if (storeId === currentStoreRef.current) toast.success(message);
  };

  const handleQuestionToggle = (
    question: AdminQuestionnaireQuestionDto,
    no: number,
    checked: boolean,
  ) =>
    void runSave(() =>
      questionMutation
        .mutateAsync({
          path: { id: survey.questionnaireId, questionId: question.questionId },
          body: visibilityBody(checked),
        })
        .then(() =>
          notifySaved(`Q${no} をこの店舗で${checked ? '使う' : '使わない'}設定にしました`),
        )
        .catch(() => undefined),
    );

  const handleChoiceToggle = (
    question: AdminQuestionnaireQuestionDto,
    no: number,
    choice: AdminQuestionnaireQuestionDto['choices'][number],
    checked: boolean,
  ) =>
    void runSave(() =>
      choiceMutation
        .mutateAsync({
          path: {
            id: survey.questionnaireId,
            questionId: question.questionId,
            choiceId: choice.choiceId,
          },
          body: visibilityBody(checked),
        })
        .then(() =>
          notifySaved(
            `Q${no} の選択肢「${choice.text}」を${checked ? '使う' : '使わない'}設定にしました`,
          ),
        )
        .catch(() => undefined),
    );

  const questionOnCount = questions.filter(isQuestionVisible).length;

  return (
    <>
      <div className="border-info/20 bg-info/15 rounded-md border px-4 py-3">
        <p className="text-muted-foreground text-[11px] leading-relaxed wrap-anywhere">
          本部が作成した設問のうち、この店舗の{survey.name}
          で使う設問と回答選択肢を選びます。初期状態はすべて「使う」です。設問・選択肢の追加や内容の変更はできません（本部がアンケート詳細の「編集」で行います）。
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="min-w-0 text-base font-semibold wrap-anywhere">
              この店舗で使う設問（{storeName}）
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-card text-muted-foreground border-border tabular-nums"
            >
              {questionOnCount}/{questions.length}問を使用
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-muted-foreground mb-3 text-xs">
            対象店舗はヘッダーの店舗選択に連動します。切り替えた内容はその場で保存されます。
          </p>
          <div className="flex flex-col">
            {questions.map((question, index) => {
              const no = index + 1;
              const isQVisible = isQuestionVisible(question);
              const choices = [...question.choices].sort((a, b) => a.displayOrder - b.displayOrder);
              const showChoices = hasChoices(question) && choices.length > 0;
              const choiceOnCount = choices.filter(isChoiceVisible).length;

              return (
                <div
                  key={question.questionId}
                  className="-mx-4 border-b px-4 first:border-t last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2 py-3">
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-2',
                        !isQVisible && 'text-muted-foreground',
                      )}
                    >
                      <span className="text-muted-foreground w-6 shrink-0 text-xs">Q{no}</span>
                      <span className="min-w-0 text-sm wrap-anywhere">{question.text}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0',
                          !isQVisible && 'bg-card text-muted-foreground border-border',
                        )}
                      >
                        {SURVEY_REAL_QUESTION_FORMAT_LABELS[question.format] ?? question.format}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={isQVisible}
                        disabled={isSaving}
                        onCheckedChange={(checked) => handleQuestionToggle(question, no, checked)}
                        aria-label={`${question.text}をこの店舗で使う`}
                      />
                    </div>
                  </div>

                  {showChoices && isQVisible && (
                    <div className="bg-muted/30 mb-3 ml-8 rounded-md border px-4 py-3">
                      <div className="flex items-center gap-2 pb-2">
                        <span className="text-muted-foreground text-xs font-semibold">
                          回答選択肢
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-card text-muted-foreground border-border tabular-nums"
                        >
                          {choiceOnCount}/{choices.length}件を使用
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {choices.map((choice) => {
                          const isVisible = isChoiceVisible(choice);
                          // ON が残り1件のとき、その Switch は OFF にできない
                          const isLastOn = isVisible && choiceOnCount === 1;

                          return (
                            <div
                              key={choice.choiceId}
                              className="flex min-h-9 items-center justify-between gap-2 py-1.5"
                            >
                              <span
                                className={cn(
                                  'min-w-0 flex-1 text-xs wrap-anywhere',
                                  !isVisible && 'text-muted-foreground',
                                )}
                              >
                                {choice.text}
                              </span>
                              <div className="flex shrink-0 items-center gap-2">
                                {isLastOn ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={<span className="inline-flex" tabIndex={0} />}
                                      >
                                        <Switch
                                          checked
                                          disabled
                                          aria-disabled="true"
                                          aria-label={`${choice.text}をこの店舗で使う`}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-80">
                                        <p className="text-xs">{LAST_CHOICE_REASON}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <Switch
                                    checked={isVisible}
                                    disabled={isSaving}
                                    onCheckedChange={(checked) =>
                                      handleChoiceToggle(question, no, choice, checked)
                                    }
                                    aria-label={`${choice.text}をこの店舗で使う`}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {showChoices && !isQVisible && (
                    <p className="text-muted-foreground ml-8 pb-3 text-xs">
                      この設問を使わないため、回答選択肢の設定は使われません（設定内容は保持されます）。
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
