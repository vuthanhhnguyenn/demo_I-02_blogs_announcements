'use client';

import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';

type ControllerDetail = RelayControllerDetailDto;

interface ControllerInfoCardProps {
  controller: ControllerDetail;
}

function renderNullable(value: string | null, monospace = false) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className={`text-sm font-medium wrap-anywhere ${monospace ? 'font-mono' : ''}`.trimEnd()}>
      {value}
    </span>
  );
}

/**
 * BUG-E02-E-09 — `min-w-0` lets the grid track shrink below an unbroken value (A×255 / 0×255),
 * and the value breaks anywhere instead of being clipped at the card edge.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      {children}
    </div>
  );
}

/**
 * 接点制御装置情報: the seven read-only items of the prototype's 基本情報 card. 通信ポート番号 is
 * deliberately absent — it is not an E-02 FR-007 registration item.
 */
export function ControllerInfoCard({ controller }: ControllerInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">接点制御装置情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label="接点制御装置ID">
            <p className="font-mono text-sm font-medium break-all" title={controller.relayId}>
              {controller.relayId}
            </p>
          </Field>
          <Field label="装置名">{renderNullable(controller.name)}</Field>
          <Field label="店舗コード">{renderNullable(controller.storeCode)}</Field>
          <Field label="設置場所">{renderNullable(controller.location)}</Field>
          <Field label="IPアドレス">{renderNullable(controller.ipAddress, true)}</Field>
          <Field label="ファームウェアバージョン">
            {renderNullable(controller.firmwareVersion, true)}
          </Field>
          <Field label="制御ポート数">
            {controller.controlPortCount === null ? (
              renderNullable(null)
            ) : (
              <p className="text-sm font-medium tabular-nums">{controller.controlPortCount}</p>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
