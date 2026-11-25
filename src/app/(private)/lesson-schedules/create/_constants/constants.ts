import { PAGE_SIZE } from '@/constants/app.constants';

export const LESSON_TYPE_LABELS: Record<string, string> = {
  studio: 'スタジオレッスン',
  personal: 'パーソナルトレーニング',
};

export const SCHEDULE_MODE_LABELS: Record<string, string> = {
  single: '単発',
  recurring: '繰り返し',
};

export const REPEAT_TYPE_LABELS: Record<string, string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '毎月',
};

export const END_CONDITION_LABELS: Record<string, string> = {
  by_date: '指定日まで',
  by_count: '回数指定',
  indefinite: '無期限',
};

export const COURSE_TYPE_LABELS: Record<string, string> = {
  '30min': '30分',
  '60min': '60分',
  trial: '体験',
};

export const COURSE_TYPE_OPTIONS = (['30min', '60min', 'trial'] as const).map((value) => ({
  value,
  label: COURSE_TYPE_LABELS[value],
}));

export const REPEAT_TYPE_OPTIONS = (['weekly', 'biweekly', 'monthly'] as const).map((value) => ({
  value,
  label: REPEAT_TYPE_LABELS[value],
}));

export const TRIAL_MODE_LABELS: Record<string, string> = {
  inclusive: '内数',
  additional: '外数',
};

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: '日',
  1: '月',
  2: '火',
  3: '水',
  4: '木',
  5: '金',
  6: '土',
};

export const DAY_OF_WEEK_FULL_LABELS: Record<number, string> = {
  0: '日曜日',
  1: '月曜日',
  2: '火曜日',
  3: '水曜日',
  4: '木曜日',
  5: '金曜日',
  6: '土曜日',
};

export const MAX_TRIAL_CAPACITY = 5;
export const MIN_TRIAL_CAPACITY = 1;
export const MAX_END_COUNT = 100;

export const TRIAL_CAPACITY_OPTIONS = Array.from(
  { length: MAX_TRIAL_CAPACITY - MIN_TRIAL_CAPACITY + 1 },
  (_, i) => {
    const n = i + MIN_TRIAL_CAPACITY;
    return { value: String(n), label: `${n}名` };
  },
);

export const STEP_LABELS = ['日時・スタジオ', 'レッスン', 'インストラクター', '定員', '公開設定'];

/**
 * The lesson picker searches on the server and reads the next page as it scrolls — the lesson
 * master grows with the company, so it is not read whole.
 */
export const PICKER_PAGE_SIZE = PAGE_SIZE;
/**
 * The instructor picker reads `GET /admin/trainers/lookup` (API-109 #10): no paging, at most this
 * many rows in name order (the API's ceiling), so a longer list is narrowed by typing.
 */
export const TRAINER_LOOKUP_LIMIT = 100;
/** Wait after the last keystroke before a picker's search is sent */
export const PICKER_SEARCH_DEBOUNCE_MS = 300;
