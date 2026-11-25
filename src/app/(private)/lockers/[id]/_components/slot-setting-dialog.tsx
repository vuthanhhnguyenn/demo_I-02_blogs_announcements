'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import type { UpdateLockerSlotDto } from '@/lib/api-real/types.gen';

import {
  LOCKER_LOCK_METHOD_LABELS,
  LOCKER_OPEN_METHOD_OPTIONS,
  LOCKER_SELECTABLE_LOCK_METHODS,
  type LockerLockMethod,
  type LockerOpenMethod,
} from '../../_constants/locker-enum-labels.constants';
import { SLOT_SIZE_MAX_CM } from '../../_schemas/locker-form.schema';
import { isLockerStaleWriteError } from '../../_utils/locker-error.util';

/** `expectedUpdatedAt` is added by the caller, which holds the slot detail */
type SlotSettingPatch = Omit<UpdateLockerSlotDto, 'expectedUpdatedAt'>;

interface SlotSettingDialogProps {
  open: boolean;
  formKey: number;
  onOpenChange: (open: boolean) => void;
  slotLabel: string;
  isInUse: boolean;
  isSaving?: boolean;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  openMethod: LockerOpenMethod;
  lockMethod: LockerLockMethod;
  pinCode: string | null;
  onSave: (patch: SlotSettingPatch) => Promise<unknown>;
}

type SlotSettingFormProps = Omit<SlotSettingDialogProps, 'open' | 'formKey' | 'onOpenChange'> & {
  onClose: () => void;
};

/** Same wording and 1–500 cm range as the cabinet form (`locker-form.schema.ts`) */
function slotSizeError(label: string, value: string): string | null {
  if (value.trim() === '') return `${label}を入力してください`;
  if (!/^\d+$/.test(value)) return `${label}は数字で入力してください`;
  const num = Number(value);
  if (num <= 0) return `${label}は1以上で入力してください`;
  if (num > SLOT_SIZE_MAX_CM) return `${label}は${SLOT_SIZE_MAX_CM}以下で入力してください`;
  return null;
}

function parsePositiveInt(value: string): number | null {
  return slotSizeError('', value) === null ? Number(value) : null;
}

function buildSlotSettingPatch(params: {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  openMethod: LockerOpenMethod;
  lockMethod: LockerLockMethod;
  pinCode: string | null;
  isInUse: boolean;
  slotWidth: string;
  slotHeight: string;
  slotDepth: string;
  slotOpenMethod: LockerOpenMethod;
  slotLockMethod: LockerLockMethod;
  slotPinCode: string;
}): { patch: SlotSettingPatch; isValid: boolean } {
  const patch: SlotSettingPatch = {};
  let isValid = true;

  if (params.slotWidth !== String(params.widthCm)) {
    const nextWidth = parsePositiveInt(params.slotWidth);
    if (nextWidth === null) isValid = false;
    else patch.sizeWCm = nextWidth;
  }

  if (params.slotHeight !== String(params.heightCm)) {
    const nextHeight = parsePositiveInt(params.slotHeight);
    if (nextHeight === null) isValid = false;
    else patch.sizeHCm = nextHeight;
  }

  if (params.slotDepth !== String(params.depthCm)) {
    const nextDepth = parsePositiveInt(params.slotDepth);
    if (nextDepth === null) isValid = false;
    else patch.sizeDCm = nextDepth;
  }

  if (params.slotOpenMethod !== params.openMethod) {
    patch.openMethod = params.slotOpenMethod;
  }

  // BR-LCK-007: the lock method is frozen while the slot is in use
  const effectiveLockMethod = params.isInUse ? params.lockMethod : params.slotLockMethod;

  if (!params.isInUse && params.slotLockMethod !== params.lockMethod) {
    patch.lockMethod = params.slotLockMethod;
  }

  // BR-LCK-008: a PIN is dial_lock only; leaving dial_lock clears it server-side (API-100 §6.2 #4)
  const initialPin = params.pinCode ?? '';
  if (effectiveLockMethod === 'dial_lock' && params.slotPinCode !== initialPin) {
    if (!/^[0-9]{4}$/.test(params.slotPinCode)) isValid = false;
    else patch.pinCode = params.slotPinCode;
  }

  return { patch, isValid };
}

