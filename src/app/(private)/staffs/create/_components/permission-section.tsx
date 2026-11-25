'use client';

import { type UseFormReturn, useFormContext, useWatch } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';

import { PositionSelectInput } from '@/components/common/data-select-input';
import { FormField } from '@/components/common/form-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { STAFF_ROLE_LABELS, StaffRole } from '../../_constants/constants';
import { needsStoreReselection } from '../../_utils/store-affiliation.util';
import type { StaffCreateFormValues } from '../_schemas/staff-create.schema';

const CREATABLE_ROLES = (Object.values(StaffRole) as StaffRole[]).filter(
  (role) => role !== StaffRole.SYSTEM,
);

function handleRoleChange(form: UseFormReturn<StaffCreateFormValues>, value: string) {
  form.setValue('role', value as StaffCreateFormValues['role'], { shouldDirty: true });
  // A position belongs to exactly one role — reset so a stale pick from the previous
  // role can't leak through; '' falls back to the new role's 未割当 position.
  form.setValue('position_id', '', { shouldDirty: true });
  // Only a Manager may hold several 所属店舗. Leaving Manager with more than one picked
  // clears them and makes the user choose the one store again — never keep the first.
  const storeIds = form.getValues('store_ids');
  if (
    form.getValues('affiliation_type') === 'direct_store' &&
    needsStoreReselection(value, storeIds)
  ) {
    form.setValue('store_ids', [], { shouldDirty: true });
    form.setValue('store_reselect_required', true);
  }
  if (form.formState.isSubmitted || form.getValues('store_reselect_required')) {
    void form.trigger('store_ids');
  }
}

export function PermissionSection() {
  const form = useFormContext<StaffCreateFormValues>();
  const role = useWatch({ control: form.control, name: 'role' });
  const positionId = useWatch({ control: form.control, name: 'position_id' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">権限設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <FormField
            label="ロール"
            required
            description="ロールによって利用できる機能の範囲が決まります"
            error={form.formState.errors.role?.message}
          >
            <Select
              value={role ?? ''}
              onValueChange={(value) => handleRoleChange(form, value ?? '')}
              items={toSelectItems(
                CREATABLE_ROLES.map((r) => ({ value: r, label: STAFF_ROLE_LABELS[r] })),
              )}
            >
              <SelectTrigger className="max-w-[280px]">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {CREATABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {STAFF_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="職位"
            optional
            description="ロール内の権限粒度を職位マスターで設定します。未選択の場合はロールの「未割当」職位になります"
            error={form.formState.errors.position_id?.message}
          >
            <PositionSelectInput
              value={positionId || null}
              onChange={(position) =>
                form.setValue('position_id', position?.positionId ?? '', { shouldDirty: true })
              }
              role={role || undefined}
              // While no ロール is picked the field must read its placeholder. The 未割当 row
              // doubles as the trigger label for an empty selection, so it has to go until a
              // role exists — otherwise the disabled trigger reads 「未割当」 and nothing tells
              // the user a role comes first.
              allLabel={role ? '未割当' : null}
              placeholder={role ? '職位を選択' : '先にロールを選択してください'}
              disabled={!role}
              hasError={!!form.formState.errors.position_id}
              triggerClassName="h-9 max-w-[280px] rounded-lg"
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
