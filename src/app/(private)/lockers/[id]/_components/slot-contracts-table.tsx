'use client';

import { useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { Download, Unlock } from 'lucide-react';

import { DisabledReasonButton } from '@/components/common/disabled-reason-button';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { OptionListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  LOCKER_SLOT_STATUS_BADGE_CLASSES,
  LOCKER_SLOT_STATUS_LABELS,
} from '../../_constants/locker-enum-labels.constants';
import { formatLockerFee } from '../../_utils/locker-fee.util';
import { formatLockerSlotPosition } from '../../_utils/locker-slot-numbering.util';
import type { LockerSlotReleaseTarget } from '../../_utils/locker-slot-release.util';
import type { LockerSlotRow } from '../_utils/locker-slot-rows.util';
import { PasswordCell } from './password-cell';
import { SlotFeeOptionSelect, fromFeeOptionSelectValue } from './slot-fee-option-select';

interface SlotContractsTableProps {
  /** FR-013: locker fee options (G-02 master) any slot can be switched to */
  feeOptions: OptionListItemDto[];
  feeOptionsById: Map<string, OptionListItemDto>;
  pendingCount: number;
  displayedRows: LockerSlotRow[];
  pendingOnly: boolean;
  onExportCsv: () => void;
  isExportingCsv?: boolean;
  onPendingOnlyChange: (value: boolean) => void;
  checkedSlots: Map<string, LockerSlotReleaseTarget>;
  onToggleCheck: (target: LockerSlotReleaseTarget) => void;
  onBulkRelease: () => void;
  onSingleRelease: (target: LockerSlotReleaseTarget) => void;
  onSelectSlot: (slotId: string) => void;
  onFeeOptionSave: (
    slotId: string,
    slotLabel: string,
    feeOptionId: string | null,
  ) => Promise<unknown>;
  isUpdatingSlot: boolean;
  /** The cabinet's row count, to turn `rowIndex` into 段目 */
  rowCount: number;
}

export function SlotContractsTable({
  feeOptions,
  feeOptionsById,
  pendingCount,
  displayedRows,
  pendingOnly,
  onExportCsv,
  isExportingCsv = false,
  onPendingOnlyChange,
  checkedSlots,
  onToggleCheck,
  onBulkRelease,
  onSingleRelease,
  onSelectSlot,
  rowCount,
  onFeeOptionSave,
  isUpdatingSlot,
}: SlotContractsTableProps) {
  const { hasPermission } = useAuthUser();
  const canEditSlot = hasPermission(Permission.LockersEdit);
  // Contract type is displayed statically; "変更" switches to inline edit mode (same pattern as the lock type in the Sheet). Prevents accidental changes while browsing.
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [draftFeeOption, setDraftFeeOption] = useState('');

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">契約・割当一覧</h3>
          {pendingCount > 0 ? (
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning border-warning/20 text-xs"
            >
              開放待ち {pendingCount}件
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="pending-only" className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox
              id="pending-only"
              className="size-4"
              checked={pendingOnly}
              onCheckedChange={(value) => onPendingOnlyChange(Boolean(value))}
            />
            開放待ちのみ表示
          </label>
          <RoleGatedButton
            requiredPermission={Permission.LockersExport}
            denyTooltip="CSV出力の権限がありません"
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={onExportCsv}
            disabled={isExportingCsv}
          >
            <Download className="size-3" />
            CSV出力
          </RoleGatedButton>
          <RoleGatedButton
            requiredPermission={Permission.LockersEdit}
            denyTooltip="清掃・開放操作の権限がありません"
            tooltip={
              checkedSlots.size === 0
                ? 'スロットが未選択のため一括開放できません。開放待ちの行のチェックボックスで対象を選択してください'
                : undefined
            }
            size="sm"
            className="gap-1 text-xs"
            disabled={checkedSlots.size === 0}
            onClick={onBulkRelease}
          >
            <Unlock className="size-3" />
            一括開放
            {checkedSlots.size > 0 ? (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                {checkedSlots.size}
              </Badge>
            ) : null}
          </RoleGatedButton>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10 text-xs font-semibold" />
            <TableHead className="text-xs font-semibold">スロット番号</TableHead>
            <TableHead className="text-xs font-semibold">位置</TableHead>
            <TableHead className="text-xs font-semibold">ステータス</TableHead>
            <TableHead className="text-xs font-semibold">契約者</TableHead>
            <TableHead className="text-xs font-semibold">会員ID</TableHead>
            <TableHead className="text-xs font-semibold">契約種類</TableHead>
            <TableHead className="text-xs font-semibold">解約日</TableHead>
            <TableHead className="text-xs font-semibold">パスワード</TableHead>
            <TableHead className="w-20 text-xs font-semibold">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedRows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={10} className="h-32 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-muted-foreground text-sm">
                    {pendingOnly
                      ? '開放待ちのスロットはありません。'
                      : '対象のスロットがありません。'}
                  </p>
                  {pendingOnly ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => onPendingOnlyChange(false)}
                    >
                      条件をクリア
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : null}
          {displayedRows.map(({ slot, label, contract, defaultOptionId, effectiveOptionId }) => {
            const isPending = slot.status === 'pending_release';
            const target = { slotId: slot.id, label };
            const effectiveOption = effectiveOptionId
              ? feeOptionsById.get(effectiveOptionId)
              : undefined;
            // What the slot falls back to without its own 契約種類 (API-101 v0.15)
            const defaultOption = defaultOptionId ? feeOptionsById.get(defaultOptionId) : undefined;

            return (
              <TableRow
                key={slot.id}
                className="hover:bg-accent/50 cursor-pointer"
                onClick={() => onSelectSlot(slot.id)}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  {isPending && canEditSlot ? (
                    <Checkbox
                      className="size-4"
                      checked={checkedSlots.has(slot.id)}
                      onCheckedChange={() => onToggleCheck(target)}
                    />
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{label}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatLockerSlotPosition(rowCount, slot.rowIndex, slot.columnIndex)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${LOCKER_SLOT_STATUS_BADGE_CLASSES[slot.status]}`}
                  >
                    {LOCKER_SLOT_STATUS_LABELS[slot.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {contract?.memberName ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {contract?.memberNumber ?? '—'}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  {editingSlotId === slot.id ? (
                    <div className="flex items-center gap-1">
                      <SlotFeeOptionSelect
                        value={draftFeeOption}
                        onChange={setDraftFeeOption}
                        feeOptions={feeOptions}
                        defaultOption={defaultOption}
                        className="h-7 w-44 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditingSlotId(null)}
                      >
                        キャンセル
                      </Button>
                      <DisabledReasonButton
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!draftFeeOption || isUpdatingSlot}
                        disabledReason={
                          !draftFeeOption
                            ? '契約種類が未選択のため保存できません。契約種類を選択してください'
                            : undefined
                        }
                        onClick={() => {
                          onFeeOptionSave(slot.id, label, fromFeeOptionSelectValue(draftFeeOption))
                            .then(() => setEditingSlotId(null))
                            .catch(() => {
                              // toasted by the mutation; keep the editor open to retry
                            });
                        }}
                      >
                        保存
                      </DisabledReasonButton>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {effectiveOption ? (
                        <>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {effectiveOption.name}
                          </Badge>
                          <span className="text-muted-foreground text-[10px]">
                            {formatLockerFee(effectiveOption)}/月
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">未割当</span>
                      )}
                      <RoleGatedButton
                        requiredPermission={Permission.LockersContractsEdit}
                        denyTooltip="スロット契約・割当の権限がありません"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setDraftFeeOption('');
                          setEditingSlotId(slot.id);
                        }}
                      >
                        {effectiveOption ? '変更' : '割り当て'}
                      </RoleGatedButton>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {contract?.cancellationDate ? (
                    <span className="text-warning">
                      {formatDateYYYYMMDD(contract.cancellationDate)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <PasswordCell slotId={slot.id} lockMethod={slot.lockMethod} />
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  {isPending && canEditSlot ? (
                    <RoleGatedButton
                      requiredPermission={Permission.LockersEdit}
                      denyTooltip="開放操作の権限がありません"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => onSingleRelease(target)}
                    >
                      <Unlock className="size-3" />
                      開放
                    </RoleGatedButton>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">
          {pendingOnly ? `開放待ち ${pendingCount}件` : `全${displayedRows.length}件`}
        </p>
      </div>
    </Card>
  );
}
