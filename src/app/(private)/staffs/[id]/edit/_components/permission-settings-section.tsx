'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { PositionSelectInput } from '@/components/common/data-select-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { STAFF_ROLE_LABELS, StaffRole } from '../../../_constants/constants';
import { needsStoreReselection } from '../../../_utils/store-affiliation.util';
import type { StaffEditFormValues } from '../_schemas/staff-edit-form.schema';

interface PermissionSettingsSectionProps {
  /** ロール変更権限: HQ/System のみ — src: staff-form.tsx L753-792 */
  canChangeRole: boolean;
  /** The loaded record's 職位 id, used to recognise its own unlisted 「未割当」 value. */
  positionId: string;
  /** …and the name `GET /admin/staff/{id}` returned for it, shown when it is unlisted. */
  positionName: string;
  /** The loaded record's ロール, to tell an untouched form from a pending role change. */
  initialRole: string;
}

export function PermissionSettingsSection({
  canChangeRole,
  positionId,
  positionName,
  initialRole,
}: PermissionSettingsSectionProps) {
  const form = useFormContext<StaffEditFormValues>();
  const role = useWatch({ control: form.control, name: 'role' });
  // While ロール is being changed, an empty 職位 means the *new* role's 「未割当」 — the PATCH
  // carries `role` without a `positionId` (Y-01 - Bug No.19). Only the helper text differs.
  const isRoleChanged = role !== initialRole;

  return (
    <Card>
      <CardHeader>
        <CardTitle>権限設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ─── ロール — HQ/System のみ変更可、それ以外は disabled + tooltip ─── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  ロール<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                {canChangeRole ? (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // Re-choosing the selected role fires this too; resetting then would make
                      // the save send `positionId: ''` and wipe a real 職位 (BUG-P2-03-11).
                      if (value === field.value) return;
                      field.onChange(value);
                      // A position belongs to exactly one role — reset so a stale pick from the
                      // previous role can't leak through; '' falls back to 未割当 for the new role.
                      form.setValue('position_id', '', { shouldDirty: true });
                      // Only a Manager may hold several 所属店舗. Leaving Manager with more than
                      // one clears them so the user picks the one store again — never keep the
                      // first one silently (decision 2026-11-10).
                      const storeIds = form.getValues('affiliation_store_ids');
                      if (
                        form.getValues('affiliation_type') === 'direct_store' &&
                        needsStoreReselection(value, storeIds)
                      ) {
                        form.setValue('affiliation_store_ids', [], { shouldDirty: true });
                        form.setValue('store_reselect_required', true);
                      }
                      if (form.formState.isSubmitted || form.getValues('store_reselect_required')) {
                        void form.trigger('affiliation_store_ids');
                      }
                    }}
                    items={STAFF_ROLE_LABELS}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(STAFF_ROLE_LABELS)
                        .filter(([value]) => value !== StaffRole.SYSTEM)
                        .map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger render={<span className="inline-flex w-full" />}>
                        <Select value={role} disabled items={STAFF_ROLE_LABELS}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="選択" />
                            </SelectTrigger>
                          </FormControl>
                        </Select>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">ロール変更は本部権限が必要です</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <p className="text-muted-foreground text-xs">
                  {canChangeRole
                    ? 'ロールによって利用できる機能の範囲が決まります。変更は次回ログインから反映されます'
                    : 'ロール変更は本部のみ可能です。職位の割り当てのみ変更できます'}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ─── 職位 (API master, optional, left half) ─── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="position_id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>職位（任意）</FormLabel>
                {/* `unlistedValueLabel`: a 未割当 account's own positionId is a real UUID
                    that `GET /admin/positions` never lists (those rows are
                    `isSystemManaged`), so without the record's own positionName the
                    trigger would render the bare id. BUG-P2-03-01 / TC-030. */}
                <PositionSelectInput
                  value={field.value || null}
                  onChange={(position) => field.onChange(position?.positionId ?? '')}
                  role={role}
                  allLabel="未割当"
                  placeholder="選択"
                  unlistedValueLabel={field.value === positionId ? positionName : undefined}
                  hasError={!!fieldState.error}
                  triggerClassName="h-9 w-full rounded-lg"
                />
                <p className="text-muted-foreground text-xs">
                  {isRoleChanged
                    ? 'ロールを変更すると職位は選び直しになります。未選択の場合は新しいロールの「未割当」職位になります'
                    : 'ロール内の権限粒度を職位マスターで設定します。未選択の場合はロールの「未割当」職位になります'}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
