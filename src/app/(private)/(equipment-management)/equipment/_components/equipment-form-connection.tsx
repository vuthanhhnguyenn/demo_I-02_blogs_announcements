'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { RequiredMark } from '@/components/common/field-marker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { adminAreaControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import {
  EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS,
  type EquipmentMainContractType,
  getSelectableMainContractTypes,
} from '../_constants/constants';
import { useOutputPortOptions } from '../_hooks/use-output-port-options';
import { fetchStoreBrandGroup } from '../_hooks/use-store-brand-group';
import { type EquipmentFormValues, isAreaDoor } from '../_schemas/equipment-form.schema';
import { ControllerPicker } from './controller-picker';

type EquipmentFormConnectionProps = {
  storeId?: string;
  /** Edit mode: the device's own port is not counted as taken. */
  equipmentId?: string;
  /** エリア扉: the picked area was dropped because the new controller's store is another brand. */
  onAreaCleared?: () => void;
};

export function EquipmentFormConnection({
  storeId,
  equipmentId,
  onAreaCleared,
}: EquipmentFormConnectionProps) {
  const form = useFormContext<EquipmentFormValues>();
  const [controllerId, authMethod] = useWatch({
    control: form.control,
    name: ['controller_id', 'authentication_method'],
  });
  const { options: portOptions, isLoading: isPortsLoading } = useOutputPortOptions(
    controllerId,
    equipmentId,
  );
  // API-103: なし devices have no relay output (`outputPort` must be null).
  const isPortApplicable = authMethod !== 'none';

  const queryClient = useQueryClient();
  const [pendingChange, setPendingChange] = useState<PendingControllerChange | null>(null);

  const applyControllerChange = (
    nextControllerId: string,
    removedTypes: readonly EquipmentMainContractType[],
  ) => {
    form.setValue('controller_id', nextControllerId, { shouldDirty: true, shouldValidate: true });
    // Ports are per controller: a port picked on the previous one means nothing.
    form.setValue('output_port', '', { shouldDirty: true });
    if (removedTypes.length > 0) {
      const types = form.getValues('usage_control_rule.main_contract_types');
      form.setValue(
        'usage_control_rule.main_contract_types',
        types.filter((type) => !removedTypes.includes(type)),
        { shouldDirty: true },
      );
    }
  };

  /**
   * The device's store — and so its brand — follows the controller. A FIT365 store cannot pick the
   * JOYFIT-only 主契約タイプ (prototype 11/7): when the new store drops ticked types that are in
   * force (主契約判定 ON + タイプを指定), confirm first; otherwise (全て / 判定しない) drop them silently.
   */
  const handleControllerChange = async (nextControllerId: string, storeId?: string) => {
    const brandGroup = storeId ? await fetchStoreBrandGroup(queryClient, storeId) : null;
    // エリア扉 (prototype 11/12): the areas are the store brand's; an area of the previous brand is
    // dropped (re-pointing within the same brand keeps it). With the brand unknown the pick is kept
    // and the API judges it on save.
    const areaId = form.getValues('area_id');
    if (isAreaDoor(form.getValues('equipment_type')) && areaId && brandGroup) {
      try {
        const area = await queryClient.fetchQuery(
          adminAreaControllerDetailOptions({ path: { areaId } }),
        );
        if (area.brandGroup !== brandGroup) {
          form.setValue('area_id', '', { shouldDirty: true });
          onAreaCleared?.();
        }
      } catch (error) {
        toast.error(resolveApiErrorMessage(error));
        return;
      }
    }
    const selectable = getSelectableMainContractTypes(brandGroup);
    const rule = form.getValues('usage_control_rule');
    const removedTypes = rule.main_contract_types.filter((type) => !selectable.includes(type));
    if (removedTypes.length > 0 && rule.main_enabled && rule.main_scope === 'specified') {
      setPendingChange({
        controllerId: nextControllerId,
        removedTypes,
        clearsAll: removedTypes.length === rule.main_contract_types.length,
      });
      return;
    }
    applyControllerChange(nextControllerId, removedTypes);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">接続情報</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="controller_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    接続先接点制御装置
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <ControllerPicker
                      value={field.value || null}
                      onChange={(nextControllerId, controller) => {
                        void handleControllerChange(nextControllerId ?? '', controller?.storeId);
                      }}
                      hasError={Boolean(fieldState.error)}
                      storeId={storeId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="output_port"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    出力ポート
                    {isPortApplicable ? <RequiredMark /> : null}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!isPortApplicable || !controllerId || isPortsLoading}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={Boolean(fieldState.error)}
                        onBlur={field.onBlur}
                      >
                        <SelectValue
                          placeholder={
                            !isPortApplicable
                              ? '認証方式「なし」は設定不要'
                              : controllerId
                                ? '選択してください'
                                : '先に接点制御装置を選択してください'
                          }
                        >
                          {/* Shown before the options load, so an edit never flashes empty. */}
                          {field.value || undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {portOptions.map(({ port, usedBy }) => (
                        <SelectItem key={port} value={String(port)}>
                          {usedBy.length > 0
                            ? `${port}（使用中: ${usedBy.join('、')}）`
                            : String(port)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ip_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IPアドレス</FormLabel>
                  <FormControl>
                    <Input placeholder="192.168.1.100" maxLength={TEXT_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mac_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MACアドレス</FormLabel>
                  <FormControl>
                    <Input placeholder="XX:XX:XX:XX:XX:XX" maxLength={TEXT_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* 接続先の変更で主契約タイプの指定が外れる時の確認ダイアログ（prototype 11/7） */}
      <AlertDialog
        open={pendingChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>主契約タイプの指定を外しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              接続先が FIT365 の店舗になると、
              {pendingChange?.removedTypes
                .map((type) => EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS[type])
                .join('・')}
              は選べないため指定から外れます。外れるタイプの会員は、主契約ではこの機器を起動できなくなります。
              {pendingChange?.clearsAll
                ? '指定がなくなるため、変更後にタイプを選び直してください。'
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingChange) {
                  applyControllerChange(pendingChange.controllerId, pendingChange.removedTypes);
                }
                setPendingChange(null);
              }}
            >
              外して変更する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type PendingControllerChange = {
  controllerId: string;
  removedTypes: EquipmentMainContractType[];
  clearsAll: boolean;
};
