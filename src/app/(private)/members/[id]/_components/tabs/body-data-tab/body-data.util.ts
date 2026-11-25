import type {
  BodyDataForbiddenErrorResponseDto,
  MemberBodyHistoryItemDto,
} from '@/lib/api-real/types.gen';

/**
 * `body_record_source` + `measurement_source` labels. 「iOSヘルスケア」/「Androidヘルスコネクト」 follow the mobile spec
 * (APP-X-02).
 */
export const SOURCE_LABELS: Record<MemberBodyHistoryItemDto['source'], string> = {
  manual: '手動',
  healthkit: 'iOSヘルスケア',
  health_connect: 'Androidヘルスコネクト',
  body_planner: 'Body Planner',
  scanner_3d: '3DScanner',
};

/** Every metric on this tab is nullable — a source only populates the columns it measures. */
export function formatMetric(value: number | null | undefined, unit?: string): string {
  if (value == null) return '—';
  return unit ? `${value} ${unit}` : `${value}`;
}

export type BodyDataConsentStatus = 'pending' | 'denied';

/** `E-BDY-100` — the member has not consented to CRM body-data sharing (FR-013). */
const CONSENT_REQUIRED_CODE = 'E-BDY-100';

/**
 * Which not-granted state a refused body-data read is in, or `null` for any other error.
 */
export function getBodyDataConsentStatus(error: unknown): BodyDataConsentStatus | null {
  if (typeof error !== 'object' || error === null) return null;
  const { code, details } = error as Partial<BodyDataForbiddenErrorResponseDto>;
  if (code !== CONSENT_REQUIRED_CODE) return null;
  // An unknown value still means "not granted"; fall back to the neutral pending copy.
  return details?.consentStatus === 'denied' ? 'denied' : 'pending';
}
