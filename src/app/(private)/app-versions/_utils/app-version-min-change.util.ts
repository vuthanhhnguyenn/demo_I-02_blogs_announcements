import type { AppVersionDto, AppVersionPairDto } from '@/lib/api-real/types.gen';

import {
  APP_VERSION_OSES,
  type AppVersionOs,
  appVersionSlot,
} from '../_constants/app-version.constants';
import { type AppVersionFormSubmitValues, enteredPair } from '../_schemas/app-version-form.schema';
import { compareAppVersionPair } from './app-version-compare.util';

export interface AppVersionMinChange {
  os: AppVersionOs;
  /** The minimum in effect now; null when the brand has never had one for this OS. */
  before: AppVersionPairDto | null;
  after: AppVersionPairDto;
  direction: 'raise' | 'lower';
}

/**
 * FR-M002 引き上げ／引き下げの確認: per OS, how the entered minimum moves against the setting in
 * effect now. A blank minimum carries over and so changes nothing; a first minimum counts as a
 * raise, since it starts requiring updates.
 */
export function getAppVersionMinChanges(
  active: AppVersionDto | null,
  values: AppVersionFormSubmitValues,
): AppVersionMinChange[] {
  const changes: AppVersionMinChange[] = [];
  for (const os of APP_VERSION_OSES) {
    const slot = appVersionSlot(os, 'Min');
    const after = enteredPair(values, slot);
    if (!after) continue;
    const before = active?.effective[slot] ?? null;
    const diff = before ? compareAppVersionPair(after, before) : 1;
    if (diff === 0) continue;
    changes.push({ os, before, after, direction: diff > 0 ? 'raise' : 'lower' });
  }
  return changes;
}
