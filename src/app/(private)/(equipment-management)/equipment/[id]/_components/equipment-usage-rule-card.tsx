'use client';

import { AREA_GENDER_CONDITION_LABELS } from '@/app/(private)/area-master/_constants/area.constants';
import { AlertTriangle } from 'lucide-react';

import { JargonTip } from '@/components/common/jargon-tip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';

import {
  AREA_DOOR_NOTE,
  EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS,
  EQUIPMENT_SERVICE_TYPE_LABELS,
  MAIN_CONTRACT_ALL_LABEL,
  MAIN_CONTRACT_ALL_NOTE,
  NOT_JUDGED_LABEL,
  OPTION_BYPASS_ALERT,
  getMainContractRule,
  hasAllSelectableMainContractTypes,
} from '../../_constants/constants';
import { useStoreBrandGroup } from '../../_hooks/use-store-brand-group';

interface EquipmentUsageRuleCardProps {
  equipment: ConnectedDeviceDetailDto;
}

function BadgeRow({ labels }: { labels: string[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {labels.map((label) => (
        <Badge key={label} variant="outline" className="text-xs font-normal">
          {label}
        </Badge>
      ))}
    </div>
  );
}

function NotJudged() {
  return <p className="text-muted-foreground text-sm">{NOT_JUDGED_LABEL}</p>;
}

/**
 * Mirrors the form's two FR-008 axes (prototype 11/7): 主契約判定 (判定しない / 全て / the listed
 * types) and サービス種別判定 (判定しない / the listed types), then the option-bypass notice.
 */
export function EquipmentUsageRuleCard({ equipment }: EquipmentUsageRuleCardProps) {
  const mainRule = getMainContractRule(equipment);
  const serviceTypeLabels = equipment.allowedServiceTypes.map(
    (serviceType) => EQUIPMENT_SERVICE_TYPE_LABELS[serviceType],
  );
  // Only the "every selectable type" case needs the brand; 「全て」 is known without it.
  const { brandGroup } = useStoreBrandGroup(
    mainRule.scope === 'specified' && serviceTypeLabels.length > 0 ? equipment.storeId : null,
  );
  const showOptionBypassAlert =
    serviceTypeLabels.length > 0 &&
    (mainRule.scope === 'all' ||
      (mainRule.scope === 'specified' &&
        hasAllSelectableMainContractTypes(mainRule.types, brandGroup)));
  // FR-008: ゲートストップ conditions apply to 入館ゲート automatically (never to a check-out).
  const showGateStopInfo = equipment.deviceType === 'entry_gate';

  // E-02 FR-003 / FR-008 (prototype 11/12): an エリア扉 shows its one area instead of the two axes.
  if (equipment.deviceType === 'area_door') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">利用制御ルール</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">エリア</p>
              <p className="text-sm font-medium wrap-anywhere">{equipment.area?.name ?? ''}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">性別の条件</p>
              <p className="text-sm font-medium">
                {equipment.area ? AREA_GENDER_CONDITION_LABELS[equipment.area.genderCondition] : ''}
              </p>
            </div>
            <div className="bg-info/15 border-info/20 mt-1 rounded-md border px-3 py-2">
              <p className="text-info text-xs font-medium">{AREA_DOOR_NOTE.title}</p>
              <p className="text-muted-foreground mt-1 text-xs">{AREA_DOOR_NOTE.body}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">利用制御ルール</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">
              <JargonTip term="主契約">主契約判定</JargonTip>
            </p>
            {mainRule.scope === 'none' ? <NotJudged /> : null}
            {mainRule.scope === 'all' ? (
              <>
                <BadgeRow labels={[MAIN_CONTRACT_ALL_LABEL]} />
                <p className="text-muted-foreground mt-1 text-xs">{MAIN_CONTRACT_ALL_NOTE}</p>
              </>
            ) : null}
            {mainRule.scope === 'specified' ? (
              <BadgeRow
                labels={mainRule.types.map((type) => EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS[type])}
              />
            ) : null}
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">サービス種別判定</p>
            {serviceTypeLabels.length > 0 ? (
              <>
                <BadgeRow labels={serviceTypeLabels} />
                <p className="text-muted-foreground mt-1 text-xs">
                  課金種別（通常/都度）を問わず、同じサービス種別のオプションがいずれか1つ有効であれば起動を許可します
                </p>
              </>
            ) : (
              <NotJudged />
            )}
          </div>
          {showOptionBypassAlert ? (
            <Alert className="border-warning/50 bg-warning/15">
              <AlertTriangle className="text-warning size-4" />
              <AlertTitle className="text-xs">{OPTION_BYPASS_ALERT.title}</AlertTitle>
              <AlertDescription className="text-muted-foreground text-xs">
                {OPTION_BYPASS_ALERT.body}
              </AlertDescription>
            </Alert>
          ) : null}
          {showGateStopInfo ? (
            <div className="bg-info/15 border-info/20 mt-1 rounded-md border px-3 py-2">
              <p className="text-info text-xs font-medium">
                <JargonTip term="ゲートストップ">ゲートストップ条件</JargonTip>
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                入館ゲートの場合: ブラックリスト登録済み / 未納（滞納） / 家族会員利用中
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
