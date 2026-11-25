'use client';

import { useState } from 'react';

import { EquipmentFormBasicInfo } from './equipment-form-basic-info';
import { EquipmentFormConnection } from './equipment-form-connection';
import { EquipmentFormRemarks } from './equipment-form-remarks';
import { EquipmentFormUsageRule } from './equipment-form-usage-rule';

type EquipmentFormProps = {
  mode?: 'create' | 'edit';
  equipmentId?: string;
  /** The device's store (edit): the controller picker is limited to it (E-DEV-008, D4). */
  storeId?: string;
};

export function EquipmentForm({ mode = 'create', equipmentId, storeId }: EquipmentFormProps) {
  // エリア扉: the controller moved to a store of another brand, so its area was dropped (prototype 11/12).
  const [areaClearedByBrand, setAreaClearedByBrand] = useState(false);
  return (
    <div className="space-y-6">
      <EquipmentFormBasicInfo equipmentId={mode === 'edit' ? equipmentId : undefined} />
      <EquipmentFormConnection
        storeId={storeId}
        equipmentId={mode === 'edit' ? equipmentId : undefined}
        onAreaCleared={() => setAreaClearedByBrand(true)}
      />
      <EquipmentFormUsageRule
        areaClearedByBrand={areaClearedByBrand}
        onAreaPicked={() => setAreaClearedByBrand(false)}
      />
      <EquipmentFormRemarks />
    </div>
  );
}
