import type {
  AdminLessonControllerListData,
  CreateLessonRecurrenceRequestDto,
  CreateLessonScheduleRequestDto,
  CreateLessonScheduleTemplateRequestDto,
} from '@/lib/api-real/types.gen';

import type {
  LessonScheduleFormSubmitValues,
  LessonScheduleFormValues,
} from './lesson-schedule-form.schema';

type ApiLessonType = NonNullable<NonNullable<AdminLessonControllerListData['query']>['lessonType']>;

/** The form's two kinds → the lesson master's `lessonType` (パーソナル = personal training). */
export function toApiLessonType(
  lessonType: LessonScheduleFormValues['lesson_type'],
): ApiLessonType {
  return lessonType === 'personal' ? 'personal_training' : 'studio';
}

const END_TYPE_BY_CONDITION = {
  by_date: 'until_date',
  by_count: 'count',
  indefinite: 'unlimited',
} as const satisfies Record<
  NonNullable<LessonScheduleFormValues['end_condition']>,
  CreateLessonRecurrenceRequestDto['endType']
>;

/**
 * Fields both create bodies share. Trial seats are a studio-lesson feature (E-VAL-001 otherwise);
 * the form's 外数 is the API's `additive`.
 *
 * TODO(round2) B8: コース種別 (30分 / 60分 / 体験) has no API field — the length comes from the
 * lesson master (`durationMinutes`), so `course_type` is not sent.
 */
function sharedBody(values: LessonScheduleFormSubmitValues) {
  const isStudio = values.lesson_type === 'studio';
  const withTrial = isStudio && values.trial_enabled;
  return {
    lessonId: values.lesson_id,
    storeId: values.store_id,
    studioId: isStudio ? values.studio_id : null,
    trainerIds: values.instructor_ids,
    isPublished: values.is_published,
    // Omitted = the studio capacity (one-to-one lessons: 1)
    capacity: isStudio ? values.capacity : undefined,
    // Omitted = no trial seats
    trialCapacityMode: withTrial
      ? values.trial_mode === 'additional'
        ? ('additive' as const)
        : ('inclusive' as const)
      : undefined,
    trialCapacityLimit: withTrial ? values.trial_capacity : undefined,
  };
}

/** 単発 → `POST /admin/lesson-schedules` */
export function toCreateScheduleBody(
  values: LessonScheduleFormSubmitValues,
): CreateLessonScheduleRequestDto {
  return {
    ...sharedBody(values),
    scheduledDate: values.date,
    startTime: values.start_time,
  };
}

/** 繰り返し → `POST /admin/lesson-schedule-recurrences` (direct form, no template) */
export function toCreateRecurrenceBody(
  values: LessonScheduleFormSubmitValues,
): CreateLessonRecurrenceRequestDto {
  const endCondition = values.end_condition ?? 'indefinite';
  const repeatType = values.repeat_type ?? 'weekly';
  return {
    ...sharedBody(values),
    startDate: values.start_date,
    startTime: values.start_time,
    recurrenceType: repeatType,
    // 毎月 repeats on the start date's day of month; the API still wants its weekday
    daysOfWeek:
      repeatType === 'monthly'
        ? [new Date(`${values.start_date}T00:00:00`).getDay()]
        : values.days_of_week,
    endType: END_TYPE_BY_CONDITION[endCondition],
    endDate: endCondition === 'by_date' ? values.end_date : null,
    maxOccurrences: endCondition === 'by_count' ? (values.end_count ?? null) : null,
    skipHolidays: values.skip_holidays,
  };
}

/**
 * 繰り返しパターンを保存 → `POST /admin/lesson-schedule-templates`.
 *
 * TODO(round2) B9: a template holds store / lesson / studio / cadence / days / start time /
 * holiday skip (API-112 v0.10, backend MR !654). The prototype also saves the 終了条件 (FR-013),
 * which the API cannot store yet — it is neither saved nor restored on 読込.
 */
export function toCreateTemplateBody(
  name: string,
  values: LessonScheduleFormValues,
): CreateLessonScheduleTemplateRequestDto {
  return {
    name,
    storeId: values.store_id,
    ...toTemplateSettings(values),
  };
}

/**
 * What a template stores besides its name and store — shared by create and 上書き保存 (PATCH).
 * The studio goes with a studio lesson only; a personal-training template takes none (E-VAL-001).
 */
export function toTemplateSettings(values: LessonScheduleFormValues) {
  const recurrenceType = values.repeat_type ?? 'weekly';
  return {
    lessonId: values.lesson_id,
    studioId: values.lesson_type === 'studio' ? values.studio_id || null : null,
    recurrenceType,
    daysOfWeek: templateDaysOfWeek(values),
    startTime: values.start_time,
    skipHolidays: values.skip_holidays ?? false,
  };
}

/**
 * The days a template stores (non-empty). 毎月 has no day picker in the form — it repeats on the
 * start date's weekday, so that weekday is saved; empty when there is no start date yet.
 */
export function templateDaysOfWeek(
  values: Pick<LessonScheduleFormValues, 'repeat_type' | 'days_of_week' | 'start_date'>,
): number[] {
  if ((values.repeat_type ?? 'weekly') === 'monthly') {
    return values.start_date ? [new Date(`${values.start_date}T00:00:00`).getDay()] : [];
  }
  return values.days_of_week ?? [];
}
