'use client';

import { useFormContext } from 'react-hook-form';

import {
  AvailableAreasLoadError,
  AvailableAreasLoading,
  AvailableAreasReadout,
} from '@/app/(private)/area-master/_components/available-areas';
import { useBrandAreas } from '@/app/(private)/area-master/_hooks/use-brand-areas';
import { toAreaBrandGroup } from '@/app/(private)/area-master/_utils/area-brand.util';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { useQuery } from '@tanstack/react-query';

import { Field } from '@/components/common/field';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  adminPlanControllerDetailOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import {
  MAIN_CONTRACT_STATUS_BADGE_CLASSES,
  MAIN_CONTRACT_TYPE_BADGE_CLASSES,
  MAIN_CONTRACT_TYPE_LABELS,
  PLAN_BRAND_LABELS,
  PLAN_LIMIT_OF_SEX_LABELS,
  PLAN_OTHER_STORE_AVAILABLE_LABELS,
  type PlanFeeField,
  enrollmentFeeFieldsForBrand,
} from '../_constants/constants';
import type { ContractFormValues } from '../_schemas/contract-form.schema';

interface ContractFormConfirmationProps {
  /** 主契約ID of the master being edited; blank while creating or duplicating. */
  planCode?: string;
  /** Drives the banner so it names the button the operator is about to press. */
  isEdit?: boolean;
}

function YesNoBadge({
  enabled,
  yes = 'あり',
  no = 'なし',
}: Readonly<{ enabled: boolean; yes?: string; no?: string }>) {
  return (
    <Badge
      variant="outline"
      className={`w-fit text-[10px] ${
        enabled
          ? 'border-success/20 bg-success/15 text-success'
          : 'bg-muted text-muted-foreground border-border'
      }`}
    >
      {enabled ? yes : no}
    </Badge>
  );
}

function ageRestrictionLabel(minAge?: number | null, maxAge?: number | null): string {
  if (minAge != null && maxAge != null) return `${minAge}歳〜${maxAge}歳`;
  if (minAge != null) return `${minAge}歳以上`;
  if (maxAge != null) return `${maxAge}歳以下`;
  return '制限なし';
}

