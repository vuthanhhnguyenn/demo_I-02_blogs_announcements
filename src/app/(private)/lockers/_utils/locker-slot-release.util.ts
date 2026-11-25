/** One slot picked for 開放 (clean + release): its id for the API, its 「A-001」 label for the dialog */
export type LockerSlotReleaseTarget = {
  slotId: string;
  label: string;
};

/** `POST /admin/locker-slots/open-bulk` takes at most 50 slot ids per call */
export const LOCKER_BULK_OPEN_MAX = 50;

export function chunkReleaseTargets(
  targets: LockerSlotReleaseTarget[],
  size: number = LOCKER_BULK_OPEN_MAX,
): LockerSlotReleaseTarget[][] {
  const unique = [...new Map(targets.map((target) => [target.slotId, target])).values()];
  const chunks: LockerSlotReleaseTarget[][] = [];
  for (let i = 0; i < unique.length; i += size) chunks.push(unique.slice(i, i + size));
  return chunks;
}

export function releaseTargetsFromSelection(
  selection: Map<string, LockerSlotReleaseTarget>,
): LockerSlotReleaseTarget[] {
  return Array.from(selection.values());
}
