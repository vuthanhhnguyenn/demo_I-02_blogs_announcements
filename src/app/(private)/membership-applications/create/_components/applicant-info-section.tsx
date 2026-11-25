'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { useState } from 'react';
import { type Control, useFormContext, useWatch } from 'react-hook-form';

import { PREFECTURES } from '@/constants/app.constants';
import { calcAge, isBelowMinAge } from '@/utils/age.util';
import { toSelectItems } from '@/utils/app.util';
import { format, startOfDay, subDays } from 'date-fns';
import { AlertTriangle, CheckCircle } from 'lucide-react';

import { DateTimePicker } from '@/components/common/date-time-picker';
import { OptionalMark } from '@/components/common/field-marker';
import { ImageUpload } from '@/components/common/image-upload';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

import { BRAND_MIN_AGE } from '../../_constants/constants';
import { useMemberPhotoUpload } from '../_hooks/use-member-photo-upload';
import {
  type DirectEnrollmentFormValues,
  isPastBirthDate,
} from '../_schemas/enrollment-form.schema';

interface ApplicantInfoSectionProps {
  readonly control: Control<DirectEnrollmentFormValues>;
  readonly onUploadingChange?: (uploading: boolean) => void;
  readonly isPrefilled: boolean;
  /** Called with the new gender value and its label (the campaign list follows the gender). */
  readonly onGenderChange?: (gender: string, label: string) => void;
}

const PREFECTURE_OPTIONS = PREFECTURES.map((pref) => ({ value: pref, label: pref }));

const GENDER_OPTIONS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'no_answer', label: '回答しない' },
];