export function ContractFormConfirmation({
  planCode,
  isEdit = false,
}: Readonly<ContractFormConfirmationProps>) {
  const form = useFormContext<ContractFormValues>();
  const values = form.getValues();
  const brandAreasQuery = useBrandAreas(toAreaBrandGroup(values.brandEnum));
  const pickedAreaIds = values.areaIds ?? [];
  const pickedAreas = brandAreasQuery.areas.filter((a) => pickedAreaIds.includes(a.id));

  const isSpecialContract = values.contractType === 'special';
  const contractTypeLabel = values.contractType
    ? MAIN_CONTRACT_TYPE_LABELS[values.contractType]
    : '―';
  const brandLabel = values.brandEnum ? PLAN_BRAND_LABELS[values.brandEnum] : '―';
  const otherStoreLabel =
    values.otherStoreAvailable != null
      ? PLAN_OTHER_STORE_AVAILABLE_LABELS[String(values.otherStoreAvailable) as 'true' | 'false']
      : '―';
  const startDateFormatted = formatDateYYYYMMDD(values.usageStartDate, '―');
  // Y-07 FR-002: the 入会時費用 items on show are the ones the chosen brand owns.
  const enrollmentFeeFields = enrollmentFeeFieldsForBrand(values.brandEnum);
  // Saving an emptied 入会時費用 stores 0 when the master being edited / copied had an amount
  // (see `toUpdatePlanBody`); a blank create form has no default, so it stays blank.
  const hadStoredFee = (name: PlanFeeField) => form.formState.defaultValues?.[name] != null;

  // 店舗 / 親主契約 are held as ids; this step resolves their names so the operator confirms
  // what they picked rather than a raw id. Both details are already cached by the picker.
  const { data: selectedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: values.storeId ?? '' } }),
    enabled: isSpecialContract && !!values.storeId,
  });
  const { data: selectedParentPlan } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: values.parentPlanId ?? '' } }),
    enabled: !!values.parentPlanId,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="border-info/20 bg-info/10 rounded-lg border px-4 py-3">
        <p className="text-info text-sm">
          入力内容を確認してください。問題がなければ「{isEdit ? '変更を保存する' : '登録する'}
          」ボタンを押してください。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 px-4">
          <Field label="主契約名" value={values.name || '―'} />
          <Field
            label="主契約ID"
            value={
              planCode ? (
                <span className="font-mono">{planCode}</span>
              ) : (
                <span className="text-muted-foreground font-mono">保存後に自動採番</span>
              )
            }
          />
          <Field
            label="契約タイプ"
            value={
              values.contractType ? (
                <Badge
                  variant="outline"
                  className={`w-fit text-[10px] ${MAIN_CONTRACT_TYPE_BADGE_CLASSES[values.contractType]}`}
                >
                  {contractTypeLabel}
                </Badge>
              ) : (
                '―'
              )
            }
          />
          {/* G-01 FR-M002「店舗（特殊契約時に指定）」— only 特殊契約 carries a 店舗 to confirm. */}
          {isSpecialContract && (
            <Field
              label="店舗"
              value={
                selectedStore?.name ?? <span className="text-destructive text-sm">未選択</span>
              }
            />
          )}
          <Field label="他店舗利用可否" value={otherStoreLabel} />
        </CardContent>
      </Card>

      {/* FR-M007: 親主契約 is the core field of the 子主契約 flow, so it is confirmed before save. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ブランド・属性</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 px-4">
          <Field label="ブランド" value={brandLabel} />
          <Field
            label="親主契約名"
            value={
              values.parentPlanId ? (
                (selectedParentPlan?.name ?? values.parentPlanId)
              ) : (
                <span className="text-muted-foreground text-sm">なし（親主契約なし）</span>
              )
            }
          />
          <Field label="相互利用あり" value={<YesNoBadge enabled={!!values.isMultiUsable} />} />
          <Field label="同伴特典" value={<YesNoBadge enabled={!!values.hasCompanionBenefit} />} />
          <Field label="会員公開用主契約名" value={values.nameForMember || '―'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">料金・条件</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="料金（税込）" value={formatYen(values.priceTaxIncluded, '―')} />
            <Field label="休会時請求金額（税込）" value={formatYen(values.suspensionFee, '―')} />
            <Field label="違約金（税込）" value={formatYen(values.cancellationFee, '―')} />
            <Field label="税率" value={values.taxRate != null ? `${values.taxRate}%` : '―'} />
            <Field
              label="会計コード"
              value={
                values.accountingCode ? (
                  <span className="font-mono">{values.accountingCode}</span>
                ) : (
                  '―'
                )
              }
            />
            <Field label="利用開始日" value={startDateFormatted} />
            <Field
              label="回数上限"
              value={
                values.monthlyVisitLimit != null ? `月${values.monthlyVisitLimit}回` : '制限なし'
              }
            />
            <Field
              label="休会可能月"
              value={values.suspendableMonths != null ? `${values.suspendableMonths}ヶ月` : '―'}
            />
            <Field
              label="退会可能月"
              value={
                values.cancellationFeeMonths != null ? `${values.cancellationFeeMonths}ヶ月` : '―'
              }
            />
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-muted-foreground mb-2 text-xs">入会時費用（税込）</p>
            {enrollmentFeeFields ? (
              <div className="grid grid-cols-3 gap-4">
                {enrollmentFeeFields.map((fee) => (
                  <Field
                    key={fee.name}
                    label={fee.label}
                    value={formatYen(values[fee.name] ?? (hadStoredFee(fee.name) ? 0 : null), '―')}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">―（ブランド未選択）</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">対象制限</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 px-4">
          <Field label="年齢制限" value={ageRestrictionLabel(values.minAge, values.maxAge)} />
          <Field
            label="性別制限"
            value={values.limitOfSex ? PLAN_LIMIT_OF_SEX_LABELS[values.limitOfSex] : '―'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">利用できるエリア</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {pickedAreaIds.length > 0 && brandAreasQuery.isLoading ? (
            <AvailableAreasLoading />
          ) : pickedAreaIds.length > 0 && brandAreasQuery.isError ? (
            <AvailableAreasLoadError
              error={brandAreasQuery.error}
              onRetry={() => void brandAreasQuery.refetch()}
            />
          ) : (
            <AvailableAreasReadout
              subject="plan"
              areas={pickedAreas}
              limitOfSex={values.limitOfSex}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ステータス</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Field
            label="主契約の有効/無効"
            value={
              <Badge
                variant="outline"
                className={`w-fit text-[10px] ${MAIN_CONTRACT_STATUS_BADGE_CLASSES[values.isActive === false ? 'inactive' : 'active']}`}
              >
                {values.isActive === false ? '無効' : '有効'}
              </Badge>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
