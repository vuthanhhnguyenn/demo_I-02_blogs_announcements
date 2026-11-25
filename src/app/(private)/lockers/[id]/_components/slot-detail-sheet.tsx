'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { LockerPasswordEditor } from '@/app/(private)/lockers/_components/locker-password-editor';
import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, KeyRound, Lock, Unlock, User, UserPlus } from 'lucide-react';

import { DisabledReasonButton } from '@/components/common/disabled-reason-button';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { adminLockerControllerGetSlotOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerDetailDto, OptionListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  LOCKER_LOCK_METHOD_LABELS,
  LOCKER_OPEN_METHOD_LABELS,
  LOCKER_OPTION_STATUS_BADGE_CLASSES,
  LOCKER_OPTION_STATUS_LABELS,
  LOCKER_SELECTABLE_LOCK_METHODS,
  LOCKER_SHAPE_GRID,
  LOCKER_SLOT_STATUS_BADGE_CLASSES,
  LOCKER_SLOT_STATUS_LABELS,
  type LockerLockMethod,
} from '../../_constants/locker-enum-labels.constants';
import { formatLockerFee } from '../../_utils/locker-fee.util';
import { formatLockerSlotPosition } from '../../_utils/locker-slot-numbering.util';
import type { LockerSlotReleaseTarget } from '../../_utils/locker-slot-release.util';
import { useLockerSlotMutations } from '../_hooks/use-locker-slot-mutations.hook';
import type { LockerSlotRow } from '../_utils/locker-slot-rows.util';
import { SlotFeeOptionSelect, fromFeeOptionSelectValue } from './slot-fee-option-select';
import { SlotSettingDialog } from './slot-setting-dialog';

interface SlotFeeOptionSectionProps {
  row: LockerSlotRow;
  feeOptions: OptionListItemDto[];
  feeOptionsById: Map<string, OptionListItemDto>;
  defaultOption: OptionListItemDto | undefined;
  isUpdating: boolean;
  canAssignContract: boolean;
  onSave: (feeOptionId: string | null) => Promise<unknown>;
}

