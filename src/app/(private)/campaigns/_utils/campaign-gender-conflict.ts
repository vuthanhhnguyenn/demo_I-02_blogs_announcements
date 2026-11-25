import { getApiErrorCode, resolveApiErrorMessage } from '@/lib/api-error.util';

/**
 * E-02 FR-016 × campaign 自動付与: the errors the API answers when an auto-grant option would reach a
 * member its areas' gender condition does not admit. Their `details` name what is in the way, so the
 * operator can tell which campaign / option to deal with instead of a bare message.
 *
 * - `E-ARE-004` (plan / option / area edit): `details.conflictingCampaigns[]` — the accepting
 *   campaigns the edit would break. A campaign cannot be edited once registered, so the way out is
 *   to stop it (受付停止) and save again.
 * - `E-CMP-024` (switching a stopped campaign back on) and `E-CMP-023` (campaign create / copy):
 *   `details.misfitAutoOptions[]` — the auto-grant options that do not fit.
 */

export interface ConflictingCampaign {
  campaignId: string;
  campaignNumber: string;
  name: string;
  autoOptions: Array<{ optionId: string; optionName: string | null }>;
}

export interface MisfitAutoOption {
  /** Index into the campaign's `campaignAutoOptions` as sent / stored. */
  index: number;
  optionId: string;
  optionName: string | null;
}

export type CampaignGenderConflict =
  | { kind: 'master-edit'; message: string; campaigns: ConflictingCampaign[] }
  | { kind: 'auto-grant'; message: string; options: MisfitAutoOption[] };

function detailsOf(error: unknown): Record<string, unknown> | undefined {
  const details = (error as { details?: unknown } | null)?.details;
  return details && typeof details === 'object' && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : undefined;
}

function isMisfit(value: unknown): value is MisfitAutoOption {
  const v = value as Partial<MisfitAutoOption> | null;
  return typeof v?.index === 'number' && typeof v.optionId === 'string';
}

function isConflictingCampaign(value: unknown): value is ConflictingCampaign {
  const v = value as Partial<ConflictingCampaign> | null;
  return (
    typeof v?.campaignId === 'string' &&
    typeof v.campaignNumber === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.autoOptions)
  );
}

/** The misfit auto-grants of an `E-CMP-023` / `E-CMP-024` rejection, `[]` for any other error. */
export function getMisfitAutoOptions(error: unknown): MisfitAutoOption[] {
  const code = getApiErrorCode(error);
  if (code !== 'E-CMP-023' && code !== 'E-CMP-024') return [];
  const list = detailsOf(error)?.misfitAutoOptions;
  return Array.isArray(list) ? list.filter(isMisfit) : [];
}

/**
 * The conflict an error describes, or null when it is not one of these — or when its `details`
 * name nothing, since a dialog with an empty list says no more than the plain error toast.
 */
export function readCampaignGenderConflict(error: unknown): CampaignGenderConflict | null {
  const code = getApiErrorCode(error);
  if (code === 'E-ARE-004') {
    const list = detailsOf(error)?.conflictingCampaigns;
    const campaigns = Array.isArray(list) ? list.filter(isConflictingCampaign) : [];
    if (campaigns.length === 0) return null;
    return { kind: 'master-edit', message: resolveApiErrorMessage(error), campaigns };
  }
  if (code === 'E-CMP-023' || code === 'E-CMP-024') {
    const options = getMisfitAutoOptions(error);
    if (options.length === 0) return null;
    return { kind: 'auto-grant', message: resolveApiErrorMessage(error), options };
  }
  return null;
}
