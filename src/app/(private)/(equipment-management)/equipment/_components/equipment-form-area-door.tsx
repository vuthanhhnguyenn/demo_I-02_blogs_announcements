'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { AREA_GENDER_CONDITION_LABELS } from '@/app/(private)/area-master/_constants/area.constants';

import { RequiredMark } from '@/components/common/field-marker';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { AREA_DOOR_NOTE } from '../_constants/constants';
import { useAreaById, useBrandHasAreas } from '../_hooks/use-area-lookup';
import { useControllerBrandGroup } from '../_hooks/use-store-brand-group';
import type { EquipmentFormValues } from '../_schemas/equipment-form.schema';
import { AreaPicker, type AreaPickerArea } from './area-picker';

type EquipmentFormAreaDoorProps = {
  /** The controller moved to another brand's store and the picked area was dropped (prototype 11/12). */
  areaClearedByBrand: boolean;
  onAreaPicked: () => void;
};

/**
 * 利用制御ルール of an エリア扉 (E-02 FR-003 / FR-008, prototype 11/12): exactly one area of the
 * controller store's brand. The door opens for a member whose plan or option includes that area and
 * whose gender meets its condition (shown read-only — the area master decides it).
 */
export function EquipmentFormAreaDoor({
  areaClearedByBrand,
  onAreaPicked,
}: EquipmentFormAreaDoorProps) {
  const form = useFormContext<EquipmentFormValues>();
  const [controllerId, areaId] = useWatch({
    control: form.control,
    name: ['controller_id', 'area_id'],
  });
  const { brandGroup } = useControllerBrandGroup(controllerId || null);
  const hasAreas = useBrandHasAreas(brandGroup);

  // The row just picked carries its 性別の条件; an area set earlier (edit) is read on its own.
  const [pickedArea, setPickedArea] = useState<AreaPickerArea | null>(null);
  const knownArea = areaId && pickedArea?.id === areaId ? pickedArea : undefined;
  const { area: fetchedArea } = useAreaById(areaId || null, { enabled: !knownArea });
  const selected = knownArea ?? fetchedArea;

  return (
    <div className="space-y-4">
      <div>
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="area_id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  エリア
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <AreaPicker
                    brandGroup={brandGroup}
                    value={field.value || null}
                    valueLabel={selected?.name}
                    disabled={!controllerId || !brandGroup || hasAreas === false}
                    hasError={Boolean(fieldState.error)}
                    ariaLabel="エリア"
                    onChange={(area) => {
                      setPickedArea(area);
                      field.onChange(area.id);
                      onAreaPicked();
                    }}
                  />
                </FormControl>
                {areaClearedByBrand && !field.value && (
                  <p className="text-muted-foreground text-xs">
                    接続先の店舗のブランドが変わったため、エリアの選択を外しました。選び直してください
                  </p>
                )}
                {!controllerId ? (
                  <p className="text-muted-foreground text-xs">
                    先に接続先接点制御装置を選択してください。店舗のブランドのエリアから選べます
                  </p>
                ) : brandGroup && hasAreas === false ? (
                  <p className="text-muted-foreground text-xs">
                    {brandGroup}{' '}
                    のエリアはまだ登録されていません。エリアは本部がエリアマスタ管理で登録します
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>性別の条件</FormLabel>
            <FormControl>
              <Input
                className="bg-muted/30"
                value={selected ? AREA_GENDER_CONDITION_LABELS[selected.genderCondition] : ''}
                placeholder="エリアを選ぶと表示されます"
                disabled
              />
            </FormControl>
          </FormItem>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          性別の条件はエリアの設定で決まります。条件があるエリアは、性別が合う会員だけが開錠できます。
        </p>
      </div>

      <div className="bg-info/15 border-info/20 rounded-md border px-4 py-3">
        <p className="text-info mb-1 text-xs font-medium">{AREA_DOOR_NOTE.title}</p>
        <p className="text-muted-foreground text-xs">{AREA_DOOR_NOTE.body}</p>
      </div>
    </div>
  );
}
