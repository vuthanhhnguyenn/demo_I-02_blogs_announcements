'use client';

import { type ReactNode, useCallback, useState } from 'react';
import { type UseFormReturn, useFormContext, useWatch } from 'react-hook-form';

import { formatISODateLocal } from '@/utils/date.util';
import { AlertTriangle, ChevronsUpDown } from 'lucide-react';

// TODO(round3) B1 — re-add the テリトリー field as an エリア → テリトリー cascade
// (`AreaSelectInput` / `TerritorySelectInput`, prototype `47423ec`), not `TerritoryCombobox`
import { FcCompanySelectInput, useFcCompanyLabel } from '@/components/common/data-select-input';
import { OptionalMark, RequiredMark } from '@/components/common/field-marker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  STORE_BRAND_LABELS,
  STORE_FAX_EXAMPLE,
  STORE_GENDER_RESTRICTION_LABELS,
  STORE_PHONE_EXAMPLE,
  STORE_RECEPTION_DESCRIPTIONS,
} from '../_constants/constants';
import { PREFECTURE_BY_CODE, PREFECTURE_OPTIONS } from '../_constants/store-prefecture.constant';
import {
  BRAND_GROUPS,
  BUSINESS_HOUR_DAYS,
  BUSINESS_HOUR_DAY_LABELS,
  DIRECT_MANAGEMENT_VALUE,
  GENDER_RESTRICTION_OPTIONS,
  HOLIDAY_MODES,
  HOLIDAY_MODE_LABELS,
  HOLIDAY_ROW_INDEX,
  type HolidayMode,
  JOYFIT_SUB_BRANDS,
  REVERSED_HOURS_MESSAGE,
  type StoreFormValues,
} from '../_schemas/store-form.schema';
import { StoreFormPhotos, type StoreFormPhotosProps } from './store-form-photos';

/** Y-02 permission matrix L205 — the reason a head-office-only field is not editable */
export const STAFF_LOCKED_TOOLTIP = 'この項目の変更には本部権限が必要です';

/**
 * Decision D2 — `brandEnum` is editable only while the store is `preparing`; any other status
 * makes the backend refuse the write with 422 `E-STR-006`. The two brand selects therefore lock
 * outside that status on the edit screen and say why. The prototype's copy (`store-form.tsx`
 * L167, `a7d0c88`) always names 営業中; FR-015a locks 休業中 and 閉店 too, so the status named is
 * the store's own (BUG-U2-07).
 */
export const brandLockedTooltip = (statusLabel = '営業中') =>
  `${statusLabel}の店舗ではブランドを変更できません（開業準備中のみ変更可）`;

/** FR-061b / FR-061c — the store code is a foreign key elsewhere (prototype L311, L582) */
export const STORE_CODE_CHANGE_WARNING =
  '店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。';

export interface StoreFormProps {
  /** Which screen is rendering the body — only the store-code helper line differs (FR-012) */
  mode: 'create' | 'edit';
  /**
   * True while a Staff user without head-office rights is editing: the whole form renders, but
   * only the store name, address and phone number accept input (Y-02 permission matrix L205,
   * spec 028 FR-083/FR-084).
   */
  restricted: boolean;
  /**
   * True when the brand may no longer be changed — the edit screen passes
   * `status !== 'preparing'` (decision D2). The create screen never sets it: a new store is born
   * `preparing`.
   */
  brandLocked?: boolean;
  /** The store's status label (営業中 / 休業中 / 閉店), named by the brand-lock tooltip */
  brandLockedStatusLabel?: string;
  /**
   * Edit mode — the store code as loaded. While the typed code differs from it, the change
   * warning renders under the input (FR-061c).
   */
  loadedClubCode?: string;
  /** Edit mode — the state of the store's photo-list read, shown inside the 店舗写真 card */
  photos?: StoreFormPhotosProps;
}

/**
 * Wraps a disabled control so hovering states why it cannot be edited. Mirrors the prototype's
 * `FormField lockedTooltip` (`store-form.tsx` L71-81).
 */
