'use client';

// Client component: react-hook-form controllers, radio / checkbox / combobox interaction.
import { useMemo } from 'react';
import { type Control, useController, useFormState } from 'react-hook-form';

import { AlertTriangle, Globe, Smartphone } from 'lucide-react';

import { FormField } from '@/components/common/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { cn } from '@/lib/utils';

import {
  BLOG_FORM_BRAND_OPTIONS,
  BLOG_FORM_COMPANY_WARNING,
  BLOG_FORM_NO_STORES_NOTE,
  BLOG_FORM_SCOPE_COMPANY_NOTE,
  BLOG_FORM_SCOPE_OPTIONS,
  BLOG_FORM_TARGET_LOCKED_NOTE,
} from '../../../_constants/blog.constants';
import type { BlogFormStore, BlogFormValues } from '../../../_schemas/blog-form.schema';
import type { BlogBrandScope, BlogFormBrandId } from '../../../_types/blog.type';

const JOYFIT_SUB_BRAND_IDS: readonly BlogFormBrandId[] = [
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
];

/** JOYFIT全体 and the JOYFIT sub-brands clear each other (FR-009, prototype L195-L204). */
function toggleBrand(selected: BlogFormBrandId[], id: BlogFormBrandId): BlogFormBrandId[] {
  if (selected.includes(id)) return selected.filter((brand) => brand !== id);
  if (id === 'joyfitAll') {
    return [...selected.filter((brand) => !JOYFIT_SUB_BRAND_IDS.includes(brand)), id];
  }
  if (JOYFIT_SUB_BRAND_IDS.includes(id)) {
    return [...selected.filter((brand) => brand !== 'joyfitAll'), id];
  }
  return [...selected, id];
}

interface BlogTargetSectionProps {
  control: Control<BlogFormValues>;
  /** 全社配信 / ブランド指定 — Manager and above only (FR-008, Clarification Q1). */
  canUseWideScope: boolean;
  /** Stores the user may target (research F3). */
  storeOptions: readonly BlogFormStore[];
  isStoresLoading: boolean;
  /** Edit: the loaded scope is Manager-only for this role — every control is read-only. */
  isLocked?: boolean;
}