function SlotSettingForm({
  slotLabel,
  isInUse,
  isSaving = false,
  widthCm,
  heightCm,
  depthCm,
  openMethod,
  lockMethod,
  pinCode,
  onSave,
  onClose,
}: SlotSettingFormProps) {
  const [slotWidth, setSlotWidth] = useState(String(widthCm));
  const [slotHeight, setSlotHeight] = useState(String(heightCm));
  const [slotDepth, setSlotDepth] = useState(String(depthCm));
  const [slotOpenMethod, setSlotOpenMethod] = useState<LockerOpenMethod>(openMethod);
  const [slotLockMethod, setSlotLockMethod] = useState<LockerLockMethod>(lockMethod);
  const [slotPinCode, setSlotPinCode] = useState(pinCode ?? '');

  const { patch, isValid } = useMemo(
    () =>
      buildSlotSettingPatch({
        widthCm,
        heightCm,
        depthCm,
        openMethod,
        lockMethod,
        pinCode,
        isInUse,
        slotWidth,
        slotHeight,
        slotDepth,
        slotOpenMethod,
        slotLockMethod,
        slotPinCode,
      }),
    [
      widthCm,
      heightCm,
      depthCm,
      openMethod,
      lockMethod,
      pinCode,
      isInUse,
      slotWidth,
      slotHeight,
      slotDepth,
      slotOpenMethod,
      slotLockMethod,
      slotPinCode,
    ],
  );

  // Only a value the user changed is validated, matching what the patch sends
  const widthError = slotWidth !== String(widthCm) ? slotSizeError('横幅', slotWidth) : null;
  const heightError = slotHeight !== String(heightCm) ? slotSizeError('高さ', slotHeight) : null;
  const depthError = slotDepth !== String(depthCm) ? slotSizeError('奥行き', slotDepth) : null;
  const sizeErrors = [widthError, heightError, depthError].filter(
    (message): message is string => message !== null,
  );

  // FR-009: same rule as the patch — only a dial-lock PIN the user changed is checked
  const isPinEdited = slotLockMethod === 'dial_lock' && slotPinCode !== (pinCode ?? '');
  const pinError =
    isPinEdited && !/^[0-9]{4}$/.test(slotPinCode) ? '4桁の数字を入力してください' : null;

  const hasChanges = Object.keys(patch).length > 0;
  const canSave = hasChanges && isValid && !isSaving;

  return (
    <>
      <DialogHeader>
        <DialogTitle>スロット設定を編集</DialogTitle>
        <DialogDescription>{slotLabel} の個別設定を変更します</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div>
          <Label className="mb-2 block text-xs font-medium">スロットサイズ（単位: cm）</Label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">横幅:</span>
              <Input
                className="h-8 w-16 text-sm"
                value={slotWidth}
                maxLength={3}
                aria-invalid={!!widthError || undefined}
                onChange={(event) => setSlotWidth(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">高さ:</span>
              <Input
                className="h-8 w-16 text-sm"
                value={slotHeight}
                maxLength={3}
                aria-invalid={!!heightError || undefined}
                onChange={(event) => setSlotHeight(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">奥行き:</span>
              <Input
                className="h-8 w-16 text-sm"
                value={slotDepth}
                maxLength={3}
                aria-invalid={!!depthError || undefined}
                onChange={(event) => setSlotDepth(event.target.value)}
              />
            </div>
          </div>
          {sizeErrors.map((message) => (
            <p key={message} className="text-destructive mt-1 text-xs">
              {message}
            </p>
          ))}
        </div>

        <div>
          <Label className="mb-2 block text-xs font-medium">開閉方法</Label>
          <RadioGroup
            value={slotOpenMethod}
            onValueChange={(value) => setSlotOpenMethod(value as LockerOpenMethod)}
            className="flex gap-4"
          >
            {LOCKER_OPEN_METHOD_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={`open-${option.value}`} />
                <Label
                  htmlFor={`open-${option.value}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label className="mb-2 block text-xs font-medium">施錠方法</Label>
          {isInUse ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-normal">
                {LOCKER_LOCK_METHOD_LABELS[slotLockMethod]}
              </Badge>
              <span className="text-muted-foreground text-xs">（使用中のため変更不可）</span>
            </div>
          ) : (
            <RadioGroup
              value={slotLockMethod}
              onValueChange={(value) => setSlotLockMethod(value as LockerLockMethod)}
              className="flex flex-wrap gap-4"
            >
              {LOCKER_SELECTABLE_LOCK_METHODS.map((value) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`lock-${value}`} />
                  <Label htmlFor={`lock-${value}`} className="cursor-pointer text-sm font-normal">
                    {LOCKER_LOCK_METHOD_LABELS[value]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        {slotLockMethod === 'dial_lock' ? (
          <div>
            <Label className="mb-2 block text-xs font-medium">暗証番号（4桁）</Label>
            <Input
              className="h-8 w-24 text-center font-mono text-sm tracking-widest"
              value={slotPinCode}
              maxLength={4}
              onChange={(event) =>
                setSlotPinCode(event.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="0000"
              aria-invalid={pinError !== null}
            />
            {pinError && <p className="text-destructive mt-1 text-xs">{pinError}</p>}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {LOCKER_LOCK_METHOD_LABELS[slotLockMethod]}のため暗証番号なし
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          disabled={!canSave}
          onClick={() => {
            if (!canSave) return;
            onSave(patch)
              .then(onClose)
              .catch((error: unknown) => {
                // Toasted by the mutation. A stale write closes the dialog so the next open shows
                // the refetched values (D9); any other error keeps it open to retry
                if (isLockerStaleWriteError(error)) onClose();
              });
          }}
        >
          保存
        </Button>
      </DialogFooter>
    </>
  );
}

export function SlotSettingDialog({
  open,
  formKey,
  onOpenChange,
  ...formProps
}: SlotSettingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open ? (
          <SlotSettingForm key={formKey} {...formProps} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
