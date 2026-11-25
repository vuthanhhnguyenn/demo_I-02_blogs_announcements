import { useCallback, useState } from 'react';

import { toast } from 'sonner';

import { resolveApiErrorMessage } from '@/lib/api-error.util';

import {
  type CampaignGenderConflict,
  readCampaignGenderConflict,
} from '../_utils/campaign-gender-conflict';

/**
 * The `onError` of a save the API may refuse with an auto-grant gender conflict (E-02 FR-016:
 * E-ARE-004 / E-CMP-024). The mutation sets `meta: { suppressErrorToast: true }` and passes its
 * error to `handleError`, which opens `CampaignGenderConflictDialog` for a conflict and toasts the
 * API message for anything else. Returns true when it opened the dialog.
 */
export function useCampaignGenderConflict() {
  const [conflict, setConflict] = useState<CampaignGenderConflict | null>(null);

  const handleError = useCallback((error: unknown): boolean => {
    const found = readCampaignGenderConflict(error);
    if (found) {
      setConflict(found);
      return true;
    }
    toast.error(resolveApiErrorMessage(error));
    return false;
  }, []);

  const close = useCallback(() => setConflict(null), []);

  return { conflict, handleError, close };
}