/** FR-013 契約種類 of a slot: its `feeOptionId` override, or the cabinet default for the slot */
function SlotFeeOptionSection({
  row,
  feeOptions,
  feeOptionsById,
  defaultOption,
  isUpdating,
  canAssignContract,
  onSave,
}: SlotFeeOptionSectionProps) {
  // Static display; "変更" switches to edit mode (same pattern as the lock type) to prevent accidental changes.
  const [isEditing, setIsEditing] = useState(false);
  // The editor opens unselected: 保存 stays disabled until a 契約種類 is picked (US6#3)
  const [selected, setSelected] = useState('');
  const currentOption = row.effectiveOptionId
    ? feeOptionsById.get(row.effectiveOptionId)
    : undefined;
  const isOverride = row.slot.feeOptionId !== null;

  return (
    <div className="py-4">
      <h3 className="text-muted-foreground mb-3 flex items-center gap-1 text-xs font-semibold">
        <CircleDollarSign className="size-3" />
        契約種類
      </h3>
      <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
        {currentOption ? (
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">適用中の契約種類</p>
              <p className="text-base font-semibold">{currentOption.name}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{currentOption.optionCode}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">
                {formatLockerFee(currentOption)}
                <span className="text-muted-foreground ml-1 text-xs font-normal">/月</span>
              </p>
              <Badge
                variant="outline"
                className="bg-success/15 text-success border-success/20 mt-1 text-[10px] font-medium"
              >
                {isOverride ? '割当済み' : 'キャビネット設定'}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <CircleDollarSign className="text-muted-foreground size-5" />
            <p className="text-muted-foreground text-center text-xs">
              契約種類が未割当です。
              <br />
              「割り当て」から契約種類を選択してください。
            </p>
          </div>
        )}

        {!canAssignContract ? (
          <p className="text-muted-foreground text-xs">契約種類の割当権限がありません</p>
        ) : isEditing ? (
          <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
            <SlotFeeOptionSelect
              value={selected}
              onChange={setSelected}
              feeOptions={feeOptions}
              defaultOption={defaultOption}
              className="h-8 text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSelected('');
                  setIsEditing(false);
                }}
              >
                キャンセル
              </Button>
              <DisabledReasonButton
                size="sm"
                className="text-xs"
                disabled={!selected || isUpdating}
                disabledReason={
                  !selected
                    ? '契約種類が未選択のため保存できません。契約種類を選択してください'
                    : undefined
                }
                onClick={() => {
                  onSave(fromFeeOptionSelectValue(selected))
                    .then(() => setIsEditing(false))
                    .catch(() => {
                      // toasted by the mutation; keep the editor open to retry
                    });
                }}
              >
                保存
              </DisabledReasonButton>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant={currentOption ? 'outline' : 'default'}
              className="shrink-0 text-xs"
              onClick={() => {
                setSelected('');
                setIsEditing(true);
              }}
            >
              {currentOption ? '変更' : '割り当て'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface SlotDetailSheetProps {
  open: boolean;
  onClose: () => void;
  row: LockerSlotRow | null;
  locker: LockerDetailDto;
  /** FR-013: locker fee options (G-02 master) */
  feeOptions: OptionListItemDto[];
  feeOptionsById: Map<string, OptionListItemDto>;
  onRelease: (target: LockerSlotReleaseTarget) => void;
  /** S1 / E-01 FR-005: open the slot-assignment dialog for an available slot */
  onAssign: (slotId: string) => void;
}

export function SlotDetailSheet({
  open,
  onClose,
  row,
  locker,
  feeOptions,
  feeOptionsById,
  onRelease,
  onAssign,
}: SlotDetailSheetProps) {
  const router = useRouter();
  const { hasPermission } = useAuthUser();
  const canEditSlot = hasPermission(Permission.LockersEdit);
  const canAssignContract = hasPermission(Permission.LockersContractsEdit);
  const { updateSlot, setFeeOption, isUpdatingSlot } = useLockerSlotMutations();
  const [editingLockType, setEditingLockType] = useState(false);
  const [selectedLockType, setSelectedLockType] = useState<LockerLockMethod>('dial_lock');
  const [slotSettingDialogOpen, setSlotSettingDialogOpen] = useState(false);
  const [slotSettingFormKey, setSlotSettingFormKey] = useState(0);

  const slotId = row?.slot.id ?? '';
  // The grid item has no PIN or `updatedAt`; the slot detail carries both (FR-009 + optimistic lock).
  const { data: slotDetail } = useQuery({
    ...adminLockerControllerGetSlotOptions({ path: { slotId } }),
    enabled: open && Boolean(slotId),
  });

  // The sheet stays mounted across slots, and 割当 / 開放 close it without `handleClose`: drop the
  // lock-type editor whenever the shown slot changes, or slot B would open with slot A's choice.
  const [editorSlotId, setEditorSlotId] = useState(slotId);
  if (editorSlotId !== slotId) {
    setEditorSlotId(slotId);
    setEditingLockType(false);
    setSlotSettingDialogOpen(false);
  }

  function handleClose() {
    setEditingLockType(false);
    setSlotSettingDialogOpen(false);
    onClose();
  }

  if (!row) return null;

  const { slot, label, contract } = row;
  const isBottomRow = slot.isBottomRow;
  const isAvailable = slot.status === 'available';
  const statusLabel = LOCKER_SLOT_STATUS_LABELS[slot.status];
  const statusStyle = LOCKER_SLOT_STATUS_BADGE_CLASSES[slot.status];
  const { rows: rowCount } = LOCKER_SHAPE_GRID[locker.shapeType];
  const expectedUpdatedAt = slotDetail?.updatedAt;
  // API-101 v0.15: any slot can carry its own 契約種類; without one it uses the cabinet default
  const defaultOption = row.defaultOptionId ? feeOptionsById.get(row.defaultOptionId) : undefined;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(value) => {
          if (!value) handleClose();
        }}
      >
        <SheetContent className="flex w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[480px] sm:max-w-[480px]">
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="size-4" />
                スロット {label}
                <Badge variant="outline" className={`gap-1 text-[10px] font-medium ${statusStyle}`}>
                  {statusLabel}
                </Badge>
              </SheetTitle>
              <SheetDescription className="sr-only">スロットの詳細情報と設定</SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-4">
              <h3 className="text-muted-foreground mb-3 text-xs font-semibold">スロット情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">スロット番号</p>
                  <p className="text-sm font-medium">{label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">ステータス</p>
                  <Badge variant="outline" className={`gap-1 text-xs font-medium ${statusStyle}`}>
                    {statusLabel}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">ロッカー</p>
                  <p className="text-sm font-medium">{locker.location.locationName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">位置</p>
                  <p className="flex flex-wrap items-center gap-1 text-sm font-medium">
                    {formatLockerSlotPosition(rowCount, slot.rowIndex, slot.columnIndex)}
                    {isBottomRow ? (
                      <Badge
                        variant="outline"
                        className="bg-info/15 text-info border-info/20 ml-2 text-[10px] font-medium"
                      >
                        最下段
                      </Badge>
                    ) : null}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-2 text-xs">施錠方法</p>
                  {editingLockType && canEditSlot ? (
                    <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
                      <Select
                        value={selectedLockType}
                        onValueChange={(value) => setSelectedLockType(value as LockerLockMethod)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue>{LOCKER_LOCK_METHOD_LABELS[selectedLockType]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {LOCKER_SELECTABLE_LOCK_METHODS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {LOCKER_LOCK_METHOD_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setEditingLockType(false)}
                        >
                          キャンセル
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs"
                          disabled={isUpdatingSlot}
                          onClick={() => {
                            // `mutateAsync` rejects on failure and the shared MutationCache
                            // toasts it; swallow here rather than leaving it unhandled.
                            updateSlot(slot.id, { lockMethod: selectedLockType, expectedUpdatedAt })
                              .then(() => {
                                setEditingLockType(false);
                              })
                              .catch(() => {
                                // keep the editor open so the user can retry
                              });
                          }}
                        >
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {LOCKER_LOCK_METHOD_LABELS[slot.lockMethod]}
                      </Badge>
                      {slot.status === 'in_use' ? (
                        // BR-LCK-007: the lock method cannot change while the slot is in use
                        <TooltipProvider delay={0}>
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="pointer-events-none h-6 px-2 text-xs opacity-50"
                                aria-disabled
                              >
                                変更
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                使用中のため施錠方法を変更できません。解約日経過後（開放待ち）または開放後に変更してください
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : canEditSlot ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setSelectedLockType(slot.lockMethod);
                            setEditingLockType(true);
                          }}
                        >
                          変更
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">開閉方法</p>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {LOCKER_OPEN_METHOD_LABELS[slot.openMethod]}
                  </Badge>
                </div>
              </div>
              {canEditSlot ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full gap-2 text-xs"
                  onClick={() => {
                    setSlotSettingFormKey((key) => key + 1);
                    setSlotSettingDialogOpen(true);
                  }}
                >
                  スロット設定を編集
                </Button>
              ) : null}
            </div>

            <Separator className="-mx-6 w-[calc(100%+48px)]" />

            {contract ? (
              <div className="py-4">
                <h3 className="text-muted-foreground mb-3 flex items-center gap-1 text-xs font-semibold">
                  <User className="size-3" />
                  契約者情報
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">契約者名</p>
                    <p className="text-sm font-medium">{contract.memberName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">会員番号</p>
                    <p className="text-sm font-medium">{contract.memberNumber ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">契約プラン</p>
                    <p className="text-sm font-medium">{contract.optionName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">契約ステータス</p>
                    {contract.optionStatus ? (
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${LOCKER_OPTION_STATUS_BADGE_CLASSES[contract.optionStatus]}`}
                      >
                        {LOCKER_OPTION_STATUS_LABELS[contract.optionStatus]}
                      </Badge>
                    ) : (
                      <p className="text-sm font-medium">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">契約開始日</p>
                    <p className="text-sm font-medium">
                      {formatDateYYYYMMDD(contract.contractedAt)}
                    </p>
                  </div>
                  {contract.cancellationDate ? (
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs">解約日</p>
                      <p className="text-warning text-sm font-medium">
                        {formatDateYYYYMMDD(contract.cancellationDate)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : isAvailable ? (
              <div className="py-4">
                <div className="bg-muted/30 flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
                  <Lock className="text-muted-foreground size-8" />
                  <p className="text-sm font-medium">このスロットは「利用可」です</p>
                  <RoleGatedButton
                    requiredPermission={Permission.LockersContractsEdit}
                    denyTooltip="スロット契約・割当の権限がありません"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => onAssign(slot.id)}
                  >
                    <UserPlus className="size-3" />
                    会員を割り当てる
                  </RoleGatedButton>
                </div>
              </div>
            ) : null}

            {!isAvailable && slot.lockMethod === 'dial_lock' ? (
              <>
                <Separator className="-mx-6 w-[calc(100%+48px)]" />
                <div className="py-4">
                  <h3 className="text-muted-foreground mb-3 flex items-center gap-1 text-xs font-semibold">
                    <KeyRound className="size-3" />
                    パスワード管理
                  </h3>
                  {canEditSlot ? (
                    <LockerPasswordEditor
                      key={slotDetail?.pinUpdatedAt ?? slot.id}
                      currentPassword={slotDetail?.pinCode ?? null}
                      updatedAt={slotDetail?.pinUpdatedAt ?? null}
                      isSaving={isUpdatingSlot}
                      onSave={(pinCode) => updateSlot(slot.id, { pinCode, expectedUpdatedAt })}
                    />
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      パスワード変更の権限がありません
                    </p>
                  )}
                </div>
              </>
            ) : null}

            {/* TODO(round3) R306: ReminderNotificationSection (リマインド通知) was mounted here for an
                in_use slot with a 解約日 — sending is the I-03 batch (FR-011); integrate in phase 2. */}

            <Separator className="-mx-6 w-[calc(100%+48px)]" />
            <SlotFeeOptionSection
              key={`${slot.id}-${slot.feeOptionId ?? ''}`}
              row={row}
              feeOptions={feeOptions}
              feeOptionsById={feeOptionsById}
              defaultOption={defaultOption}
              isUpdating={isUpdatingSlot}
              canAssignContract={canAssignContract}
              onSave={(feeOptionId) =>
                setFeeOption(slot.id, label, feeOptionId, slotDetail?.updatedAt)
              }
            />

            {!isAvailable ? (
              <>
                <Separator className="-mx-6 w-[calc(100%+48px)]" />
                <div className="py-4">
                  <h3 className="text-muted-foreground mb-3 text-xs font-semibold">操作</h3>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      disabled={!contract?.optionContractId}
                      onClick={() => {
                        if (!contract?.optionContractId) return;
                        router.push(navigate('/lockers/contracts/[id]', contract.optionContractId));
                      }}
                    >
                      契約詳細を見る
                    </Button>
                    {slot.status === 'pending_release' && canEditSlot ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-1 text-xs"
                        onClick={() => onRelease({ slotId: slot.id, label })}
                      >
                        <Unlock className="size-3" />
                        このスロットを開放する
                      </Button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <SlotSettingDialog
        open={slotSettingDialogOpen}
        formKey={slotSettingFormKey}
        onOpenChange={setSlotSettingDialogOpen}
        slotLabel={label}
        isInUse={slot.status === 'in_use'}
        isSaving={isUpdatingSlot}
        widthCm={slot.sizeWCm}
        heightCm={slot.sizeHCm}
        depthCm={slot.sizeDCm}
        openMethod={slot.openMethod}
        lockMethod={slot.lockMethod}
        pinCode={slotDetail?.pinCode ?? null}
        onSave={(patch) => updateSlot(slot.id, { ...patch, expectedUpdatedAt })}
      />
    </>
  );
}
