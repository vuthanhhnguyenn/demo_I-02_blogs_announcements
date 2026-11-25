'use client';

import { type UseFormReturn, useFormContext, useWatch } from 'react-hook-form';

import { useQuery } from '@tanstack/react-query';

import { FcCompanySelectInput } from '@/components/common/data-select-input';
import { FormField } from '@/components/common/form-field';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { adminStoreControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { StaffStoreField } from '../../_components/staff-store-field';
import type { StaffCreateFormValues } from '../_schemas/staff-create.schema';

function handleAffiliationTypeChange(
  form: UseFormReturn<StaffCreateFormValues>,
  value: 'direct_store' | 'fc_company',
) {
  form.setValue('affiliation_type', value, { shouldDirty: true });
  form.setValue('store_ids', [], { shouldDirty: true });
  form.setValue('store_reselect_required', false);
  form.setValue('fc_company_id', '', { shouldDirty: true });
  form.clearErrors('store_ids');
}

export function AffiliationSection() {
  const form = useFormContext<StaffCreateFormValues>();
  const affiliationType = useWatch({ control: form.control, name: 'affiliation_type' });
  const role = useWatch({ control: form.control, name: 'role' });
  const storeIds = useWatch({ control: form.control, name: 'store_ids' });
  const storeError = form.formState.errors.store_ids?.message;
  const fcCompanyId = useWatch({ control: form.control, name: 'fc_company_id' });

  const { data: fcStoresRes } = useQuery({
    ...adminStoreControllerListOptions({
      query: { page: 1, limit: 100, fcCompanyId: fcCompanyId || undefined },
    }),
    enabled: affiliationType === 'fc_company' && !!fcCompanyId,
  });
  const selectedFcStores = fcStoresRes?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">所属設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          {/* 所属パターン is a UI-only construct (no wire field) and always holds a value, so the
              required mark is cosmetic — it matches the prototype. The 所属店舗 / 所属FC企業 values
              below are **optional** per Y-01 L178「任意入力項目: 職位・所属店舗（パターンA）or
              FC企業（パターンB）・備考」, spec.md "Field Validation Constraints", and the contract
              (`InviteStaffRequestDto.required` lists only email/role/lastName/firstName).
              FIXED 2026-09-18: they were required here, which all three sources contradict. */}
          <FormField
            label="所属パターン"
            required
            description="パターンAとパターンBは排他です。どちらか一方のみ選択できます"
          >
            <RadioGroup
              value={affiliationType}
              onValueChange={(value) =>
                handleAffiliationTypeChange(form, value as 'direct_store' | 'fc_company')
              }
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="direct_store" id="aff-store" />
                <Label htmlFor="aff-store" className="cursor-pointer text-sm">
                  パターンA: 店舗直接紐づき（マネージャーは複数店舗可）
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="fc_company" id="aff-fc" />
                <Label htmlFor="aff-fc" className="cursor-pointer text-sm">
                  パターンB: FC企業紐づき（1社 → 管轄全店舗）
                </Label>
              </div>
            </RadioGroup>
          </FormField>

          {affiliationType === 'direct_store' && (
            <StaffStoreField
              role={role}
              value={storeIds}
              onChange={(next) => {
                form.setValue('store_ids', next, { shouldDirty: true, shouldValidate: true });
                if (next.length > 0) form.setValue('store_reselect_required', false);
              }}
              error={storeError}
            />
          )}

          {affiliationType === 'fc_company' && (
            <FormField
              label="所属FC企業"
              optional
              description="1社を選択してください。管轄全店舗へのアクセスが付与されます"
            >
              {/* パターンB is an **FC** affiliation, so 直営 companies such as 「フィットネス関西」
                  (`managementType: direct_management`) must not be offered — picking one made the
                  submit 400 with E-VAL-001. Only 有効 companies are offered, per prototype 6bc1f1c
                  (`type === FC && 有効`). */}
              <FcCompanySelectInput
                value={fcCompanyId || null}
                onChange={(fcCompany) =>
                  form.setValue('fc_company_id', fcCompany?.id ?? '', { shouldDirty: true })
                }
                placeholder="FC企業を選択してください"
                clearLabel={null}
                queryFilters={{ isActive: true }}
                excludeDirectManagement
                triggerClassName="h-9 max-w-[320px] rounded-lg"
              />
              {fcCompanyId && (
                <div className="bg-muted/30 mt-3 rounded-md border p-3">
                  <p className="text-muted-foreground mb-2 text-xs">
                    管轄店舗（このスタッフがアクセスできる店舗）:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedFcStores.map((s) => (
                      <Badge
                        key={s.id}
                        variant="outline"
                        className="h-auto max-w-full text-left text-[10px] [overflow-wrap:anywhere] whitespace-normal"
                      >
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </FormField>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
