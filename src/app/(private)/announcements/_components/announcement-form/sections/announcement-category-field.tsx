'use client';

// Client component: react-hook-form controller, React Query and the auth-user context.
import { useEffect, useMemo } from 'react';
import { type Control, type UseFormResetField, useController } from 'react-hook-form';

import { ANNOUNCEMENT_CATEGORY_LIST_QUERY } from '@/app/(private)/announcements/_constants/announcement.constants';
import type { AnnouncementFormValues } from '@/app/(private)/announcements/_schemas/announcement-form.schema';
import { useAuthUser } from '@/contexts/auth-user.context';
import { toSelectItems } from '@/utils/app.util';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';

import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getCrmArticleCategoriesOptions } from '@/lib/api/@tanstack/react-query.gen';

import { UserRole } from '@/types/permission.type';

const CATEGORY_MANAGER_ROLES = [UserRole.Headquarter, UserRole.System] as const;
/** Sentinel of the 「新規カテゴリを追加」 action item; never written to the form. */
const ADD_CATEGORY_VALUE = '__add_new__';

interface AnnouncementCategoryFieldProps {
  control: Control<AnnouncementFormValues>;
  /** Used to drop a category deleted from the master without marking the form dirty. */
  resetField: UseFormResetField<AnnouncementFormValues>;
  /** 「新規カテゴリを追加」 — the parent navigates to `/article-categories/create` (discard guard). */
  onAddCategory: () => void;
}

/**
 * カテゴリ field of the コンテンツ情報 card (prototype announcement-form.tsx L267-L310): お知らせ
 * categories, 「新規カテゴリを追加」 for Headquarter / System, and a clear button (FR-004).
 */
export function AnnouncementCategoryField({
  control,
  resetField,
  onAddCategory,
}: Readonly<AnnouncementCategoryFieldProps>) {
  const { hasRole } = useAuthUser();
  const canManageCategories = hasRole(CATEGORY_MANAGER_ROLES);
  const { field } = useController({ control, name: 'categoryId' });

  const { data: categoriesRes, isSuccess } = useQuery(
    getCrmArticleCategoriesOptions({ query: ANNOUNCEMENT_CATEGORY_LIST_QUERY }),
  );
  const categoryOptions = useMemo(
    () =>
      (categoriesRes?.items ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categoriesRes],
  );

  const categoryId = field.value;
  const isKnownCategory =
    categoryId !== null && categoryOptions.some((option) => option.value === categoryId);

  // Spec Edge Cases: a category removed from the master is treated as no category.
  useEffect(() => {
    if (isSuccess && categoryId !== null && !isKnownCategory) {
      resetField('categoryId', { defaultValue: null });
    }
  }, [isSuccess, categoryId, isKnownCategory, resetField]);

  const handleValueChange = (value: string | null) => {
    if (value === ADD_CATEGORY_VALUE) {
      onAddCategory();
      return;
    }
    field.onChange(value);
  };

  return (
    <FormField label="カテゴリ" optional>
      <div className="flex items-center gap-1">
        <Select
          items={toSelectItems(categoryOptions)}
          value={isKnownCategory ? categoryId : null}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="max-w-[320px]" onBlur={field.onBlur}>
            <SelectValue placeholder="カテゴリを選択" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {canManageCategories && (
              <>
                <SelectSeparator />
                <SelectItem
                  value={ADD_CATEGORY_VALUE}
                  className="text-primary focus:text-primary font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="size-4" />
                    新規カテゴリを追加
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {/* カテゴリは任意（FR-002）— 一度選んでも外せるようにする */}
        {isKnownCategory && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-8"
            aria-label="カテゴリを外す"
            onClick={() => field.onChange(null)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </FormField>
  );
}