export function ApplicantInfoSection({
  control,
  onUploadingChange,
  isPrefilled,
  onGenderChange,
}: ApplicantInfoSectionProps) {
  const brand = useWatch({ control, name: 'contract.brand_id' });
  const uploadMemberPhoto = useMemberPhotoUpload();
  // The form keeps the S3 key the API expects; the preview is a local object URL.
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const { setError, clearErrors } = useFormContext<DirectEnrollmentFormValues>();
  const birthDate = useWatch({ control, name: 'applicant.birth_date' });

  // No age verdict on today / a future date — the field shows its own error (BUG-D-06).
  const age = birthDate && isPastBirthDate(birthDate) ? calcAge(birthDate) : null;
  const minAge = brand ? BRAND_MIN_AGE[brand] : null;
  const belowMin = age !== null && brand ? isBelowMinAge(age, brand) : false;
  const isMinor = age !== null && !belowMin && age < 18;

  return (
    <Card>
      <CardHeader>
        <CardTitle>申請者情報</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPrefilled && (
          <Alert className="border-info/50 bg-info/15 py-2">
            <CheckCircle className="text-info size-4" />
            <AlertDescription className="text-info text-xs">
              見学・体験の登録情報から氏名等をプリセットしました。内容をご確認ください。
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="applicant.family_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  氏名（姓）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例: 山田" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="applicant.given_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  氏名（名）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例: 太郎" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="applicant.family_name_kana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  フリガナ（姓）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例: ヤマダ" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="applicant.given_name_kana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  フリガナ（名）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例: タロウ" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="applicant.birth_date"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  生年月日<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value ? new Date(field.value) : undefined}
                    placeholder="日付を選択"
                    hasError={!!fieldState.error}
                    disabledDate={{ after: subDays(startOfDay(new Date()), 1) }}
                    onDateChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                    // 生年月日 is past-only — keep the year dropdown ending at this year.
                    endMonth={new Date()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="applicant.gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  性別<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v ?? undefined);
                    if (v)
                      onGenderChange?.(v, GENDER_OPTIONS.find((o) => o.value === v)?.label ?? v);
                  }}
                  value={field.value ?? ''}
                  items={toSelectItems(GENDER_OPTIONS)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {age !== null && minAge !== null && (
          <div className="flex flex-col gap-3">
            {belowMin && (
              <Alert className="border-destructive/50 bg-destructive/15 py-2">
                <AlertTriangle className="text-destructive size-4" />
                <AlertDescription className="text-destructive text-xs">
                  年齢条件不適合: {age}歳。{brand}は{minAge}
                  歳以上が入会可能です。申請を受け付けられません。
                </AlertDescription>
              </Alert>
            )}
            {!belowMin && isMinor && (
              <>
                <Alert className="border-warning/50 bg-warning/15 py-2">
                  <AlertTriangle className="text-warning size-4" />
                  <AlertDescription className="text-warning text-xs">
                    未成年（{age}歳）— 保護者同意の確認が必要です。
                  </AlertDescription>
                </Alert>
                <FormField
                  control={control}
                  name="consent.parental_consent"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                          className="mt-0.5"
                        />
                        <span className="leading-snug">
                          申込者が保護者の同意を得た上で申し込む旨を確認しました
                          <span className="text-destructive ml-0.5">*</span>
                        </span>
                      </label>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Minors only: guardian name + consent time, recorded with the check (prototype 9/8) */}
                <div className="grid grid-cols-2 items-start gap-4">
                  <FormField
                    control={control}
                    name="consent.guardian_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          保護者氏名<span className="text-destructive ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="例: 山田 花子" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="consent.guardian_consent_at"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          同意日時<span className="text-destructive ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                            placeholder="日時を選択"
                            hasError={!!fieldState.error}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            {!belowMin && !isMinor && (
              <Alert className="border-success/50 bg-success/15 py-2">
                <CheckCircle className="text-success size-4" />
                <AlertDescription className="text-success text-xs">
                  年齢条件: 成人（{age}歳 / {brand}: {minAge}歳以上）
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        {age !== null && !brand && (
          <p className="text-muted-foreground text-xs">ブランドを選択すると年齢条件を判定します</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="applicant.phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  電話番号<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} type="tel" placeholder="例: 090-1234-5678" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="applicant.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  メールアドレス<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="例: yamada@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 住所: 郵便番号 / 都道府県 / 市町村・番地 / 建物名 — the member-form split (prototype 9/17) */}
        <FormField
          control={control}
          name="applicant.address.postal_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                郵便番号<span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 150-0001" className="w-[200px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="applicant.address.prefecture"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  都道府県<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v ?? '')}
                  value={field.value ?? ''}
                  items={toSelectItems(PREFECTURE_OPTIONS)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  {/* 47 items: open below the trigger and scroll inside the viewport (BUG-D-14). */}
                  <SelectContent alignItemWithTrigger={false} className="max-h-72">
                    {PREFECTURE_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
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
          control={control}
          name="applicant.address.street_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                市町村・番地<span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 渋谷区神宮前1-1-1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="applicant.address.building"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                建物名
                <OptionalMark />
              </FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="例: 神宮前ビル 3F" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="applicant.face_photo_id"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                顔写真<span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value ? photoPreviewUrl : null}
                  upload={async (file) => {
                    const uploaded = await uploadMemberPhoto(file);
                    if (!uploaded.ok) {
                      // A refused file is a field error, not a toast; the previous photo stays.
                      if (uploaded.reason === 'invalid') {
                        setError('applicant.face_photo_id', { message: uploaded.message });
                      }
                      return null;
                    }
                    clearErrors('applicant.face_photo_id');
                    field.onChange(uploaded.s3Key);
                    setPhotoFileName(file.name);
                    return uploaded.previewUrl;
                  }}
                  onChange={(url) => {
                    setPhotoPreviewUrl(url);
                    if (!url) {
                      field.onChange('');
                      setPhotoFileName(null);
                    }
                  }}
                  onUploadingChange={onUploadingChange}
                  hint="BL照合精度向上・入退館顔認証に使用されます"
                  hasError={!!fieldState.error}
                />
              </FormControl>
              {field.value && photoFileName && (
                <TextWithTooltip text={photoFileName} className="text-muted-foreground text-xs" />
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