/** Card 「配信対象」 (prototype blog-form.tsx L360-L486). */
export function BlogTargetSection({
  control,
  canUseWideScope,
  storeOptions,
  isStoresLoading,
  isLocked = false,
}: Readonly<BlogTargetSectionProps>) {
  const { errors } = useFormState({ control, name: ['brands', 'stores', 'channelWeb'] });
  const { field: scopeField } = useController({ control, name: 'scope' });
  const { field: brandsField } = useController({ control, name: 'brands' });
  const { field: storesField } = useController({ control, name: 'stores' });
  const { field: channelWebField } = useController({ control, name: 'channelWeb' });
  const { field: channelAppField } = useController({ control, name: 'channelApp' });

  const scope = scopeField.value;
  const selectedBrands = brandsField.value;
  const selectedStores = storesField.value;
  const targetError = errors.brands?.message ?? errors.stores?.message;
  const channelError = errors.channelWeb?.message;
  const storesAnchor = useComboboxAnchor();

  const optionById = useMemo(
    () => new Map(storeOptions.map((store) => [store.id, store])),
    [storeOptions],
  );
  // Selected stores stay listed (and removable) even when outside the loaded options.
  const comboboxItems = useMemo(
    () => [...storeOptions, ...selectedStores.filter((store) => !optionById.has(store.id))],
    [storeOptions, selectedStores, optionById],
  );

  // FR-007: switching scope clears the brand / store selection.
  const changeScope = (next: BlogBrandScope) => {
    if (next === scope) return;
    scopeField.onChange(next);
    brandsField.onChange([]);
    storesField.onChange([]);
  };

  const isScopeRoleDisabled = (value: BlogBrandScope) => value !== 'store' && !canUseWideScope;
  const isScopeDisabled = (value: BlogBrandScope) => isLocked || isScopeRoleDisabled(value);
  const hasNoStores = !isStoresLoading && storeOptions.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">配信対象</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          {isLocked && (
            <p className="text-muted-foreground text-xs">{BLOG_FORM_TARGET_LOCKED_NOTE}</p>
          )}
          <FormField label="配信範囲" required error={targetError}>
            <RadioGroup
              value={scope}
              onValueChange={(value) => {
                const option = BLOG_FORM_SCOPE_OPTIONS.find((item) => item.value === value);
                if (option && !isScopeDisabled(option.value)) changeScope(option.value);
              }}
            >
              <div className="flex flex-col gap-3">
                {BLOG_FORM_SCOPE_OPTIONS.map((option) => {
                  const id = `blog-scope-${option.value}`;
                  const disabled = isScopeDisabled(option.value);
                  const selected = scope === option.value;
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        'rounded-lg border transition-colors',
                        selected && 'border-primary ring-primary ring-1',
                        disabled && 'opacity-60',
                      )}
                    >
                      {/* Row click mirrors the radio (prototype); the radio stays the keyboard target. */}
                      <div
                        role="presentation"
                        className={cn('flex items-center gap-3 p-4', !disabled && 'cursor-pointer')}
                        onClick={disabled ? undefined : () => changeScope(option.value)}
                      >
                        <RadioGroupItem value={option.value} id={id} disabled={disabled} />
                        <Label
                          htmlFor={id}
                          className={cn('text-sm font-medium', !disabled && 'cursor-pointer')}
                        >
                          {option.label}
                        </Label>
                        <span className="text-muted-foreground text-xs">{option.description}</span>
                        {isScopeRoleDisabled(option.value) && (
                          <span className="text-muted-foreground text-xs">
                            {BLOG_FORM_SCOPE_COMPANY_NOTE}
                          </span>
                        )}
                      </div>

                      {selected && option.value === 'brand' && (
                        <div className="bg-muted/30 rounded-b-lg px-4 pt-3 pb-4">
                          <p className="text-muted-foreground mb-3 text-xs">
                            対象ブランドを選択（複数可）
                          </p>
                          <div
                            className="grid grid-cols-3 gap-4"
                            aria-invalid={!!errors.brands || undefined}
                          >
                            {BLOG_FORM_BRAND_OPTIONS.map((brand) => {
                              const brandId = `blog-brand-${brand.id}`;
                              return (
                                <div key={brand.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={brandId}
                                    checked={selectedBrands.includes(brand.id)}
                                    disabled={disabled}
                                    onCheckedChange={() =>
                                      brandsField.onChange(toggleBrand(selectedBrands, brand.id))
                                    }
                                    aria-invalid={!!errors.brands}
                                  />
                                  <Label
                                    htmlFor={brandId}
                                    className={cn('text-sm', !disabled && 'cursor-pointer')}
                                  >
                                    {brand.label}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                          {selectedBrands.length > 0 && (
                            <div className="bg-muted mt-4 rounded-md p-3">
                              <p className="text-muted-foreground mb-2 text-xs">
                                {selectedBrands.length} ブランド選択中
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {selectedBrands.map((brandId) => (
                                  <Badge key={brandId} variant="secondary" className="text-xs">
                                    {BLOG_FORM_BRAND_OPTIONS.find((brand) => brand.id === brandId)
                                      ?.label ?? brandId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selected && option.value === 'store' && (
                        <div className="bg-muted/30 rounded-b-lg px-4 pt-3 pb-4">
                          {hasNoStores ? (
                            <p className="text-muted-foreground text-xs">
                              {BLOG_FORM_NO_STORES_NOTE}
                            </p>
                          ) : (
                            <Combobox
                              multiple
                              items={comboboxItems}
                              value={selectedStores}
                              onValueChange={(next: BlogFormStore[]) =>
                                // Prefer the store master's entry (its brand) over a prefilled one.
                                storesField.onChange(
                                  next.map((store) => optionById.get(store.id) ?? store),
                                )
                              }
                              itemToStringLabel={(store: BlogFormStore) => store.name}
                              isItemEqualToValue={(a: BlogFormStore, b: BlogFormStore) =>
                                a.id === b.id
                              }
                            >
                              <ComboboxChips
                                ref={storesAnchor}
                                className="bg-background max-w-[360px]"
                              >
                                <ComboboxValue>
                                  {(values: BlogFormStore[]) => (
                                    <>
                                      {values.map((store) => (
                                        <ComboboxChip key={store.id}>{store.name}</ComboboxChip>
                                      ))}
                                      <ComboboxChipsInput
                                        placeholder={
                                          values.length === 0 ? '対象店舗を選択...' : undefined
                                        }
                                        aria-invalid={!!errors.stores}
                                        onBlur={storesField.onBlur}
                                      />
                                    </>
                                  )}
                                </ComboboxValue>
                              </ComboboxChips>
                              <ComboboxContent anchor={storesAnchor}>
                                <ComboboxEmpty>
                                  {isStoresLoading ? '読み込み中...' : '該当する店舗がありません'}
                                </ComboboxEmpty>
                                <ComboboxList>
                                  {(store: BlogFormStore) => (
                                    <ComboboxItem key={store.id} value={store}>
                                      {store.name}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </FormField>

          {scope === 'company' && (
            <Alert className="border-warning/50 bg-warning/15">
              <AlertTriangle className="text-warning size-4" />
              <AlertTitle className="text-sm font-medium">
                {BLOG_FORM_COMPANY_WARNING.title}
              </AlertTitle>
              <AlertDescription className="text-muted-foreground text-xs">
                {BLOG_FORM_COMPANY_WARNING.description}
              </AlertDescription>
            </Alert>
          )}

          <FormField label="掲載先" required error={channelError}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="blog-dest-web"
                  checked={channelWebField.value}
                  disabled={isLocked}
                  onCheckedChange={(checked) => channelWebField.onChange(checked)}
                  aria-invalid={!!channelError}
                />
                <Label htmlFor="blog-dest-web" className="flex items-center gap-2 text-sm">
                  <Globe className="text-muted-foreground size-4" />
                  WEBサイト
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="blog-dest-app"
                  checked={channelAppField.value}
                  disabled={isLocked}
                  onCheckedChange={(checked) => channelAppField.onChange(checked)}
                  aria-invalid={!!channelError}
                />
                <Label htmlFor="blog-dest-app" className="flex items-center gap-2 text-sm">
                  <Smartphone className="text-muted-foreground size-4" />
                  モバイルアプリ
                </Label>
              </div>
            </div>
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
