'use client';

// Client component: react-hook-form controller, React Query and the auth-user context.
import { useEffect, useMemo } from 'react';
import { type Control, type UseFormResetField, useController } from 'react-hook-form';

import { BLOG_CATEGORY_LIST_QUERY } from '@/app/(private)/blogs/_constants/blog.constants';
import { useAuthUser } from '@/contexts/auth-user.context';
import { toSelectItems } from '@/utils/app.util';
import { useQuery } from '@tanstack/react-query';
import { Plus, Settings, X } from 'lucide-react';

import { FormField } from '@/components/common/form-field';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

import type { BlogFormValues } from '../../../_schemas/blog-form.schema';

const CATEGORY_MANAGER_ROLES = [UserRole.Headquarter, UserRole.System] as const;
/** Sentinel of the 「新規カテゴリを追加」 action item; never written to the form. */
const ADD_CATEGORY_VALUE = '__add_new__';

interface BlogCategorySectionProps {
  control: Control<BlogFormValues>;
  /** Used to drop a category deleted from the master without marking the form dirty. */
  resetField: UseFormResetField<BlogFormValues>;
  /** 「カテゴリを管理」 — the parent navigates to `/article-categories?type=blog` (discard guard). */
  onManageCategories: () => void;
  /** 「新規カテゴリを追加」 — the parent navigates to `/article-categories/create` (discard guard). */
  onAddCategory: () => void;
}

export function BlogCategorySection({
  control,
  resetField,
  onManageCategories,
  onAddCategory,
}: Readonly<BlogCategorySectionProps>) {
  const { hasRole } = useAuthUser();
  const canManageCategories = hasRole(CATEGORY_MANAGER_ROLES);
  const { field } = useController({ control, name: 'categoryId' });

  const { data: categoriesRes, isSuccess } = useQuery(
    getCrmArticleCategoriesOptions({ query: BLOG_CATEGORY_LIST_QUERY }),
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">カテゴリ</CardTitle>
        <RoleGatedButton
          type="button"
          allowedRoles={CATEGORY_MANAGER_ROLES}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-1"
          onClick={onManageCategories}
        >
          <Settings className="size-4" />
          カテゴリを管理
        </RoleGatedButton>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
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
        </div>
      </CardContent>
    </Card>
  );
}
