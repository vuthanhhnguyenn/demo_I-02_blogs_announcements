import type {
  CreateLockerDto,
  LockerDetailDto,
  UpdateLockerDto,
  UpdateLockerSlotDto,
} from '@/lib/api-real/types.gen';

import type {
  LockerFormSubmitValues,
  LockerFormValues,
  LockerSelectableLockMethod,
} from '../_schemas/locker-form.schema';
import { LOCKER_SLOT_START_NUMBER } from './locker-slot-numbering.util';

export const emptyLockerFormDefaults: LockerFormValues = {
  storeId: '',
  lockerLocationId: '',
  locationCaption: '',
  supplementaryNote: '',
  images: [],
  // API-100 §7.5: 「3 列 × 9 段」 is the default shape
  shapeType: 'three_by_nine',
  orderType: 'top_left_to_top_right',
  optionId: null,
  openMethod: 'door',
  lockMethod: 'dial_lock',
  slotSize: { widthCm: '', heightCm: '', depthCm: '' },
  slotLockSettings: [],
};

/** `ic_lock` is not selectable (API-100 §7.5); a legacy cabinet carrying it shows the default */
function toSelectableLockMethod(value: LockerDetailDto['lockMethod']): LockerSelectableLockMethod {
  return value === 'ic_lock' ? 'dial_lock' : value;
}

export function lockerDetailToFormValues(locker: LockerDetailDto): LockerFormValues {
  return {
    storeId: locker.storeId,
    lockerLocationId: locker.lockerLocationId,
    locationCaption: locker.locationCaption ?? '',
    supplementaryNote: locker.supplementaryNote ?? '',
    images: locker.images.map((image) => ({
      imageId: image.id,
      imageS3Key: image.imageS3Key,
      imageUrl: image.imageUrl,
    })),
    shapeType: locker.shapeType,
    orderType: locker.orderType,
    optionId: locker.optionId,
    openMethod: locker.openMethod,
    lockMethod: toSelectableLockMethod(locker.lockMethod),
    slotSize: {
      widthCm: String(locker.slotSizeWCm),
      heightCm: String(locker.slotSizeHCm),
      depthCm: String(locker.slotSizeDCm),
    },
    // Per-slot settings live on the slots themselves after creation (スロット管理 tab)
    slotLockSettings: [],
  };
}

export function lockerFormValuesToCreateBody(values: LockerFormSubmitValues): CreateLockerDto {
  return {
    storeId: values.storeId,
    lockerLocationId: values.lockerLocationId,
    locationCaption: values.locationCaption || null,
    supplementaryNote: values.supplementaryNote || null,
    shapeType: values.shapeType,
    orderType: values.orderType,
    slotStartNumber: LOCKER_SLOT_START_NUMBER,
    optionId: values.optionId,
    slotSizeWCm: values.slotSize.widthCm,
    slotSizeHCm: values.slotSize.heightCm,
    slotSizeDCm: values.slotSize.depthCm,
    lockMethod: values.lockMethod,
    openMethod: values.openMethod,
    images: values.images.map((image) => ({ imageS3Key: image.imageS3Key })),
  };
}

/**
 * Edit body: only what changed (PATCH), plus the optimistic-lock token. Images are not part of the
 * PATCH (`UpdateLockerDto` has none) — the page adds / deletes them through the image endpoints.
 */
export function lockerFormValuesToUpdateBody(
  values: LockerFormSubmitValues,
  locker: LockerDetailDto,
): UpdateLockerDto {
  const body: UpdateLockerDto = { expectedUpdatedAt: locker.updatedAt };
  const caption = values.locationCaption || null;
  const note = values.supplementaryNote || null;

  if (values.lockerLocationId !== locker.lockerLocationId) {
    body.lockerLocationId = values.lockerLocationId;
  }
  if (caption !== locker.locationCaption) body.locationCaption = caption;
  if (note !== locker.supplementaryNote) body.supplementaryNote = note;
  if (values.shapeType !== locker.shapeType) body.shapeType = values.shapeType;
  if (values.orderType !== locker.orderType) body.orderType = values.orderType;
  if (values.optionId !== locker.optionId) {
    body.optionId = values.optionId;
    // A bottom default that only mirrored the old code (MIG-002 sets both to 9001) is cleared so
    // the bottom row follows the new 契約形態コード (API-100 §6.3 #6). A deliberate one is kept.
    if (locker.bottomOptionId === locker.optionId) body.bottomOptionId = null;
  }
  if (values.slotSize.widthCm !== locker.slotSizeWCm) body.slotSizeWCm = values.slotSize.widthCm;
  if (values.slotSize.heightCm !== locker.slotSizeHCm) body.slotSizeHCm = values.slotSize.heightCm;
  if (values.slotSize.depthCm !== locker.slotSizeDCm) body.slotSizeDCm = values.slotSize.depthCm;
  // Compared with the value the form loaded, so an untouched legacy `ic_lock` cabinet keeps it
  // (§3.5 omitted = no change) instead of being rewritten to `dial_lock` on any other save
  if (values.lockMethod !== toSelectableLockMethod(locker.lockMethod)) {
    body.lockMethod = values.lockMethod;
  }
  if (values.openMethod !== locker.openMethod) body.openMethod = values.openMethod;

  return body;
}

/**
 * D14: `POST /lockers` creates every slot with the cabinet default lock; each per-slot override
 * of the form becomes one `PATCH /locker-slots/{slotId}` (matched by `slotCode`).
 */
export function slotLockOverridesToPatches(
  values: LockerFormSubmitValues,
  slots: LockerDetailDto['slots'],
): { slotId: string; slotCode: string; body: UpdateLockerSlotDto }[] {
  const slotIdByCode = new Map(slots.map((slot) => [slot.slotCode, slot.id]));
  return values.slotLockSettings.flatMap((setting) => {
    const slotId = slotIdByCode.get(setting.slotCode);
    if (!slotId) return [];
    const body: UpdateLockerSlotDto = {};
    if (setting.lockMethod !== values.lockMethod) body.lockMethod = setting.lockMethod;
    if (setting.lockMethod === 'dial_lock' && setting.pinCode) body.pinCode = setting.pinCode;
    return Object.keys(body).length > 0 ? [{ slotId, slotCode: setting.slotCode, body }] : [];
  });
}
