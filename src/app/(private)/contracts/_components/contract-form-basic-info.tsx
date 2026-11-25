'use client';

import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useBrandAreas } from '@/app/(private)/area-master/_hooks/use-brand-areas';
import {
  areaBrandChangeNotice,
  toAreaBrandGroup,
} from '@/app/(private)/area-master/_utils/area-brand.util';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { ImageUpload } from '@/components/common/image-upload';
import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import {
  adminCorporateControllerListInfiniteOptions,
  adminPlanControllerDetailOptions,
  adminPlanControllerListInfiniteOptions,
  adminStoreControllerDetailOptions,
  adminStoreControllerListInfiniteOptions,
  adminTermsControllerDetailOptions,
  adminTermsControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  CorporatePickerItemDto,
  CorporatePickerListResponseDto,
  PlanListItemDto,
  PlanListResponseDto,
  StoreListResponseDto,
  StoreSummaryDto,
  TermsDocumentListResponseDto,
  TermsDocumentSummaryDto,
} from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  MAIN_CONTRACT_TYPE_LABELS,
  PLAN_BRAND_LABELS,
  PLAN_OTHER_STORE_AVAILABLE_LABELS,
  type PlanBrandEnum,
  type PlanContractType,
  defaultMinAgeForBrand,
  enrollmentFeeFieldsForBrand,
} from '../_constants/constants';
import { type ContractFormValues, TEXT_AREA_MAX_LENGTH } from '../_schemas/contract-form.schema';

const SELECT_PAGE_SIZE = 20;
// The Y-04 terms list only accepts a limit of 25 / 50 / 100 / 200.
const TERMS_PAGE_SIZE = 25;

interface ContractFormBasicInfoProps {
  /** 主契約ID of the master being edited; blank while creating or duplicating (auto-numbered). */
  planCode?: string;
  /** Own id when editing — kept out of the 親主契約 options so a master cannot parent itself. */
  planId?: string;
  /** Own id is only known while editing; also gates the 親主契約 picker's self-exclusion. */
  isEdit?: boolean;
  /**
   * `brandEnum` / `parentPlanId` cannot be sent on 編集 (400 E-VAL-001, qa-186 §3) nor through the
   * 複製 endpoint's `overrides`, so both screens render them read-only instead of letting the
   * operator change something the save will silently drop.
   */
  areImmutablesLocked?: boolean;
  /** 子主契約作成 (G-01 FR-M007): the locked 親主契約 is the source master, not its parent. */
  isChildCreate?: boolean;
  /**
   * 企業名 of the master being edited. The corporate picker has no by-id lookup, and its list is
   * only fetched once the popover opens, so the label of a stored 企業 comes from the plan detail.
   */
  corporateName?: string | null;
  /** A JOYFIT ⇄ FIT365 brand change dropped the 利用できるエリア — the notice step 2 shows. */
  onAreasDropped?: (notice: string) => void;
  /** Renderable preview per サムネイル `s3Key`; owned by the stepper so it survives step changes. */
  thumbnailPreviews: Readonly<Record<string, string>>;
  /** Uploads a サムネイル and resolves to its `s3Key` (see `usePlanThumbnailUpload`). */
  uploadThumbnail: (file: File) => Promise<string | null>;
  /** Reports the upload's start / end so the stepper can hold navigation and saving meanwhile. */
  onThumbnailUploadingChange?: (uploading: boolean) => void;
}

function formatTermsLabel(
  terms: { title: string; version: string } | null | undefined,
): string | undefined {
  return terms ? `${terms.title}（${terms.version}）` : undefined;
}

/**
 * Browsers do not enforce `maxLength` while an IME composition is open, so committed text can
 * exceed the limit (G-01 bug No16). Clamp on commit and push the result into the form, so the
 * field never keeps more than `TEXT_AREA_MAX_LENGTH` whatever the browser/IME does on commit.
 */
function clampOnCompositionEnd(onChange: (value: string) => void) {
  return (event: React.CompositionEvent<HTMLTextAreaElement>) =>
    onChange(event.currentTarget.value.slice(0, TEXT_AREA_MAX_LENGTH));
}

