'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { Card, CardContent } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { LessonFormValues } from '../../_schemas/lesson-form.schema';
import {
  LESSON_BRAND_LABELS,
  LESSON_BRAND_OPTIONS,
  LESSON_DURATION_OPTIONS,
} from '../../_utils/lesson-api.util';

function RequiredMark() {
  return <span className="text-destructive ml-0.5">*</span>;
}

const LESSON_TYPE_LABELS: Record<string, string> = {
  studio: 'スタジオレッスン',
  personal: 'パーソナルトレーニング',
  bodycare: 'ボディケア',
};

const PRICING_TYPE_LABELS: Record<string, string> = {
  free: '無料',
  monthly: '有料（月払）',
  per_use: '有料（都度）',
};

/** Personal training is sold in 30 / 60 minute sessions; the API accepts LESSON_DURATION_OPTIONS */
const DURATION_OPTIONS: Record<string, readonly number[]> = {
  personal: [30, 60],
  studio: LESSON_DURATION_OPTIONS,
  bodycare: LESSON_DURATION_OPTIONS,
};

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
        {number}
      </div>
      <h3 className="text-sm font-bold">{title}</h3>
    </div>
  );
}

interface LessonFormBasicInfoProps {
  /** 編集: the brand of a stored lesson cannot change (API-111 §6.3) */
  isEdit?: boolean;
}

export function LessonFormBasicInfo({ isEdit = false }: LessonFormBasicInfoProps) {
  const form = useFormContext<LessonFormValues>();
  const lessonType = useWatch({ control: form.control, name: 'lessonType' });
  const pricingType = useWatch({ control: form.control, name: 'pricingType' });
  // No レッスン区分 yet (新規作成) → every duration the API accepts
  const durations = lessonType ? DURATION_OPTIONS[lessonType] : LESSON_DURATION_OPTIONS;

  return (
    <Card>
      <CardContent className="px-6">
        <SectionHeader number={1} title="基本情報" />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>
                  レッスン名
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder="レッスン名を入力" className="h-8" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lessonType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  レッスン区分
                  <RequiredMark />
                </FormLabel>
                <Select value={field.value ?? null} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="選択してください">
                        {field.value ? LESSON_TYPE_LABELS[field.value] : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="studio">スタジオレッスン</SelectItem>
                    <SelectItem value="personal">パーソナルトレーニング</SelectItem>
                    <SelectItem value="bodycare">ボディケア</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  ブランド
                  <RequiredMark />
                </FormLabel>
                <Select
                  value={field.value ?? null}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Restrictions are plans / options of the brand — a new brand starts over
                    form.setValue('restrictedMainContracts', []);
                    form.setValue('restrictedOptionContracts', []);
                  }}
                  disabled={isEdit}
                >
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="選択してください">
                        {field.value ? LESSON_BRAND_LABELS[field.value] : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LESSON_BRAND_OPTIONS.map((brand) => (
                      <SelectItem key={brand.value} value={brand.value}>
                        {brand.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  所要時間
                  <RequiredMark />
                </FormLabel>
                <Select
                  value={field.value ? String(field.value) : null}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="選択してください">
                        {field.value ? `${field.value}分` : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pricingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  料金種別
                  <RequiredMark />
                </FormLabel>
                <Select
                  value={field.value ?? null}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== 'per_use') {
                      form.setValue('perUseFee', null);
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="選択してください">
                        {field.value ? PRICING_TYPE_LABELS[field.value] : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="free">無料</SelectItem>
                    <SelectItem value="monthly">有料（月払）</SelectItem>
                    <SelectItem value="per_use">有料（都度）</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          {pricingType === 'per_use' && (
            <FormField
              control={form.control}
              name="perUseFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    都度利用料金（税込）
                    <RequiredMark />
                  </FormLabel>
                  {/* FormControl sits on the Input itself so aria-invalid (the red outline) lands on it */}
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        className="h-8"
                        type="number"
                        placeholder="金額を入力"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <span className="text-muted-foreground shrink-0 text-xs">円</span>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
