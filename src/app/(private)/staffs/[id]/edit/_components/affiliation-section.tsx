'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useQuery } from '@tanstack/react-query';

import { FcCompanySelectInput } from '@/components/common/data-select-input';
import { FormField } from '@/components/common/form-field';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { adminStoreControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { CrmMeStoreDto } from '@/lib/api-real/types.gen';

import { StaffStoreField } from '../../../_components/staff-store-field';
import type { StaffEditFormValues } from '../_schemas/staff-edit-form.schema';

/**
 * 所属設定 card — same パターン radio / 所属店舗 / 所属FC企業 / managed-stores preview
 * as the create page, pre-filled from the existing record — src: staff-form.tsx L808-876
 */
interface AffiliationSectionProps {
  /**
   * 店舗 / FC企業紐づけ設定 is ○ for System/Headquarter and **×** for every other role in
   * Y-01's 権限マトリクス. A Manager reaches this form to assign a 職位 (that row *is* ○ for
   * them), so the card renders read-only rather than being hidden — src: Y-01 権限マトリクス.
   */
  canEditAffiliation: boolean;
  /**
   * The record's current 所属店舗 (`StaffDetailDto.stores`) and FC企業 name. Both pickers stop fetching
   * once disabled, so without these a read-only card falls back to its placeholder and the
   * Manager cannot see which 店舗 / FC企業 the staff is on. Unused while editing is allowed —
   * the pickers resolve their own labels then.
   */
  stores?: readonly Pick<CrmMeStoreDto, 'storeId' | 'storeCode' | 'storeName'>[];
  fcCompanyLabel?: string | null;
}

export function AffiliationSection({
  canEditAffiliation,
  stores,
  fcCompanyLabel,
}: AffiliationSectionProps) {
  const form = useFormContext<StaffEditFormValues>();
  const affiliationType = form.watch('affiliation_type');
  const fcCompanyId = form.watch('affiliation_fc_company_id');
  const role = useWatch({ control: form.control, name: 'role' });
  const storeIds = useWatch({ control: form.control, name: 'affiliation_store_ids' });
  const storeError = form.formState.errors.affiliation_store_ids?.message;
  const storeLabels = useMemo(
    () =>
      Object.fromEntries(
        (stores ?? []).map((store) => [store.storeId, store.storeName ?? store.storeId]),
      ),
    [stores],
  );

  const { data: fcStoresRes } = useQuery({
    ...adminStoreControllerListOptions({
      query: { page: 1, limit: 100, fcCompanyId: fcCompanyId || undefined },
    }),
    enabled: affiliationType === 'fc_company' && !!fcCompanyId,
  });
  const selectedFcStores = fcStoresRes?.items ?? [];

  const handleAffiliationTypeChange = (value: 'direct_store' | 'fc_company') => {
    form.setValue('affiliation_type', value, { shouldDirty: true });
    form.setValue('affiliation_store_ids', [], { shouldDirty: true });
    form.setValue('store_reselect_required', false);
    form.setValue('affiliation_fc_company_id', '', { shouldDirty: true });
    form.clearErrors('affiliation_store_ids');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>所属設定</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-4">
        {/* 所属パターン is UI-only (no wire field) and always holds a value — the required mark is
            cosmetic and matches the prototype. The 所属店舗 / 所属FC企業 values are **optional**:
            Y-01 L178 lists them under 「任意入力項目」 and `UpdateStaffRequestDto` requires no field
            at all (both are `nullable` with 「null clears it」, so clearing an affiliation is a
            supported state). 2026-09-18: added the 「（任意）」 marks the prototype shows. */}
        <FormField
          label="所属パターン"
          required
          description="パターンAとパターンBは排他です。どちらか一方のみ選択できます"
        >
          <RadioGroup
            value={affiliationType}
            onValueChange={(value) =>
              handleAffiliationTypeChange(value as 'direct_store' | 'fc_company')
            }
            disabled={!canEditAffiliation}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="direct_store" id="edit-aff-store" />
              <Label htmlFor="edit-aff-store" className="cursor-pointer text-sm">
                パターンA: 店舗直接紐づき（マネージャーは複数店舗可）
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="fc_company" id="edit-aff-fc" />
              <Label htmlFor="edit-aff-fc" className="cursor-pointer text-sm">
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
              form.setValue('affiliation_store_ids', next, {
                shouldDirty: true,
                shouldValidate: true,
              });
              if (next.length > 0) form.setValue('store_reselect_required', false);
            }}
            error={storeError}
            disabled={!canEditAffiliation}
            selectedLabels={storeLabels}
          />
        )}

        {affiliationType === 'fc_company' && (
          <FormField
            label="所属FC企業"
            optional
            description="1社を選択してください。管轄全店舗へのアクセスが付与されます"
          >
            {/* パターンB is an **FC** affiliation, so the catalog is narrowed to companies that
                are still 有効 and are not 直営 — unfiltered, the picker offered 直営 companies
                such as 「フィットネス関西」 (`managementType: direct_management`) as an FC
                affiliation — src: prototype 6bc1f1c filters `type === FC && 有効`.
                `managementType: 'franchise'` alone was wrong the other way: it hid the equally
                valid `entrustment` companies. See the picker's TODO(BE). */}
            <FcCompanySelectInput
              value={fcCompanyId || null}
              onChange={(fcCompany) =>
                form.setValue('affiliation_fc_company_id', fcCompany?.id ?? '', {
                  shouldDirty: true,
                })
              }
              placeholder="FC企業を選択してください"
              clearLabel={null}
              disabled={!canEditAffiliation}
              valueLabel={canEditAffiliation ? undefined : fcCompanyLabel}
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
      </CardContent>
    </Card>
  );
}
