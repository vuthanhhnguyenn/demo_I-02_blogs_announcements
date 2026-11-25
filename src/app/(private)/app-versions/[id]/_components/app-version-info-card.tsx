import type { ReactNode } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { BrandBadge } from '@/components/common/brand-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { AppVersionDto } from '@/lib/api-real/types.gen';

import { AppVersionPairValue } from '../../_components/app-version-pair-value';
import { AppVersionStatusBadge } from '../../_components/app-version-status-badge';
import {
  APP_VERSION_OSES,
  APP_VERSION_OS_LABELS,
  APP_VERSION_SLOT_KINDS,
  APP_VERSION_SLOT_KIND_LABELS,
  appVersionSlot,
} from '../../_constants/app-version.constants';

interface AppVersionInfoCardProps {
  data: AppVersionDto;
}

const EMPTY = <span className="text-muted-foreground/50">—</span>;

function InfoItem({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <div className="text-sm wrap-anywhere">{children}</div>
    </div>
  );
}

export function AppVersionInfoCard({ data }: AppVersionInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">バージョン情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoItem label="ブランド">
              <BrandBadge brand={data.brandEnum} />
            </InfoItem>
            <InfoItem label="状態">
              <AppVersionStatusBadge status={data.status} />
            </InfoItem>
            <InfoItem label="適用開始日時">{formatDateYYYYMMDD_HHMM(data.effectiveAt)}</InfoItem>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {APP_VERSION_OSES.map((os) =>
              APP_VERSION_SLOT_KINDS.map((kind) => (
                <InfoItem
                  key={`${os}${kind}`}
                  label={`${APP_VERSION_OS_LABELS[os]} ${APP_VERSION_SLOT_KIND_LABELS[kind]}`}
                >
                  <AppVersionPairValue record={data} slot={appVersionSlot(os, kind)} />
                </InfoItem>
              )),
            )}
          </div>

          <InfoItem label="備考">
            <p className="wrap-anywhere whitespace-pre-wrap">{data.remarks}</p>
          </InfoItem>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t pt-4">
            <InfoItem label="作成者">{data.createdByName}</InfoItem>
            <InfoItem label="作成日時">{formatDateYYYYMMDD_HHMM(data.createdAt)}</InfoItem>
            <InfoItem label="更新者">{data.updatedByName ?? EMPTY}</InfoItem>
            <InfoItem label="更新日時">
              {data.updatedAt ? formatDateYYYYMMDD_HHMM(data.updatedAt) : EMPTY}
            </InfoItem>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