export function ContractFormBasicInfo({
  planCode,
  planId,
  isEdit = false,
  areImmutablesLocked = false,
  isChildCreate = false,
  corporateName,
  thumbnailPreviews,
  uploadThumbnail,
  onThumbnailUploadingChange,
  onAreasDropped,
}: Readonly<ContractFormBasicInfoProps>) {
  const form = useFormContext<ContractFormValues>();
  const contractType = form.watch('contractType');
  const isSpecialContract = contractType === 'special';
  const isCorporateContract = contractType === 'corporate';
  const storeId = form.watch('storeId');
  const brandEnum = form.watch('brandEnum');
  const { areas: brandAreas } = useBrandAreas(toAreaBrandGroup(brandEnum));
  const parentPlanId = form.watch('parentPlanId');
  const termsId = form.watch('termsId');
  const corporateId = form.watch('corporateId');
  const otherStoreAvailable = form.watch('otherStoreAvailable');
  // 説明 is titled by its card rather than a FormLabel, so it mirrors the label error colour itself.
  const hasDescriptionError = !!form.formState.errors.description;

  // ---- 店舗 (store) — only selectable for 特殊契約 ----
  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const {
    data: storesData,
    isFetching: isStoresFetching,
    fetchNextPage: fetchNextStores,
    hasNextPage: hasMoreStores,
    isFetchingNextPage: isFetchingMoreStores,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: SELECT_PAGE_SIZE,
        keyword: storeSearchQuery || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: isSpecialContract && isStorePopoverOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  const stores = useMemo(
    () => storesData?.pages.flatMap((page) => page.items ?? []) ?? [],
    [storesData],
  );
  const selectedStoreFromOptions = storeId
    ? stores.find((store) => store.id === storeId)
    : undefined;
  const { data: selectedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeId ?? '' } }),
    enabled: !!storeId && !selectedStoreFromOptions,
  });

  // ---- 親主契約 (parent master) — G-01 FR-M002: optional, set when creating a derived master ----
  const [isParentPopoverOpen, setIsParentPopoverOpen] = useState(false);
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const {
    data: parentPlansData,
    isFetching: isParentPlansFetching,
    fetchNextPage: fetchNextParentPlans,
    hasNextPage: hasMoreParentPlans,
    isFetchingNextPage: isFetchingMoreParentPlans,
  } = useInfiniteQuery({
    ...adminPlanControllerListInfiniteOptions({
      // API-087 rejects a parent of another brand (400 E-VAL-001), so only same-brand masters
      // are offered.
      query: {
        limit: SELECT_PAGE_SIZE,
        brandEnum,
        nameQuery: parentSearchQuery || undefined,
      },
    }),
    enabled: !areImmutablesLocked && !!brandEnum && isParentPopoverOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: PlanListResponseDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  const parentPlanOptions = useMemo(
    () =>
      (parentPlansData?.pages.flatMap((page) => page.items ?? []) ?? []).filter(
        (candidate) => candidate.planId !== planId,
      ),
    [parentPlansData, planId],
  );
  const selectedParentFromOptions = parentPlanId
    ? parentPlanOptions.find((candidate) => candidate.planId === parentPlanId)
    : undefined;
  const { data: selectedParentPlan } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: parentPlanId ?? '' } }),
    enabled: !!parentPlanId && !selectedParentFromOptions,
  });
  const selectedParentLabel = parentPlanId
    ? (selectedParentFromOptions?.name ?? selectedParentPlan?.name ?? parentPlanId)
    : undefined;

  // ---- 規約 (terms) — linked by picking from the Y-04 terms master ----
  const [isTermsPopoverOpen, setIsTermsPopoverOpen] = useState(false);
  const [termsSearchQuery, setTermsSearchQuery] = useState('');
  const {
    data: termsData,
    isFetching: isTermsFetching,
    fetchNextPage: fetchNextTerms,
    hasNextPage: hasMoreTerms,
    isFetchingNextPage: isFetchingMoreTerms,
  } = useInfiniteQuery({
    ...adminTermsControllerListInfiniteOptions({
      query: { limit: TERMS_PAGE_SIZE, title: termsSearchQuery || undefined },
    }),
    enabled: isTermsPopoverOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: TermsDocumentListResponseDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  // Ended terms are not offered for a new link; an existing link still resolves its label below.
  const termsOptions = useMemo(
    () =>
      (termsData?.pages.flatMap((page) => page.items ?? []) ?? []).filter(
        (item) => !item.isDeleted && item.status !== 'ended',
      ),
    [termsData],
  );
  const selectedTermsFromOptions = termsId
    ? termsOptions.find((item) => item.id === termsId)
    : undefined;
  const { data: selectedTerms } = useQuery({
    ...adminTermsControllerDetailOptions({ path: { id: termsId ?? '' } }),
    enabled: !!termsId && !selectedTermsFromOptions,
  });
  const selectedTermsLabel = termsId
    ? (formatTermsLabel(selectedTermsFromOptions ?? selectedTerms) ?? termsId)
    : undefined;

  // ---- 企業 (corporate) — only for 法人会員 (client answer 2026-08-24, qa-185 §5) ----
  const [isCorporatePopoverOpen, setIsCorporatePopoverOpen] = useState(false);
  const [corporateSearchQuery, setCorporateSearchQuery] = useState('');
  const {
    data: corporatesData,
    isFetching: isCorporatesFetching,
    fetchNextPage: fetchNextCorporates,
    hasNextPage: hasMoreCorporates,
    isFetchingNextPage: isFetchingMoreCorporates,
  } = useInfiniteQuery({
    ...adminCorporateControllerListInfiniteOptions({
      query: { limit: SELECT_PAGE_SIZE, q: corporateSearchQuery || undefined },
    }),
    enabled: isCorporateContract && isCorporatePopoverOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: CorporatePickerListResponseDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  const corporateOptions = useMemo(
    () => corporatesData?.pages.flatMap((page) => page.items ?? []) ?? [],
    [corporatesData],
  );
  const selectedCorporateLabel = corporateId
    ? (corporateOptions.find((item) => item.corporateId === corporateId)?.name ??
      corporateName ??
      corporateId)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 items-start gap-6 px-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  主契約名<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="例: レギュラー会員" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* G-01 FR-M002: 主契約ID is auto-numbered and never typed in by hand. */}
          <div className="flex flex-col gap-2">
            <Label>主契約ID</Label>
            <Input
              value={planCode ?? '保存後に自動採番されます'}
              className="text-muted-foreground font-mono"
              disabled
              readOnly
            />
            <p className="text-muted-foreground text-xs">主契約IDはシステムが自動で採番します</p>
          </div>

          <FormField
            control={form.control}
            name="contractType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  契約タイプ<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  key={`contractType-${field.value ?? 'empty'}`}
                  value={field.value ?? undefined}
                  onValueChange={(value: PlanContractType | null) => {
                    if (!value) return;
                    field.onChange(value);
                    // 店舗 is 特殊契約-only (API-087 E-PLN-007) and 企業 is 法人会員-only.
                    if (value !== 'special') {
                      form.setValue('storeId', null, { shouldValidate: true });
                    }
                    if (value !== 'corporate') {
                      form.setValue('corporateId', null, { shouldValidate: true });
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="契約タイプを選択">
                        {field.value ? MAIN_CONTRACT_TYPE_LABELS[field.value] : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(MAIN_CONTRACT_TYPE_LABELS) as PlanContractType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {MAIN_CONTRACT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* G-01 FR-M002: 店舗 is only set when the contract type is 特殊契約. */}
          <FormField
            control={form.control}
            name="storeId"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  店舗
                  {isSpecialContract && <span className="text-destructive ml-0.5">*</span>}
                </FormLabel>
                <FormControl>
                  <SearchableSelect<StoreSummaryDto>
                    value={field.value ?? null}
                    valueLabel={selectedStoreFromOptions?.name ?? selectedStore?.name ?? undefined}
                    options={stores}
                    disabled={!isSpecialContract}
                    placeholder={isSpecialContract ? '店舗を選択' : '特殊契約時のみ入力'}
                    searchPlaceholder="店舗名・店舗コードで検索..."
                    emptyMessage="該当する店舗がありません"
                    loadingMessage="店舗を読み込み中..."
                    open={isStorePopoverOpen}
                    onOpenChange={setIsStorePopoverOpen}
                    onSearchChange={setStoreSearchQuery}
                    onSelect={(store) => field.onChange(store?.id ?? null)}
                    getOptionKey={(store) => store.id}
                    getOptionLabel={(store) => store.name}
                    getOptionKeywords={(store) =>
                      [store.name, store.code, store.id].filter(Boolean).join(' ')
                    }
                    renderOption={(store) => (
                      <div className="flex min-w-0 flex-col items-start gap-0.5">
                        <TextWithTooltip
                          text={store.name}
                          wrapperClassName="w-full"
                          className="w-full"
                          side="right"
                          align="center"
                        />
                      </div>
                    )}
                    isLoading={isStoresFetching}
                    hasMore={hasMoreStores}
                    isLoadingMore={isFetchingMoreStores}
                    onLoadMore={fetchNextStores}
                    loadingMoreMessage="読み込み中..."
                    // Puts aria-invalid on the trigger so useScrollToFirstError can reach
                    // this field when 特殊契約 is chosen without a store.
                    hasError={!!fieldState.error}
                    triggerClassName="w-full justify-between font-normal"
                  />
                </FormControl>
                {!isSpecialContract && (
                  <p className="text-muted-foreground text-xs">
                    契約タイプが「特殊契約」の場合のみ入力できます
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="otherStoreAvailable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>他店舗利用可否</FormLabel>
                <Select
                  key={`otherStoreAvailable-${String(field.value ?? 'empty')}`}
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(value) => {
                    const available = value === 'true';
                    field.onChange(available);
                    // API-087 ignores 相互利用 when 他店舗利用 is 不可, so clear it rather than
                    // storing a flag that never applies.
                    if (!available) form.setValue('isMultiUsable', false);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください">
                        {field.value != null
                          ? PLAN_OTHER_STORE_AVAILABLE_LABELS[
                              String(field.value) as 'true' | 'false'
                            ]
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">可</SelectItem>
                    <SelectItem value="false">不可</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ブランド・属性</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 items-start gap-6 px-4">
          {/* API-087 rejects a brand change with 400 E-VAL-001, so show it read-only. */}
          {areImmutablesLocked ? (
            <div className="flex flex-col gap-2">
              <Label>ブランド</Label>
              <Input
                value={
                  form.getValues('brandEnum') ? PLAN_BRAND_LABELS[form.getValues('brandEnum')] : '―'
                }
                className="text-muted-foreground"
                disabled
                readOnly
              />
              <p className="text-muted-foreground text-xs">
                {isEdit
                  ? '登録後は変更できません'
                  : '複製元のブランドを引き継ぎます（変更が必要な場合は新規登録してください）'}
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="brandEnum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ブランド<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <Select
                    key={`brandEnum-${field.value ?? 'empty'}`}
                    value={field.value ?? undefined}
                    onValueChange={(value: PlanBrandEnum | null) => {
                      if (!value) return;
                      const previousBrand = field.value;
                      // 利用できるエリア are per brand group: JOYFIT ⇄ FIT365 drops them (prototype 11/12).
                      const areaNotice = areaBrandChangeNotice(
                        previousBrand,
                        value,
                        form.getValues('areaIds') ?? [],
                        brandAreas,
                      );
                      if (areaNotice) form.setValue('areaIds', [], { shouldDirty: true });
                      onAreasDropped?.(areaNotice ?? '');
                      field.onChange(value);
                      // G-01: follow the new brand's default 年齢下限 while the field is empty or
                      // still holds the previous brand's default.
                      const currentMinAge = form.getValues('minAge');
                      if (
                        currentMinAge == null ||
                        currentMinAge === defaultMinAgeForBrand(previousBrand)
                      ) {
                        form.setValue('minAge', defaultMinAgeForBrand(value));
                      }
                      // Y-07 FR-002: each brand owns its own 入会時費用 items — clear the other
                      // brand's two so a switched brand cannot carry stale amounts. `resetField`,
                      // not `setValue`: the brand change re-derives every dirty flag from the
                      // default values, which marks a step-2 prefilled fee dirty — that flag must
                      // go too, or step 2 never prefills the fee again on a switch back.
                      const keptFields = new Set(
                        (enrollmentFeeFieldsForBrand(value) ?? []).map((fee) => fee.name),
                      );
                      for (const name of [
                        'enrollmentFee',
                        'registrationFee',
                        'cardIssueFee',
                        'maintenanceFee',
                      ] as const) {
                        if (!keptFields.has(name)) form.resetField(name, { defaultValue: null });
                      }
                      // A parent must share the brand (API-087 400 E-VAL-001) — drop a parent
                      // picked under the previous brand.
                      if (value !== previousBrand && form.getValues('parentPlanId')) {
                        form.setValue('parentPlanId', null, { shouldDirty: true });
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ブランドを選択">
                          {field.value ? PLAN_BRAND_LABELS[field.value] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(PLAN_BRAND_LABELS) as PlanBrandEnum[]).map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {PLAN_BRAND_LABELS[brand]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* `parentPlanId` is immutable too (400 E-VAL-001). */}
          {areImmutablesLocked ? (
            <div className="flex flex-col gap-2">
              <Label>親主契約名</Label>
              <Input
                value={selectedParentLabel ?? 'なし（親主契約なし）'}
                className="text-muted-foreground"
                disabled
                readOnly
              />
              <p className="text-muted-foreground text-xs">
                {isEdit
                  ? '登録後は変更できません'
                  : isChildCreate
                    ? '元の主契約を親主契約に設定します'
                    : '複製元の親主契約を引き継ぎます'}
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="parentPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>親主契約名</FormLabel>
                  <FormControl>
                    <SearchableSelect<PlanListItemDto>
                      value={field.value ?? null}
                      valueLabel={selectedParentLabel}
                      options={parentPlanOptions}
                      placeholder="なし（親主契約なし）"
                      searchPlaceholder="主契約名で検索..."
                      emptyMessage="該当する主契約がありません"
                      loadingMessage="主契約を読み込み中..."
                      clearLabel="なし"
                      open={isParentPopoverOpen}
                      onOpenChange={setIsParentPopoverOpen}
                      onSearchChange={setParentSearchQuery}
                      onSelect={(parent) => field.onChange(parent?.planId ?? null)}
                      getOptionKey={(parent) => parent.planId}
                      getOptionLabel={(parent) => parent.name}
                      getOptionKeywords={(parent) =>
                        [parent.name, parent.planCode].filter(Boolean).join(' ')
                      }
                      renderOption={(parent) => (
                        <div className="flex min-w-0 flex-col items-start gap-0.5">
                          <TextWithTooltip
                            text={parent.name}
                            wrapperClassName="w-full"
                            className="w-full"
                            side="right"
                            align="center"
                          />
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {parent.planCode}
                          </span>
                        </div>
                      )}
                      isLoading={isParentPlansFetching}
                      hasMore={hasMoreParentPlans}
                      isLoadingMore={isFetchingMoreParentPlans}
                      onLoadMore={fetchNextParentPlans}
                      loadingMoreMessage="読み込み中..."
                      triggerClassName="w-full justify-between font-normal"
                      disabled={!brandEnum}
                    />
                  </FormControl>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {brandEnum
                      ? '子主契約を作成する場合に親主契約を指定します'
                      : '先にブランドを選択してください'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="legacyCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>旧コード</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: OLD-REG-001"
                    className="font-mono"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-xs">
                  参考情報として旧システムのコードを記録できます
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isMultiUsable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>相互利用あり</FormLabel>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="mutual-use"
                    checked={field.value}
                    disabled={!otherStoreAvailable}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="mutual-use" className="text-muted-foreground text-sm font-normal">
                    有効にする
                  </Label>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {otherStoreAvailable
                    ? 'JOYFIT: 主契約扱い / FIT365: オプション扱い'
                    : '他店舗利用が不可のときは設定できません'}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hasCompanionBenefit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>同伴特典</FormLabel>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="companion-benefit"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label
                    htmlFor="companion-benefit"
                    className="text-muted-foreground text-sm font-normal"
                  >
                    付与する
                  </Label>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  オンにすると当該プランの会員に同伴招待権限（1日1回・1名）が付与されます
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nameForMember"
            render={({ field }) => (
              <FormItem>
                <FormLabel>会員公開用主契約名</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: レギュラー会員（学生割引）"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={cn('text-base', hasDescriptionError && 'text-destructive')}>
            説明
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    maxLength={TEXT_AREA_MAX_LENGTH}
                    onCompositionEnd={clampOnCompositionEnd(field.onChange)}
                    placeholder="契約の説明を入力してください"
                    rows={4}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-right text-xs">
                  {(field.value ?? '').length}/{TEXT_AREA_MAX_LENGTH}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">会員公開設定</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 items-start gap-6 px-4">
          {/* 企業 is picked from the corporate master and only applies to 法人会員 (qa-185 §5). */}
          <FormField
            control={form.control}
            name="corporateId"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  企業
                  {isCorporateContract && <span className="text-destructive ml-0.5">*</span>}
                </FormLabel>
                <FormControl>
                  <SearchableSelect<CorporatePickerItemDto>
                    value={field.value ?? null}
                    valueLabel={selectedCorporateLabel}
                    options={corporateOptions}
                    disabled={!isCorporateContract}
                    placeholder={isCorporateContract ? '企業を選択' : '法人会員時のみ入力'}
                    searchPlaceholder="企業名で検索..."
                    emptyMessage="該当する企業がありません"
                    loadingMessage="企業を読み込み中..."
                    clearLabel="なし"
                    open={isCorporatePopoverOpen}
                    onOpenChange={setIsCorporatePopoverOpen}
                    onSearchChange={setCorporateSearchQuery}
                    onSelect={(corporate) => field.onChange(corporate?.corporateId ?? null)}
                    getOptionKey={(corporate) => corporate.corporateId}
                    getOptionLabel={(corporate) => corporate.name}
                    getOptionKeywords={(corporate) => corporate.name}
                    renderOption={(corporate) => (
                      <div className="flex min-w-0 flex-col items-start gap-0.5">
                        <TextWithTooltip
                          text={corporate.name}
                          wrapperClassName="w-full"
                          className="w-full"
                          side="right"
                          align="center"
                        />
                      </div>
                    )}
                    isLoading={isCorporatesFetching}
                    hasMore={hasMoreCorporates}
                    isLoadingMore={isFetchingMoreCorporates}
                    onLoadMore={fetchNextCorporates}
                    loadingMoreMessage="読み込み中..."
                    hasError={!!fieldState.error}
                    triggerClassName="w-full justify-between font-normal"
                  />
                </FormControl>
                {!isCorporateContract && (
                  <p className="text-muted-foreground text-xs">
                    契約タイプが「法人会員」の場合のみ入力できます
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="termsId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>規約</FormLabel>
                <FormControl>
                  <SearchableSelect<TermsDocumentSummaryDto>
                    value={field.value ?? null}
                    valueLabel={selectedTermsLabel}
                    options={termsOptions}
                    placeholder="規約文書を選択"
                    searchPlaceholder="規約名で検索..."
                    emptyMessage="該当する規約がありません"
                    loadingMessage="規約を読み込み中..."
                    clearLabel="なし"
                    open={isTermsPopoverOpen}
                    onOpenChange={setIsTermsPopoverOpen}
                    onSearchChange={setTermsSearchQuery}
                    onSelect={(terms) => field.onChange(terms?.id ?? null)}
                    getOptionKey={(terms) => terms.id}
                    getOptionLabel={(terms) => formatTermsLabel(terms) ?? terms.id}
                    getOptionKeywords={(terms) => [terms.title, terms.id].filter(Boolean).join(' ')}
                    renderOption={(terms) => (
                      <div className="flex min-w-0 flex-col items-start gap-0.5">
                        <TextWithTooltip
                          text={formatTermsLabel(terms) ?? terms.id}
                          wrapperClassName="w-full"
                          className="w-full"
                          side="right"
                          align="center"
                        />
                        <span className="text-muted-foreground text-[10px]">
                          {terms.brandEnum
                            ? (PLAN_BRAND_LABELS[terms.brandEnum as PlanBrandEnum] ??
                              terms.brandEnum)
                            : '全ブランド共通'}
                          {' ／ '}適用開始 {terms.effectiveFrom}
                        </span>
                      </div>
                    )}
                    isLoading={isTermsFetching}
                    hasMore={hasMoreTerms}
                    isLoadingMore={isFetchingMoreTerms}
                    onLoadMore={fetchNextTerms}
                    loadingMoreMessage="読み込み中..."
                    triggerClassName="w-full justify-between font-normal"
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-xs">
                  規約文書管理マスタに登録済みの規約から選択します
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="thumbnailS3Key"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>サムネイル画像</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value ?? null}
                    previewSrc={field.value ? (thumbnailPreviews[field.value] ?? null) : null}
                    onChange={field.onChange}
                    upload={uploadThumbnail}
                    onUploadingChange={onThumbnailUploadingChange}
                    hint="会員アプリに表示される画像です。PNG, JPG (最大5MB)"
                    placeholder={{
                      title: 'サムネイル画像をアップロード',
                      detail: 'JPG・PNG / 最大5MB',
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="publicDescription"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>説明文</FormLabel>
                <FormControl>
                  <Textarea
                    maxLength={TEXT_AREA_MAX_LENGTH}
                    onCompositionEnd={clampOnCompositionEnd(field.onChange)}
                    placeholder="会員向けに公開する主契約の詳細説明を入力してください"
                    rows={3}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-right text-xs">
                  {(field.value ?? '').length}/{TEXT_AREA_MAX_LENGTH}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>備考</FormLabel>
                <FormControl>
                  <Textarea
                    maxLength={TEXT_AREA_MAX_LENGTH}
                    onCompositionEnd={clampOnCompositionEnd(field.onChange)}
                    placeholder="備考を入力してください"
                    rows={3}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-right text-xs">
                  {(field.value ?? '').length}/{TEXT_AREA_MAX_LENGTH}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
