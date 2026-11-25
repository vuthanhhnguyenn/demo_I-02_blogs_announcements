'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormItem, FormLabel } from '@/components/ui/form';

import { adminTrainerControllerLinkableStaffOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { TrainerLinkableStaffItemDto } from '@/lib/api-real/types.gen';

import type { InstructorFormValues } from '../instructor-form.schema';

const LINKABLE_STAFF_LIMIT = 20;

const staffLabel = (staff: TrainerLinkableStaffItemDto) =>
  staff.positionName ? `${staff.name}（${staff.positionName}）` : staff.name;

interface InstructorFormCrmLinkProps {
  /** The caller may not change the link (a trainer editing their own profile, D18) */
  locked?: boolean;
}

export function InstructorFormCrmLink({ locked = false }: InstructorFormCrmLinkProps) {
  const form = useFormContext<InstructorFormValues>();
  const staffId = useWatch({ control: form.control, name: 'crmAccountLinkStaffId' });
  const staffName = useWatch({ control: form.control, name: 'crmAccountLinkStaffName' });
  const [search, setSearch] = useState('');

  // Active trainer-role staff not linked to any trainer yet (API-109 linkable-staff, D18)
  const { data, isLoading } = useQuery({
    ...adminTrainerControllerLinkableStaffOptions({
      query: { q: search || undefined, limit: LINKABLE_STAFF_LIMIT },
    }),
    enabled: !locked,
  });
  const staffs = data?.items ?? [];

  const handleSelect = (staff: TrainerLinkableStaffItemDto | null) => {
    // Re-selecting the currently linked staff toggles the link off.
    const next = staff && staff.id === staffId ? null : staff;
    form.setValue('crmAccountLinkStaffId', next?.id ?? null, { shouldDirty: true });
    form.setValue('crmAccountLinkStaffName', next?.name ?? null, { shouldDirty: true });
  };

  return (
    <>
      <h2 className="mb-1 text-base font-bold">CRMアカウント紐づけ</h2>
      <p className="text-muted-foreground mb-4 text-xs">
        スタッフマスタから選択します（任意）。紐づけしない場合は空欄のままにしてください。
      </p>
      <FormItem>
        <FormLabel className="text-sm font-medium">スタッフアカウント</FormLabel>
        {locked ? (
          <>
            <p className="text-sm">
              {staffName || <span className="text-muted-foreground">未設定</span>}
            </p>
            <p className="text-muted-foreground text-xs">
              本人によるCRMアカウント紐づけの変更はできません
            </p>
          </>
        ) : (
          <>
            <SearchableSelect
              value={staffId ?? null}
              valueLabel={staffId && staffName ? staffName : undefined}
              options={staffs}
              placeholder="スタッフを検索して選択"
              searchPlaceholder="氏名で検索..."
              emptyMessage="紐づけ可能なスタッフがありません"
              loadingMessage="検索中..."
              isLoading={isLoading}
              onSearchChange={setSearch}
              onSelect={handleSelect}
              getOptionKey={(staff) => staff.id}
              getOptionLabel={staffLabel}
              triggerClassName="w-full"
            />
            {staffId && staffName && (
              <Badge
                variant="secondary"
                className="w-fit gap-1 py-1.5 pr-1 pl-2.5 text-xs font-normal"
              >
                {staffName}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-4 hover:bg-transparent"
                  onClick={() => handleSelect(null)}
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            )}
          </>
        )}
      </FormItem>
    </>
  );
}