function Locked({
  locked,
  reason = STAFF_LOCKED_TOOLTIP,
  children,
}: {
  locked: boolean;
  /** Why this control is inert; defaults to the head-office-only rule */
  reason?: string;
  children: ReactNode;
}) {
  // The trigger has to stay full width so the controls it wraps keep their own width, but the
  // control inside is often narrower than the row. Positioning against the wrapper would centre
  // the tooltip on the row and push its arrow into the popup corner, so the control itself — the
  // wrapper's only element child — is used as the anchor.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const captureAnchor = useCallback((node: HTMLSpanElement | null) => {
    setAnchor((node?.firstElementChild as HTMLElement | null) ?? null);
  }, []);

  if (!locked) return children;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span ref={captureAnchor} className="inline-flex w-full" />}>
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" anchor={anchor}>
          <p className="text-xs">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Y-02 L106: the code is a foreign key elsewhere, so changing it is a warning, not a refusal */
const STORE_CODE_HELP = {
  create:
    '業務用コード。ロッカー・機器・商材など他機能から参照されるため、登録後の変更は影響範囲に注意',
  edit: '業務用コード。ロッカー・機器・商材など他機能から参照されているため、変更すると影響範囲が大きくなります',
} as const;

/**
 * Y-02 FR-002 store basic info — the body shared by the create and edit screens.
 *
 * Field set, order, labels, helper text and placeholders follow the prototype
 * (`dx-fitness/fitness-crm-ui` → `src/pages/store-form.tsx` @ `6bc1f1c`), including its 任意
 * markers and its store-code helper line: the input stays editable in edit mode for System /
 * Headquarter, as Y-02 L106「登録後の変更は影響範囲が大きいため注意」, the screen's preconditions
 * and `UpdateStoreDto` all allow (`specs/028-store-form/spec.md` FR-012, FR-061a).
 */
