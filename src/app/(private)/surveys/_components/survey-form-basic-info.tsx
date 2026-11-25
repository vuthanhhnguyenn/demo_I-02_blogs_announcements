'use client';

import { useFormContext } from 'react-hook-form';

import { useQuery } from '@tanstack/react-query';

import { BRAND_ENUM_LABELS, type BrandEnumValue } from '@/components/common/brand-badge';
import { RequiredMark } from '@/components/common/field-marker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { adminQuestionnaireTriggerControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { SURVEY_RESPONSE_CATEGORY_LABELS } from '../_constants/constants';
import {
  SURVEY_BRAND_GROUPS,
  SURVEY_BRAND_GROUP_LABELS,
  type SurveyBrandGroup,
  getSurveyBrandEnumsOfGroup,
  getSurveyBrandGroupOfEnums,
} from '../_constants/survey-brand-group';
import type { SurveyFormValues } from '../_schemas/survey-form.schema';

/** Select value of a stored sub-brand set that is not a whole group (legacy / mixed data). */
const LEGACY_BRAND_VALUE = 'legacy';

/**
 * The Select offers the two brand GROUPS (spec G-04); the form value stays the API's sub-brand list.
 * A stored set that is not exactly one group (legacy `['Joyfit']`, mixed groups) is shown as an extra
 * read-only option labelled with its sub-brands, so the Select never renders blank and nothing is rewritten.
 */
function brandSelectValue(
  current: BrandEnumValue[],
): SurveyBrandGroup | typeof LEGACY_BRAND_VALUE | undefined {
  if (current.length === 0) return undefined;
  return getSurveyBrandGroupOfEnums(current) ?? LEGACY_BRAND_VALUE;
}

function brandSelectLabel(current: BrandEnumValue[]) {
  const group = getSurveyBrandGroupOfEnums(current);
  return group
    ? SURVEY_BRAND_GROUP_LABELS[group]
    : current.map((brand) => BRAND_ENUM_LABELS[brand]).join(' / ');
}

export function SurveyFormBasicInfoSection({ isEdit = false }: Readonly<{ isEdit?: boolean }>) {
  const form = useFormContext<SurveyFormValues>();
  const type = form.watch('type');
  // Phase 1 creates lifecycle surveys only. An edit offers just the survey's own category: the save
  // (PUT) carries no `category`, so a second option would be a change that is never stored.
  const surveyTypes: SurveyFormValues['type'][] = isEdit && type ? [type] : ['lifecycle'];
  const surveyTypeOptions = surveyTypes.map((value) => ({
    value,
    label: SURVEY_RESPONSE_CATEGORY_LABELS[value],
  }));

  const {
    data: triggersData,
    isError: isTriggersError,
    isFetching: isTriggersFetching,
    refetch: refetchTriggers,
  } = useQuery({
    ...adminQuestionnaireTriggerControllerListOptions({ query: { triggerType: type } }),
    enabled: Boolean(type),
  });
  const triggers = triggersData?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    アンケート名
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 入会時アンケート" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brandEnums"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ブランド
                    <RequiredMark />
                  </FormLabel>
                  <Select
                    key={`survey-brand-${field.value.join(',') || 'empty'}`}
                    value={brandSelectValue(field.value)}
                    onValueChange={(value) => {
                      // The legacy option stands for the stored set itself: picking it changes nothing.
                      if (!value || value === LEGACY_BRAND_VALUE) return;
                      field.onChange(getSurveyBrandEnumsOfGroup(value as SurveyBrandGroup));
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ブランドを選択">
                          {field.value.length > 0 ? brandSelectLabel(field.value) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SURVEY_BRAND_GROUPS.map((group) => (
                        <SelectItem key={group} value={group}>
                          {SURVEY_BRAND_GROUP_LABELS[group]}
                        </SelectItem>
                      ))}
                      {brandSelectValue(field.value) === LEGACY_BRAND_VALUE && (
                        <SelectItem value={LEGACY_BRAND_VALUE}>
                          {brandSelectLabel(field.value)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  種別
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex items-center gap-6"
                  >
                    {surveyTypeOptions.map(({ value, label }) => (
                      <div key={value} className="flex items-center gap-2">
                        <RadioGroupItem value={value} id={`survey-type-${value}`} />
                        <FormLabel
                          htmlFor={`survey-type-${value}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {label}
                        </FormLabel>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="trigger"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  発動トリガー
                  <RequiredMark />
                </FormLabel>
                <Select
                  key={`survey-trigger-${field.value || 'empty'}-${triggers.length}`}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="発動トリガーを選択">
                        {field.value
                          ? (triggers.find((trigger) => trigger.code === field.value)?.name ??
                            field.value)
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {triggers.map((trigger) => (
                      <SelectItem key={trigger.code} value={trigger.code}>
                        {trigger.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isTriggersError && (
                  <div className="text-destructive flex items-center gap-2 text-xs">
                    <span>発動トリガーの取得に失敗しました</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={isTriggersFetching}
                      onClick={() => void refetchTriggers()}
                    >
                      再試行
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
