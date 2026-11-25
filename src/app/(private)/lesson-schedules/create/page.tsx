'use client';

import { useRef } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Form } from '@/components/ui/form';

import {
  adminLessonScheduleControllerCreateRecurrenceMutation,
  adminLessonScheduleControllerCreateScheduleMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LessonRecurrenceCreateResponseDto,
  ScheduleWarningDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { invalidateLessonScheduleQueries } from '../_utils/lesson-schedule-api.util';
import { LessonScheduleCreateForm } from './_components/lesson-schedule-create-form';
import { useLessonScheduleForm } from './_hooks/use-lesson-schedule-form.hook';
import {
  toCreateRecurrenceBody,
  toCreateScheduleBody,
} from './_schemas/lesson-schedule-form.mapper';
import type { LessonScheduleFormSubmitValues } from './_schemas/lesson-schedule-form.schema';

/** Soft warnings the API returns with a saved schedule (W-LSC-xxx; the FE owns the wording). */
const WARNING_LABEL: Record<ScheduleWarningDto['code'], string> = {
  'W-LSC-010': '担当インストラクターが同じ時間帯の別スケジュールにも割り当てられています',
  'W-LSC-011': '定員がスタジオの物理定員を超えています（バッファの範囲内）',
};

function formatWarnings(warnings: readonly ScheduleWarningDto[]): string | undefined {
  const labels = Array.from(new Set(warnings.map((w) => WARNING_LABEL[w.code] ?? w.code)));
  return labels.length > 0 ? labels.join(' / ') : undefined;
}

/** What a recurrence create reached, for the success toast (the API has no preview). */
function summarizeRecurrence(res: LessonRecurrenceCreateResponseDto): string | undefined {
  const parts: string[] = [];
  if (res.closureDates.length > 0) parts.push(`店舗休業日と重なる日 ${res.closureDates.length}件`);
  if (res.skippedHolidayDates.length > 0) {
    parts.push(`祝日・休業日のためスキップ ${res.skippedHolidayDates.length}件`);
  }
  if (res.warningsByDate.length > 0) {
    parts.push(`インストラクターの重複 ${res.warningsByDate.length}日`);
  }
  const ruleWarnings = formatWarnings(res.warnings);
  if (ruleWarnings) parts.push(ruleWarnings);
  return parts.length > 0 ? parts.join(' / ') : undefined;
}

export default function LessonScheduleCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/lesson-schedules'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useLessonScheduleForm();
  const isSubmittingRef = useRef(false);

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(form.formState.isDirty);

  const handleSaved = () => {
    invalidateLessonScheduleQueries(queryClient);
    navigateAfterSave(() => router.push(navigate('/lesson-schedules')));
  };

  // Errors (E-VAL-001, E-LSC-0xx, E-LSC-100/101) are toasted by the shared MutationCache
  const createScheduleMutation = useMutation({
    ...adminLessonScheduleControllerCreateScheduleMutation(),
    onSuccess: (res) => {
      const warnings = formatWarnings(res.warnings);
      if (warnings) {
        toast.warning('スケジュールを登録しました', { description: warnings });
      } else {
        toast.success('スケジュールを登録しました');
      }
      handleSaved();
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const createRecurrenceMutation = useMutation({
    ...adminLessonScheduleControllerCreateRecurrenceMutation(),
    onSuccess: (res) => {
      toast.success(`${res.generatedCount}回のスケジュールを登録しました`, {
        description: summarizeRecurrence(res),
      });
      handleSaved();
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const onSubmit = (values: LessonScheduleFormSubmitValues) => {
    if (values.schedule_mode === 'recurring') {
      createRecurrenceMutation.mutate({ body: toCreateRecurrenceBody(values) });
    } else {
      createScheduleMutation.mutate({ body: toCreateScheduleBody(values) });
    }
  };

  const onInvalid = () => {
    scrollToFirstError();
  };

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    void form.handleSubmit(onSubmit, () => {
      isSubmittingRef.current = false;
      onInvalid();
    })();
  }

  const handleCancel = () => {
    confirmDiscard(() => router.push(navigate('/lesson-schedules')));
  };

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackLink
            label="予約管理に戻る"
            onClick={() => confirmDiscard(() => router.push(backToListHref))}
          />
        }
        title="スケジュール登録"
      />
      <div className="px-6 py-4">
        <Form {...form}>
          <form noValidate className="mx-auto max-w-[960px]" onSubmit={handleFormSubmit}>
            <LessonScheduleCreateForm
              isSubmitting={createScheduleMutation.isPending || createRecurrenceMutation.isPending}
              hasSubmitError={!form?.formState?.isValid && form?.formState?.isSubmitted}
              onCancel={handleCancel}
            />
          </form>
        </Form>
      </div>
    </>
  );
}
