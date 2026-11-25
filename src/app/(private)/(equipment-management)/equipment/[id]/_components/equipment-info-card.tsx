'use client';

import type { ReactNode } from 'react';

import { formatDateYYYYMMDD } from '@/utils/date.util';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';

import { formatShortId } from '../../../_utils/device-api.util';
import { EQUIPMENT_AUTH_METHOD_LABELS, EQUIPMENT_TYPE_LABELS } from '../../_constants/constants';

type EquipmentDetail = ConnectedDeviceDetailDto;

interface EquipmentInfoCardProps {
  equipment: EquipmentDetail;
}

function renderNullable(value: string | null, monospace = false) {
  // A whitespace-only value is not a value: without the trim the field renders as a blank cell.
  if (!value?.trim()) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className={monospace ? 'font-mono text-sm font-medium' : 'text-sm font-medium'}>
      {value}
    </span>
  );
}

/**
 * `min-w-0` lets the grid cell shrink below its content and `wrap-anywhere` (inherited by the
 * value) breaks an unbroken token — a 100-char serial or name — inside the cell instead of running
 * past the card edge (BUG-E02-B-08 / C-10). The shared `@/components/common/field` cannot take the
 * Badge / mono / multi-line values rendered here, so the same two classes are applied locally.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 wrap-anywhere">
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      {children}
    </div>
  );
}

export function EquipmentInfoCard({ equipment }: EquipmentInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">接続機器情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label="接続機器ID">
            <p className="font-mono text-sm font-medium" title={equipment.id}>
              {formatShortId(equipment.id)}
            </p>
          </Field>
          <Field label="接続機器名">
            <p className="text-sm font-medium">{equipment.name}</p>
          </Field>
          <Field label="機器タイプ">
            <Badge variant="secondary" className="text-xs font-normal">
              {EQUIPMENT_TYPE_LABELS[equipment.deviceType]}
            </Badge>
          </Field>
          <Field label="シリアルナンバー">{renderNullable(equipment.serialNumber, true)}</Field>
          <Field label="IPアドレス">{renderNullable(equipment.ipAddress, true)}</Field>
          <Field label="MACアドレス">{renderNullable(equipment.macAddress, true)}</Field>
          <Field label="設置場所">{renderNullable(equipment.location)}</Field>
          <Field label="設置日">
            <p className="text-sm font-medium">{formatDateYYYYMMDD(equipment.installedOn, '—')}</p>
          </Field>
          <Field label="認証方式">
            <p className="text-sm font-medium">
              {EQUIPMENT_AUTH_METHOD_LABELS[equipment.authMethod]}
            </p>
          </Field>
          <Field label="接点制御先番号">
            <p className="text-sm font-medium tabular-nums">{equipment.outputPort ?? '—'}</p>
          </Field>
          {/* FR-003 §登録項目「備考（任意）」 / FR-004: every registered item is shown read-only. */}
          <div className="col-span-2 min-w-0 wrap-anywhere">
            <p className="text-muted-foreground mb-1 text-xs">備考</p>
            {equipment.note ? (
              <p className="text-sm whitespace-pre-wrap">{equipment.note}</p>
            ) : (
              <p className="text-muted-foreground text-sm">—</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
