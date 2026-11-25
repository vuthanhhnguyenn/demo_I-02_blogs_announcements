'use client';

// Client component: react-hook-form controllers, radio / checkbox / combobox interaction.
import { type ReactNode, useMemo } from 'react';
import { type Control, useController, useFormState } from 'react-hook-form';

import {
  ANNOUNCEMENT_FORM_BRAND_OPTIONS,
  ANNOUNCEMENT_FORM_COMPANY_WARNING,
  ANNOUNCEMENT_FORM_NO_STORES_NOTE,
  ANNOUNCEMENT_FORM_SCOPE_COMPANY_NOTE,
  ANNOUNCEMENT_FORM_SCOPE_OPTIONS,
  ANNOUNCEMENT_FORM_TARGET_LOCKED_NOTE,
} from '@/app/(private)/announcements/_constants/announcement-form.constants';
import type {
  AnnouncementFormStore,
  AnnouncementFormValues,
} from '@/app/(private)/announcements/_schemas/announcement-form.schema';
import type { BlogBrandScope, BlogFormBrandId } from '@/app/(private)/blogs/_types/blog.type';
import { AlertTriangle, Globe, Smartphone, X } from 'lucide-react';

import { FormField } from '@/components/common/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface AnnouncementTargetSectionProps {
  control: Control<AnnouncementFormValues>;
  /** 全社配信 / ブランド指定 — Manager and above only (FR-008, Clarification Q1). */
  canUseWideScope: boolean;
  /** Stores the user may target (research F3). */
  storeOptions: readonly AnnouncementFormStore[];
  isStoresLoading: boolean;
  /** Edit: the loaded scope is Manager-only for this role — every control is read-only. */
  isLocked?: boolean;
  /** 対象（推計） card, rendered after the 全社配信 warning (prototype L441-L458). */
  reachCard?: ReactNode;
}

/** Card 「配信対象」 (prototype announcement-form.tsx L333-L480). */
export function AnnouncementTargetSection({
  control,
  canUseWideScope,
  storeOptions,
  isStoresLoading,
  isLocked = false,
  reachCard,
}: Readonly<AnnouncementTargetSectionProps>) {
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
            <p className="text-muted-foreground text-xs">{ANNOUNCEMENT_FORM_TARGET_LOCKED_NOTE}</p>
          )}
          <FormField label="配信範囲" required error={targetError}>
            <RadioGroup
              value={scope}
              onValueChange={(value) => {
                const option = ANNOUNCEMENT_FORM_SCOPE_OPTIONS.find((item) => item.value === value);
                if (option && !isScopeDisabled(option.value)) changeScope(option.value);
              }}
            >
              <div className="flex flex-col gap-3">
                {ANNOUNCEMENT_FORM_SCOPE_OPTIONS.map((option) => {
                  const id = `announcement-scope-${option.value}`;
                  const disabled = isScopeDisabled(option.value);
                  const selected = scope === option.value;
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        'rounded-lg border transition-colors',
                        selected && 'border-primary ring-primary ring-1',
                        disabled && 'cursor-not-allowed opacity-50',
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
                          <span className="text-muted-foreground ml-auto text-xs">
                            {ANNOUNCEMENT_FORM_SCOPE_COMPANY_NOTE}
                          </span>
                        )}
                      </div>

                      {selected && option.value === 'brand' && (
                        <div className="bg-muted/50 rounded-b-lg px-4 pt-3 pb-4">
                          <p className="text-muted-foreground mb-3 text-xs">
                            対象ブランドを選択（複数可）
                          </p>
                          <div
                            className="grid grid-cols-3 gap-4"
                            aria-invalid={!!errors.brands || undefined}
                          >
                            {ANNOUNCEMENT_FORM_BRAND_OPTIONS.map((brand) => {
                              const brandId = `announcement-brand-${brand.id}`;
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
                                  <Badge
                                    key={brandId}
                                    variant="secondary"
                                    className="gap-1 pr-1 text-xs"
                                  >
                                    {ANNOUNCEMENT_FORM_BRAND_OPTIONS.find(
                                      (brand) => brand.id === brandId,
                                    )?.label ?? brandId}
                                    {/* prototype L389-L396: each badge removes its brand */}
                                    <button
                                      type="button"
                                      disabled={disabled}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        brandsField.onChange(
                                          selectedBrands.filter((brand) => brand !== brandId),
                                        );
                                      }}
                                      className="hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5"
                                    >
                                      <X className="text-muted-foreground hover:text-foreground size-3" />
                                      <span className="sr-only">解除</span>
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selected && option.value === 'store' && (
                        <div className="bg-muted/50 rounded-b-lg px-4 pt-3 pb-4">
                          {hasNoStores ? (
                            <p className="text-muted-foreground text-xs">
                              {ANNOUNCEMENT_FORM_NO_STORES_NOTE}
                            </p>
                          ) : (
                            <Combobox
                              multiple
                              items={comboboxItems}
                              value={selectedStores}
                              onValueChange={(next: AnnouncementFormStore[]) =>
                                // Prefer the store master's entry (its brand) over a prefilled one.
                                storesField.onChange(
                                  next.map((store) => optionById.get(store.id) ?? store),
                                )
                              }
                              itemToStringLabel={(store: AnnouncementFormStore) => store.name}
                              isItemEqualToValue={(
                                a: AnnouncementFormStore,
                                b: AnnouncementFormStore,
                              ) => a.id === b.id}
                            >
                              <ComboboxChips
                                ref={storesAnchor}
                                className="bg-background max-w-[360px]"
                              >
                                <ComboboxValue>
                                  {(values: AnnouncementFormStore[]) => (
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
                                  {(store: AnnouncementFormStore) => (
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
              <AlertDescription className="text-muted-foreground text-xs">
                {ANNOUNCEMENT_FORM_COMPANY_WARNING}
              </AlertDescription>
            </Alert>
          )}

          {reachCard}

          <FormField label="掲載先" required error={channelError}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="announcement-dest-web"
                  checked={channelWebField.value}
                  disabled={isLocked}
                  onCheckedChange={(checked) => channelWebField.onChange(checked)}
                  aria-invalid={!!channelError}
                />
                <Label htmlFor="announcement-dest-web" className="flex items-center gap-2 text-sm">
                  <Globe className="text-muted-foreground size-4" />
                  WEBサイト
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="announcement-dest-app"
                  checked={channelAppField.value}
                  disabled={isLocked}
                  onCheckedChange={(checked) => channelAppField.onChange(checked)}
                  aria-invalid={!!channelError}
                />
                <Label htmlFor="announcement-dest-app" className="flex items-center gap-2 text-sm">
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
