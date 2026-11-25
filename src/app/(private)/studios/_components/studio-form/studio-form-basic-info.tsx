'use client';

import { useFormContext } from 'react-hook-form';

import { useCurrentStore } from '@/contexts/current-store.context';

import { StoreSelectInput } from '@/components/common/data-select-input';
import { WholeNumberInput } from '@/components/common/whole-number-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { StudioFormValues } from '../studio-form.schema';

function RequiredMark() {
  return <span className="text-destructive ml-0.5">*</span>;
}

const STUDIO_TYPE_LABELS: Record<string, string> = {
  'studio-lesson': 'スタジオレッスン用',
  pt: 'PT用',
  'body-care': 'ボディケア用',
};

interface StudioFormBasicInfoProps {
  /** Edit: a studio cannot move to another store (API-110 §6.2 #1) */
  storeLocked?: boolean;
  /** Edit: the saved store's name, shown whatever the picker has loaded */
  storeName?: string;
}

export function StudioFormBasicInfo({ storeLocked = false, storeName }: StudioFormBasicInfoProps) {
  const form = useFormContext<StudioFormValues>();

  // Same as the schedule form: HQ / system pick any store of the master through the shared
  // `StoreSelectInput` (searched on the server, read more on scroll); scoped roles pick from the
  // header's allowed stores (a studio outside them is 403 E-STD-100).
  const { restrictedStores, canSelectAllStores } = useCurrentStore();

  return (
    <>
      <h2 className="mb-4 text-base font-bold">基本情報</h2>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="storeId"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                店舗名
                <RequiredMark />
              </FormLabel>
              {canSelectAllStores ? (
                <StoreSelectInput
                  value={field.value || null}
                  valueLabel={storeName}
                  onChange={(store) => field.onChange(store?.id ?? '')}
                  placeholder="選択してください"
                  clearLabel={null}
                  disabled={storeLocked}
                  hasError={!!fieldState.error}
                  triggerClassName="h-10 w-full text-sm"
                />
              ) : (
                <Select value={field.value} onValueChange={field.onChange} disabled={storeLocked}>
                  <FormControl>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="選択してください">
                        {field.value
                          ? (restrictedStores.find((store) => store.id === field.value)?.name ??
                            storeName)
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {restrictedStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                スタジオ名
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input placeholder="スタジオ名を入力" className="h-10 text-sm" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="studioType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                スタジオ区分
                <RequiredMark />
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="選択してください">
                      {field.value ? STUDIO_TYPE_LABELS[field.value] : undefined}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="studio-lesson">スタジオレッスン用</SelectItem>
                  <SelectItem value="pt">PT用</SelectItem>
                  <SelectItem value="body-care">ボディケア用</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="operatingHours"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                利用可能時間
                <RequiredMark />
              </FormLabel>
              {/* One field, two inputs: FormControl (the label's target) sits on the start, and
                  the end is marked invalid by hand so both outline red */}
              <div className="flex items-center gap-3">
                <FormControl>
                  <Input
                    className="h-10 w-auto text-sm"
                    type="time"
                    value={field.value ? (field.value.split('~')[0] ?? '') : ''}
                    onChange={(e) => {
                      const end = field.value ? (field.value.split('~')[1] ?? '') : '';
                      field.onChange(e.target.value ? `${e.target.value}~${end}` : '');
                    }}
                  />
                </FormControl>
                <span className="text-muted-foreground">〜</span>
                <Input
                  className="h-10 w-auto text-sm"
                  type="time"
                  aria-invalid={fieldState.invalid}
                  value={field.value ? (field.value.split('~')[1] ?? '') : ''}
                  onChange={(e) => {
                    const start = field.value ? (field.value.split('~')[0] ?? '') : '';
                    field.onChange(e.target.value ? `${start}~${e.target.value}` : '');
                  }}
                />
              </div>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                物理定員
                <RequiredMark />
              </FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <WholeNumberInput
                    className="h-10 w-32 text-sm"
                    placeholder="物理定員"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <span className="text-muted-foreground text-sm">名</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                消防法・安全面に基づくスタジオの物理的な収容上限
              </p>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bufferValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                バッファ値
                <RequiredMark />
              </FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <WholeNumberInput
                    className="h-10 w-32 text-sm"
                    placeholder="0"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <span className="text-muted-foreground text-sm">名</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                物理定員を超えて受け入れ可能な追加人数（見学者・体験者等を想定）
              </p>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