export function StoreForm({
  mode,
  restricted,
  brandLocked = false,
  brandLockedStatusLabel,
  loadedClubCode,
  photos,
}: Readonly<StoreFormProps>) {
  const form = useFormContext<StoreFormValues>();

  const brandGroup = useWatch({ control: form.control, name: 'brand_group' });
  const defaultHours = useWatch({ control: form.control, name: 'default_hours' });
  const holidayMode = useWatch({ control: form.control, name: 'holiday_mode' });
  const clubCode = useWatch({ control: form.control, name: 'club_code' });

  // FR-061c — compared on the trimmed value, as the confirm dialog is (FR-061b)
  const isClubCodeChanged =
    mode === 'edit' && loadedClubCode !== undefined && clubCode.trim() !== loadedClubCode;

  // Decision D2 — outside `preparing` the backend refuses a brand change with 422 E-STR-006, so
  // both selects lock and the tooltip names the reason rather than the head-office rule.
  const isBrandLocked = restricted || brandLocked;
  const brandLockReason = restricted
    ? STAFF_LOCKED_TOOLTIP
    : brandLockedTooltip(brandLockedStatusLabel);

  // FR-044: the per-row inputs carry no message of their own, so the half-entered days — and the
  // days that close before they open (Y-02 Bug No.8) — are named once beneath the table
  // (`storeFormWithHoursRuleSchema`).
  const hourErrors = form.formState.errors.default_hours;
  const invalidDays = Array.isArray(hourErrors)
    ? BUSINESS_HOUR_DAYS.filter((_, index) => Boolean(hourErrors[index]))
    : [];
  const daysWithReversedTime = Array.isArray(hourErrors)
    ? BUSINESS_HOUR_DAYS.filter((_, index) => hourErrors[index]?.message === REVERSED_HOURS_MESSAGE)
    : [];
  const daysMissingTime = invalidDays.filter((day) => !daysWithReversedTime.includes(day));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="club_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    店舗コード
                    <RequiredMark />
                  </FormLabel>
                  <FormDescription className="text-xs">{STORE_CODE_HELP[mode]}</FormDescription>
                  <Locked locked={restricted}>
                    <FormControl>
                      <Input
                        placeholder="例: TK-001"
                        className="max-w-60"
                        disabled={restricted}
                        {...field}
                      />
                    </FormControl>
                  </Locked>
                  {isClubCodeChanged && (
                    <Alert className="border-warning/50 bg-warning/15">
                      <AlertTriangle className="text-warning size-4" />
                      <AlertDescription className="text-muted-foreground text-xs">
                        {STORE_CODE_CHANGE_WARNING}
                      </AlertDescription>
                    </Alert>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    店舗名
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: JOYFIT24新宿店" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Outside the client's three-field Staff whitelist of 2026-08-24 (FR-084), so it locks
                with the head-office-only fields even though Y-02 L205 once read as including it */}
            <FormField
              control={form.control}
              name="name_kana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    店舗名（カナ）
                    <OptionalMark />
                  </FormLabel>
                  <Locked locked={restricted}>
                    <FormControl>
                      <Input
                        placeholder="例: ジョイフィット24シンジュクテン"
                        disabled={restricted}
                        {...field}
                      />
                    </FormControl>
                  </Locked>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ブランド
                      <RequiredMark />
                    </FormLabel>
                    <FormDescription className="text-xs">
                      JOYFIT の場合はサブブランドを併せて選択
                    </FormDescription>
                    <Locked locked={isBrandLocked} reason={brandLockReason}>
                      <Select
                        value={field.value || null}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // FR-015: a non-JOYFIT brand cannot carry a sub-brand
                          if (value !== 'JOYFIT') {
                            form.setValue('sub_brand', '', { shouldDirty: true });
                          }
                          // …and the same interaction clears both brand errors (prototype L344)
                          form.clearErrors(['brand_group', 'sub_brand']);
                        }}
                        disabled={isBrandLocked}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BRAND_GROUPS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Locked>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* F8 / FR-015 — not rendered at all for FIT365, so ブランド sits alone in its row;
                  disabled with 任意 while no brand is chosen; required for JOYFIT */}
              {brandGroup !== 'FIT365' && (
                <FormField
                  control={form.control}
                  name="sub_brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        サブブランド
                        {brandGroup === 'JOYFIT' ? <RequiredMark /> : <OptionalMark />}
                      </FormLabel>
                      <FormDescription className="text-xs">JOYFITの場合に選択</FormDescription>
                      <Locked locked={isBrandLocked} reason={brandLockReason}>
                        <Select
                          value={field.value || null}
                          onValueChange={field.onChange}
                          disabled={brandGroup !== 'JOYFIT' || isBrandLocked}
                          items={STORE_BRAND_LABELS}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {JOYFIT_SUB_BRANDS.map((value) => (
                              <SelectItem key={value} value={value}>
                                {STORE_BRAND_LABELS[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Locked>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/*
              TODO(round3) B1 — テリトリー (Y-02 FR-002, required, エリア → テリトリー cascade) is
              Phase 2: Y-15 組織階層管理 is Phase 2 on the client's CRM Category board. Commented
              out rather than deleted. Round 3 uncomments it as an エリア → テリトリー cascade
              (`AreaSelectInput` / `TerritorySelectInput`, prototype `47423ec`, not
              `TerritoryCombobox`), restores `territory_id`'s `.min(1)` in `store-form.schema.ts` and
              puts `territoryId` back in both bodies in `store-form.util.ts`.

              Y-02 FR-002 L131-132: only the territory is stored; area, block and head office are
              derived from it, so the breadcrumb below shows the resolved path.

            <FormField
              control={form.control}
              name="territory_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    テリトリー
                    <RequiredMark />
                  </FormLabel>
                  <FormDescription className="text-xs">
                    店舗が所属する組織階層。エリア・ブロック・運営本部はテリトリーから自動的に確定します
                  </FormDescription>
                  <Locked locked={restricted}>
                    <div className="flex w-100 max-w-full flex-col gap-1">
                      <TerritoryCombobox
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={restricted}
                        aria-invalid={Boolean(fieldState.error)}
                      />
                      <TerritoryBreadcrumb territoryId={field.value} />
                    </div>
                  </Locked>
                  <FormMessage />
                </FormItem>
              )}
            />
            */}

            <CompanyField restricted={restricted} />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      都道府県
                      <OptionalMark />
                    </FormLabel>
                    <Locked locked={restricted}>
                      <Select
                        value={field.value || null}
                        // The 未選択 item selects `null`; the field keeps `''`, which the payload
                        // builders send as an explicit null (FR-070b, BUG-U2-11)
                        onValueChange={(value) => field.onChange(value ?? '')}
                        disabled={restricted}
                        items={PREFECTURE_BY_CODE}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        {/* D4 — the option value is the JIS X 0401 code the master stores
                            (`"13"`), the label is the name resolved locally */}
                        <SelectContent>
                          <SelectItem value={null}>未選択</SelectItem>
                          {PREFECTURE_OPTIONS.map((prefecture) => (
                            <SelectItem key={prefecture.code} value={prefecture.code}>
                              {prefecture.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Locked>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      郵便番号
                      <OptionalMark />
                    </FormLabel>
                    <Locked locked={restricted}>
                      <FormControl>
                        <Input placeholder="例: 160-0022" disabled={restricted} {...field} />
                      </FormControl>
                    </Locked>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    住所
                    <OptionalMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 新宿区新宿3-1-1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      電話番号
                      <OptionalMark />
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={STORE_PHONE_EXAMPLE} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      FAX番号
                      <OptionalMark />
                    </FormLabel>
                    <Locked locked={restricted}>
                      <FormControl>
                        <Input placeholder={STORE_FAX_EXAMPLE} disabled={restricted} {...field} />
                      </FormControl>
                    </Locked>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Customer answer 2026-08-24 (QA #202): three opening-related fields (spec 028 FR-019a) */}
            <div className="grid grid-cols-2 gap-4">
              <DateField
                name="receipt_date"
                label="受付開始日"
                description="入会受付を始める日"
                restricted={restricted}
              />
              <DateField
                name="preopen_date"
                label="プレオープン日"
                description="プレオープンの日"
                restricted={restricted}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DateField name="grand_open_date" label="開店日" restricted={restricted} />
              <DateField
                name="closing_date"
                label="閉店日"
                description="閉店予定がある場合のみ設定。設定した日を過ぎると店舗ステータスが自動で「閉店」になります"
                restricted={restricted}
              />
            </div>

            {/* Y-02 FR-002 L127 / FR-005 L154. Covered by "business hours and closing days" in
                permission matrix L205, so Staff may always edit it. Saved with the store itself:
                `businessHours` on the POST (FR-046) and on the PATCH (B13). */}
            <FormItem>
              <FormLabel>
                営業時間（曜日別デフォルト設定）
                <OptionalMark />
              </FormLabel>
              <p className="text-muted-foreground text-xs">
                通常営業日の標準営業時間。営業カレンダーに年間一括適用され、例外日はカレンダー側で個別設定。祝日は「曜日どおり」のとき、その日の曜日の設定に従います
              </p>
              <div className="mt-1 flex flex-col gap-2">
                {BUSINESS_HOUR_DAYS.map((day, index) => {
                  if (day === 'holiday') return null;
                  const isClosed = defaultHours?.[index]?.is_closed ?? false;
                  const hasError = invalidDays.includes(day);
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-sm">{BUSINESS_HOUR_DAY_LABELS[day]}</span>
                      <HourInput
                        row={index}
                        edge="open_time"
                        label={`${BUSINESS_HOUR_DAY_LABELS[day]} 開店時刻`}
                        disabled={isClosed}
                        invalid={hasError}
                      />
                      <span className="text-muted-foreground text-xs">〜</span>
                      <HourInput
                        row={index}
                        edge="close_time"
                        label={`${BUSINESS_HOUR_DAY_LABELS[day]} 閉店時刻`}
                        disabled={isClosed}
                        invalid={hasError}
                      />
                      <FormField
                        control={form.control}
                        name={`default_hours.${index}.is_closed`}
                        render={({ field }) => (
                          <div className="ml-2 flex items-center gap-2">
                            <Checkbox
                              id={`closed-${day}`}
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked === true);
                                revalidateHourRow(form, index);
                              }}
                            />
                            <Label htmlFor={`closed-${day}`} className="text-xs font-normal">
                              定休日
                            </Label>
                          </div>
                        )}
                      />
                    </div>
                  );
                })}

                {/* F11 / FR-041a — 祝日 is a mode, not a time row (prototype L491-L524) */}
                <div className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-sm">{BUSINESS_HOUR_DAY_LABELS.holiday}</span>
                  <FormField
                    control={form.control}
                    name="holiday_mode"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange((value as HolidayMode | null) ?? 'follow_weekday');
                          // The 祝日 row's missing-time issue depends on the mode, so re-check it
                          // once errors are showing (cross-field rule — see the schema)
                          if (form.formState.isSubmitted) {
                            void form.trigger(`default_hours.${HOLIDAY_ROW_INDEX}`);
                          }
                        }}
                        items={HOLIDAY_MODE_LABELS}
                      >
                        <SelectTrigger className="w-28 text-xs" aria-label="祝日の扱い">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOLIDAY_MODES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {HOLIDAY_MODE_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {holidayMode === 'open' && (
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0" />
                    <HourInput
                      row={HOLIDAY_ROW_INDEX}
                      edge="open_time"
                      label="祝日 開店時刻"
                      invalid={invalidDays.includes('holiday')}
                    />
                    <span className="text-muted-foreground text-xs">〜</span>
                    <HourInput
                      row={HOLIDAY_ROW_INDEX}
                      edge="close_time"
                      label="祝日 閉店時刻"
                      invalid={invalidDays.includes('holiday')}
                    />
                  </div>
                )}
              </div>
              {daysMissingTime.length > 0 && (
                <p className="text-destructive mt-1 text-xs">
                  {daysMissingTime.map((day) => BUSINESS_HOUR_DAY_LABELS[day]).join('・')}
                  の開店時刻と閉店時刻を両方入力してください
                </p>
              )}
              {daysWithReversedTime.length > 0 && (
                <p className="text-destructive mt-1 text-xs">
                  {daysWithReversedTime.map((day) => BUSINESS_HOUR_DAY_LABELS[day]).join('・')}の
                  {REVERSED_HOURS_MESSAGE}
                </p>
              )}
            </FormItem>

            <FormField
              control={form.control}
              name="gender_restriction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    性別制限
                    <OptionalMark />
                  </FormLabel>
                  <Locked locked={restricted}>
                    <Select
                      value={field.value || null}
                      onValueChange={field.onChange}
                      disabled={restricted}
                      items={STORE_GENDER_RESTRICTION_LABELS}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full max-w-60">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDER_RESTRICTION_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {STORE_GENDER_RESTRICTION_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Locked>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Y-02 FR-007: the status is derived from the closure date, so the form has no control for it */}
          </div>
        </CardContent>
      </Card>

      <ReceptionSettingsCard restricted={restricted} />

      {/* Dev-added, no V0 source (FR-004 / FR-055). Never locked for a restricted Staff (FR-086a). */}
      <StoreFormPhotos {...photos} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">備考</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {/* Permission matrix L205 does not name remarks, so it is treated as head-office-only, the safe side */}
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  備考
                  <OptionalMark />
                </FormLabel>
                <Locked locked={restricted}>
                  <FormControl>
                    <Input
                      placeholder="補足事項があれば入力してください"
                      disabled={restricted}
                      {...field}
                    />
                  </FormControl>
                </Locked>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** Y-02 FR-002 受付設定 (261112_v11) — label and what each switch gates on the app side */
const RECEPTION_SETTINGS = [
  {
    name: 'joining_reception',
    label: '入会受付',
    description: STORE_RECEPTION_DESCRIPTIONS.joiningReception,
  },
  {
    name: 'link_reception',
    label: '引き継ぎ受付',
    description: STORE_RECEPTION_DESCRIPTIONS.linkReception,
  },
] as const satisfies readonly {
  name: keyof StoreFormValues;
  label: string;
  description: string;
}[];

/**
 * Y-02 FR-002 受付設定 — no prototype source yet (fitness-crm-ui `9428dc2` has none), so the row
 * follows the prototype's own switch rows (相互利用設定, `store-detail.tsx` L2925-L2948): label and
 * helper text on the left, 停止 / 受付 either side of the switch. Head office only (permission
 * matrix 受付設定), so a restricted Staff sees the values locked.
 */
function ReceptionSettingsCard({ restricted }: Readonly<Pick<StoreFormProps, 'restricted'>>) {
  const form = useFormContext<StoreFormValues>();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">受付設定</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        {RECEPTION_SETTINGS.map(({ name, label, description }, index) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem
                className={`flex flex-row items-center justify-between gap-4 ${index > 0 ? 'border-t pt-4' : ''}`}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <FormLabel>{label}</FormLabel>
                  <FormDescription className="text-xs">{description}</FormDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                  <span className="text-muted-foreground text-sm">停止</span>
                  <Locked locked={restricted}>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={restricted}
                        aria-label={label}
                      />
                    </FormControl>
                  </Locked>
                  <span className="text-sm font-medium">受付</span>
                </div>
              </FormItem>
            )}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * FR-017 — only active companies, and only real franchisees: 直営 is the pinned first row, so a
 * `direct_management` company in the master must not be offered a second time beside it.
 */
const ACTIVE_FC_COMPANIES = { isActive: true, managementType: 'franchise' } as const;

/** F2 — the explicit first option, so an FC store can be turned back into 直営 (prototype L60) */
const DIRECT_MANAGEMENT_OPTION = {
  id: DIRECT_MANAGEMENT_VALUE,
  label: '直営（運営企業なし）',
} as const;
const COMPANY_PINNED_OPTIONS = [DIRECT_MANAGEMENT_OPTION];

// Same chevron as the territory combobox above it, not the filter-row default
const COMPANY_END_ICON = <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />;

/**
 * Operating company (FC company) — FR-017. The shared `FcCompanySelectInput` pages and searches
 * the FC company master on the server and resolves the stored company's name itself.
 *
 * Direct management is the absence of an FC company: the pinned 直営（運営企業なし）row stores
 * `DIRECT_MANAGEMENT_VALUE`, which the payload builders send as `fcCompanyId: null`. Left empty on
 * create, it means the same (FR-017).
 */
function CompanyField({ restricted }: Readonly<Pick<StoreFormProps, 'restricted'>>) {
  const form = useFormContext<StoreFormValues>();
  const fcCompanyId = useWatch({ control: form.control, name: 'fc_company_id' });
  const isDirect = fcCompanyId === DIRECT_MANAGEMENT_VALUE;

  /**
   * The picker never fetches while disabled, so a restricted Staff would see the placeholder
   * instead of the store's company. API-075 §4 still answers a single company for an FC-manager
   * staff on their own company; for anyone else the lookup fails silently and the id is shown.
   */
  const { label: restrictedLabel } = useFcCompanyLabel(isDirect ? null : fcCompanyId, {
    enabled: restricted,
  });

  return (
    <FormField
      control={form.control}
      name="fc_company_id"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>
            運営企業（FC企業）
            <OptionalMark />
          </FormLabel>
          <FormDescription className="text-xs">
            FC企業マスタから選択。直営の場合は「直営（運営企業なし）」を選択
          </FormDescription>
          <Locked locked={restricted}>
            <FormControl>
              <FcCompanySelectInput
                value={field.value || null}
                valueLabel={
                  restricted && field.value && !isDirect
                    ? (restrictedLabel ?? field.value)
                    : undefined
                }
                placeholder="選択してください"
                searchPlaceholder="法人名で検索..."
                // 直営 is a real choice here (the pinned row), not a "clear" action
                clearLabel={null}
                pinnedOptions={COMPANY_PINNED_OPTIONS}
                queryFilters={ACTIVE_FC_COMPANIES}
                onChange={(company) => field.onChange(company?.id ?? DIRECT_MANAGEMENT_VALUE)}
                disabled={restricted}
                hasError={Boolean(fieldState.error)}
                endIcon={COMPANY_END_ICON}
                triggerClassName="h-9 w-full max-w-100 text-sm"
              />
            </FormControl>
          </Locked>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** One time input of the weekly table; the row's FR-044 issue marks both of its inputs invalid */
function HourInput({
  row,
  edge,
  label,
  disabled = false,
  invalid,
}: Readonly<{
  row: number;
  edge: 'open_time' | 'close_time';
  label: string;
  disabled?: boolean;
  invalid: boolean;
}>) {
  const form = useFormContext<StoreFormValues>();
  return (
    <FormField
      control={form.control}
      name={`default_hours.${row}.${edge}`}
      render={({ field }) => (
        <Input
          type="time"
          className="h-8 w-auto shrink-0 text-xs"
          disabled={disabled}
          aria-label={label}
          aria-invalid={invalid || undefined}
          {...field}
          onChange={(event) => {
            field.onChange(event);
            revalidateHourRow(form, row);
          }}
        />
      )}
    />
  );
}

/**
 * Y-02 Bug No.21 — FR-044's issue sits on the row (`default_hours.<i>`), but RHF's change-time
 * re-validation only updates the edited field's own path, so the row message would stay until the
 * next submit. Re-check the whole row once errors are showing.
 */
function revalidateHourRow(form: UseFormReturn<StoreFormValues>, row: number) {
  if (form.formState.isSubmitted) {
    void form.trigger(`default_hours.${row}`);
  }
}

/** One of the four date pickers. All four are head-office-only (permission matrix L205). */
function DateField({
  name,
  label,
  description,
  restricted,
}: Readonly<{
  name: 'receipt_date' | 'preopen_date' | 'grand_open_date' | 'closing_date';
  label: string;
  description?: string;
  restricted: boolean;
}>) {
  const form = useFormContext<StoreFormValues>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            <OptionalMark />
          </FormLabel>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <Locked locked={restricted}>
            <DatePicker
              date={field.value ? new Date(field.value) : undefined}
              onDateChange={(date) => {
                field.onChange(date ? formatISODateLocal(date) : '');
                // 閉店日's order error depends on 開店日 too, so re-check it once errors are
                // showing (cross-field rule — see `withOpeningClosingOrderRule`)
                if (name === 'grand_open_date' && form.formState.isSubmitted) {
                  void form.trigger('closing_date');
                }
              }}
              placeholder="日付を選択"
              disabled={restricted}
            />
          </Locked>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
