import type { AppVersionPairDto } from '@/lib/api-real/types.gen';

/**
 * Y-05 FR-M007 比べ方: compare the dot-separated parts of the version name as numbers
 * (1.10.0 > 1.9.0), then the build number. Never compared as strings.
 */
export function compareAppVersionPair(a: AppVersionPairDto, b: AppVersionPairDto): number {
  const partsA = a.versionName.split('.').map(Number);
  const partsB = b.versionName.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.buildNumber - b.buildNumber;
}
