import type { AreaBrandGroup } from '../_constants/area.constants';

/** Sub-brand (`brandEnum`) → the area brand group: FIT365 is its own, every JOYFIT sub-brand is JOYFIT. */
export function toAreaBrandGroup(brandEnum: string | null | undefined): AreaBrandGroup | null {
  if (!brandEnum) return null;
  return brandEnum === 'Fit365' ? 'FIT365' : 'JOYFIT';
}

/**
 * The 「ブランドを ○○ に変えたため…外しました」 notice of the plan / option forms: 利用できるエリア are per
 * brand group, so a JOYFIT ⇄ FIT365 change drops them. Null when the brand group did not change.
 */
export function areaBrandChangeNotice(
  previousBrandEnum: string | null | undefined,
  nextBrandEnum: string,
  selectedIds: readonly string[],
  knownAreas: ReadonlyArray<{ id: string; name: string }>,
): string | null {
  const prev = toAreaBrandGroup(previousBrandEnum);
  const next = toAreaBrandGroup(nextBrandEnum);
  if (!prev || !next || prev === next || selectedIds.length === 0) return null;
  const names = selectedIds
    .map((id) => knownAreas.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join('・');
  return `ブランドを ${next} に変えたため、選んでいたエリア（${names}）を外しました`;
}
