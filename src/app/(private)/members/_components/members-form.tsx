'use client';

// 'use client': react-hook-form context + Radix Select require browser events.
import { useFormContext } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';
import { formatISODateLocal, parseDate } from '@/utils/date.util';
import { formatPhone } from '@/utils/phone.util';

import { OptionalMark, RequiredMark } from '@/components/common/field-marker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  BUILDING_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  GENDER_OPTIONS,
  type MemberFormValues,
  NAME_MAX_LENGTH,
  PREFECTURE_OPTIONS,
  STREET_ADDRESS_MAX_LENGTH,
} from '../_schemas/member-form.schema';
import { formatPostalCode } from '../_utils';

const genderSelectItems = toSelectItems([...GENDER_OPTIONS]);
// The select holds JIS codes, so the trigger needs the code → name map to render a label.
const prefectureSelectItems = toSelectItems([...PREFECTURE_OPTIONS]);

export function MembersForm() {
  const form = useFormContext<MemberFormValues>();

  return (
    <Card>
      <CardHeader className="px-4">
        <CardTitle className="text-base font-semibold">個人情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    氏名（姓）
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 山田" maxLength={NAME_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    氏名（名）
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 太郎" maxLength={NAME_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="last_name_kana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    フリガナ（姓）
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: ヤマダ" maxLength={NAME_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="first_name_kana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    フリガナ（名）
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: タロウ" maxLength={NAME_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    生年月日
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      date={parseDate(field.value) ?? undefined}
                      placeholder="日付を選択"
                      hasError={Boolean(form.formState.errors.birthday)}
                      // 生年月日 is past-only — keep the year dropdown ending at this year.
                      endMonth={new Date()}
                      onDateChange={(date) => field.onChange(date ? formatISODateLocal(date) : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    性別
                    <RequiredMark />
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={genderSelectItems}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 住所 is four controls (client decision 2026-08-21): 郵便番号 on its own row, then the
              都道府県 select carrying the JIS code the endpoint stores, 市町村・番地 and 建物名 the
              free-text remainder. */}
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  郵便番号
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  {/*
                    The operator types digits only; the hyphen is rendered by the field. No
                    `maxLength`: it counts the raw text before `formatPostalCode` strips 〒 /
                    spaces / hyphens, so a paste like `〒150-0001` would lose its last digit. An
                    over-long code is flagged by the schema instead.
                  */}
                  <Input
                    placeholder="例: 150-0001"
                    className="w-50"
                    inputMode="numeric"
                    {...field}
                    onChange={(event) => field.onChange(formatPostalCode(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="prefecture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    都道府県
                    <RequiredMark />
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={prefectureSelectItems}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PREFECTURE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="street_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  市町村・番地
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: 渋谷区神宮前1-1-1"
                    maxLength={STREET_ADDRESS_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="building"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  建物名
                  <OptionalMark />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: 神宮前ビル 3F"
                    maxLength={BUILDING_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    電話番号
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    {/*
                      The operator types digits only; the hyphens are rendered by the field. No
                      `maxLength`: it counts the raw text before `formatPhone` strips spaces /
                      brackets / hyphens, so a paste like `+1 (202) 555-0123` would lose its last
                      digit. An over-long number is flagged by the schema instead.
                    */}
                    <Input
                      placeholder="例: 090-1234-5678"
                      inputMode="tel"
                      {...field}
                      onChange={(event) => field.onChange(formatPhone(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    メールアドレス
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="例: yamada@example.com"
                      maxLength={EMAIL_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
