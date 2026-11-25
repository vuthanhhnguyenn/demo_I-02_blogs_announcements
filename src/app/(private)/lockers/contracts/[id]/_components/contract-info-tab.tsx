'use client';

import { useRouter } from 'next/navigation';

import { LockerPasswordEditor } from '@/app/(private)/lockers/_components/locker-password-editor';
import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';

import { Field } from '@/components/common/field';
import { StatusCard } from '@/components/common/status-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { adminLockerControllerGetLockerOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerContractDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { useLockerSlotMutations } from '../../../[id]/_hooks/use-locker-slot-mutations.hook';
import {
  LOCKER_LOCK_METHOD_LABELS,
  LOCKER_SHAPE_GRID,
  type LockerLockMethod,
} from '../../../_constants/locker-enum-labels.constants';
import { formatLockerFee } from '../../../_utils/locker-fee.util';
import { formatLockerSlotPosition } from '../../../_utils/locker-slot-numbering.util';
import { LOCKER_CONTRACT_STATUS_CARD_MAP } from '../_constants/locker-contract-status.constants';

interface ContractInfoTabProps {
  contract: LockerContractDetailDto;
  slotLabel: string;
}

export function ContractInfoTab({ contract, slotLabel }: ContractInfoTabProps) {
  const router = useRouter();
  const { updateSlot, isUpdatingSlot } = useLockerSlotMutations();
  const { hasPermission } = useAuthUser();
  // Same gate as the slot sheet's PIN editor: a PIN change is a slot PATCH
  const canChangePin = hasPermission(Permission.LockersEdit);

  // The contract carries the slot's row/column but neither the cabinet's shape (位置 counts from it)
  // nor the store name — both come from the cabinet (API-100 §5.1; observers get 403 on /admin/stores)
  const { data: locker } = useQuery({
    ...adminLockerControllerGetLockerOptions({ path: { lockerId: contract.lockerId } }),
  });

  const { slot } = contract;
  const rowCount = locker ? LOCKER_SHAPE_GRID[locker.shapeType]?.rows : undefined;
  const position =
    rowCount !== undefined
      ? formatLockerSlotPosition(rowCount, slot.rowIndex, slot.columnIndex)
      : '—';
  // `LockerContractSlotBlockDto.lockMethod` is typed `string`; the values are the cabinet enum
  const lockMethod = slot.lockMethod as LockerLockMethod;
  const isDialLock = lockMethod === 'dial_lock';
  const displayCancellationDate = contract.cancellationDate
    ? formatDateYYYYMMDD(contract.cancellationDate)
    : undefined;
  const statusCardConfig = contract.optionStatus
    ? LOCKER_CONTRACT_STATUS_CARD_MAP[contract.optionStatus]
    : undefined;
  const fee =
    contract.feeMonthly !== null
      ? `${formatLockerFee({ feeMonthly: contract.feeMonthly })} / 月（税込）`
      : '—';

  return (
    <div className="flex gap-4">
      <div className="flex w-[60%] flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">契約基本情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="契約ID" value={contract.optionContractId ?? '—'} mono />
              <Field label="店舗" value={locker?.storeName ?? '—'} />
              <Field
                label="契約種類"
                value={
                  contract.optionName ? (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {contract.optionName}
                    </Badge>
                  ) : (
                    '—'
                  )
                }
              />
              <Field label="適用料金（月額）" value={fee} />
              {/* TODO(round2) B5: on hold — no per-member set-discount record exists yet (Otaki). The
                  per-contract display comes with API-086 §13 TBD-SET-BILLING-APPLICATION; keep 「—」
                  until then (API-101 §8.6). */}
              <Field label="セット割" value="—" />
              <Field label="契約開始日" value={formatDateYYYYMMDD(contract.contractedAt)} />
              {/* No 契約終了日: the contract's only end date is the 解約日 below */}
              <div>
                <p className="text-muted-foreground mb-1 text-xs">解約日</p>
                {displayCancellationDate ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm">{displayCancellationDate}</p>
                    <p className="text-muted-foreground text-[11px]">
                      解約日経過後、自動的に「開放待ち」状態へ遷移します
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">—（未解約）</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">契約者情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="会員番号" value={contract.memberNumber ?? '—'} mono />
              <Field label="氏名" value={contract.memberName ?? '—'} />
              <Field label="電話番号" value={contract.memberPhoneNumber ?? '—'} />
              <Field label="メール" value={contract.memberEmail ?? '—'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ロッカー情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="ロッカーID" value={slot.locationCode ?? '—'} mono />
              <Field label="スロット番号" value={slotLabel} />
              <Field
                label="位置"
                value={
                  <span className="inline-flex items-center gap-2">
                    {position}
                    {slot.isBottomRow ? <Badge variant="secondary">最下段</Badge> : null}
                  </span>
                }
              />
              <Field
                label="サイズ"
                value={`W${slot.sizeWCm} × H${slot.sizeHCm} × D${slot.sizeDCm} cm`}
              />
              <Field label="エリア" value={slot.locationName ?? '—'} />
              <Field
                label="施錠方法"
                value={`${LOCKER_LOCK_METHOD_LABELS[lockMethod] ?? slot.lockMethod}${
                  isDialLock ? '' : '（暗証番号なし）'
                }`}
              />
            </div>
            <div className="mt-4 border-t pt-4">
              <Button
                variant="link"
                size="sm"
                className="h-auto gap-1 p-0 text-xs"
                onClick={() => router.push(navigate('/lockers/[id]', contract.lockerId))}
              >
                <ExternalLink className="size-3" />
                ロッカー詳細を見る
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* E-LOC-007: a PIN exists for dial locks only */}
        {isDialLock ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">暗証番号情報</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <LockerPasswordEditor
                term="暗証番号"
                currentPassword={slot.pinCode}
                updatedAt={slot.pinUpdatedAt}
                isSaving={isUpdatingSlot}
                onSave={(pinCode) => updateSlot(contract.slotId, { pinCode })}
                deniedReason={canChangePin ? undefined : '暗証番号変更の権限がありません'}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="w-[40%]">
        <div className="sticky top-0 flex flex-col gap-4">
          {statusCardConfig ? (
            <StatusCard
              tone={statusCardConfig.tone}
              icon={statusCardConfig.icon}
              label={statusCardConfig.label}
              meta={
                contract.optionStatus === 'active' || contract.optionStatus === 'pending_start'
                  ? `契約開始日: ${formatDateYYYYMMDD(contract.contractedAt)}`
                  : [
                      displayCancellationDate ? `解約日: ${displayCancellationDate}` : undefined,
                      contract.optionStatus === 'pending_cancel'
                        ? '解約日経過後、自動的に「開放待ち」へ遷移します'
                        : '解約処理が完了しました',
                    ].filter((item): item is string => Boolean(item))
              }
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">その他情報</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-4">
                <Field label="作成日時" value={formatDateYYYYMMDD_HHMM(contract.createdAt)} />
                <Field label="更新日時" value={formatDateYYYYMMDD_HHMM(contract.updatedAt)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
