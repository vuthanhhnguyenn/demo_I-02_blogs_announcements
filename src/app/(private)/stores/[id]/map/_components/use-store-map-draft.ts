'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LockerListItemDto } from '@/lib/api-real/types.gen';

import { LOCKER_MAP_SHAPE_LABELS } from '../../../_components/locker-marker';

/** Relative to the floor image: 0.0–1.0 from its top-left corner, never pixels (FR-028) */
export interface MapPosition {
  x: number;
  y: number;
}

/** One active cabinet as this screen shows it — the subset of `LockerListItemDto` it needs */
export interface MapCabinet {
  id: string;
  /** Location symbol (A〜) */
  symbol: string;
  name: string;
  shapeLabel: string;
}

/**
 * A floor-plan image: the stored one (`file: null`, `previewUrl` = the API's signed `gymMapUrl`),
 * or one picked on this screen (the file plus its `blob:` preview) that the save will upload.
 */
export interface FloorImage {
  file: File | null;
  previewUrl: string;
}

export type ImageChange = 'register' | 'replace' | 'delete';

/** The bar's wording for each image change (prototype L92-L98) */
export const IMAGE_CHANGE_LABELS: Record<ImageChange, string> = {
  register: '登録',
  replace: '差し替え',
  delete: '削除',
};

/** `null` = unplaced */
type PositionMap = Record<string, MapPosition | null>;

/** A saved cabinet: its id, the position now stored and the `updatedAt` the next write must quote */
export interface SavedPosition {
  id: string;
  position: MapPosition | null;
  updatedAt: string;
}

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/** Same position, float noise ignored; `null` (unplaced) equals only `null` (prototype L82-L86) */
export function samePosition(a: MapPosition | null, b: MapPosition | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

/** `mapX` / `mapY` are written and read as a pair — either both set or both null */
function positionOf(locker: LockerListItemDto): MapPosition | null {
  return locker.mapX !== null && locker.mapY !== null ? { x: locker.mapX, y: locker.mapY } : null;
}

function toCabinet(locker: LockerListItemDto): MapCabinet {
  const symbol = locker.locationCode ?? '?';
  return {
    id: locker.id,
    symbol,
    // The location master's name, else the symbol, so a row is never blank on an empty name
    name: locker.locationName || symbol,
    shapeLabel: LOCKER_MAP_SHAPE_LABELS[locker.shapeType],
  };
}

function bySymbol(a: MapCabinet, b: MapCabinet): number {
  return a.symbol.localeCompare(b.symbol);
}

/** Only a picked file owns a `blob:` URL; the stored image's signed URL is not ours to revoke */
function releasePreview(image: FloorImage | null, keep: FloorImage | null) {
  if (image?.file && image !== keep) URL.revokeObjectURL(image.previewUrl);
}

function storedImageOf(url: string | null): FloorImage | null {
  return url ? { file: null, previewUrl: url } : null;
}

/**
 * The store map's two states — last saved and draft — and what differs between them
 * (prototype `store-map-setup.tsx` L264-L357). Nothing is written until the caller saves.
 *
 * The image is seeded from the store's `gymMapUrl` (`undefined` while the CMS row is still
 * loading). A re-read replaces the saved image and, unless an image change is pending, the draft.
 *
 * Positions are seeded from the cabinets' `mapX` / `mapY`. When the cabinet list is re-read (after
 * a save's invalidation, or a retry), the saved state is re-seeded from the server while every
 * position still pending in the draft is kept: a partial save must not lose the cabinets that
 * failed (FR-046), and a cabinet that left the store's active set drops out of both maps.
 */
export function useStoreMapDraft(
  lockers: LockerListItemDto[] | undefined,
  storedImageUrl: string | null | undefined,
) {
  const [seededFrom, setSeededFrom] = useState<LockerListItemDto[] | undefined>(undefined);
  const [saved, setSaved] = useState<PositionMap>({});
  const [draft, setDraft] = useState<PositionMap>({});
  /** Each cabinet's `updatedAt` as last read or written — the optimistic-lock token (E-LOC-006) */
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [imageSeededFrom, setImageSeededFrom] = useState<string | null | undefined>(undefined);
  const [savedImage, setSavedImage] = useState<FloorImage | null>(null);
  const [draftImage, setDraftImage] = useState<FloorImage | null>(null);

  if (storedImageUrl !== undefined && storedImageUrl !== imageSeededFrom) {
    const nextSaved = storedImageOf(storedImageUrl);
    const imagePending = draftImage !== savedImage;
    releasePreview(savedImage, imagePending ? draftImage : null);
    setImageSeededFrom(storedImageUrl);
    setSavedImage(nextSaved);
    if (!imagePending) setDraftImage(nextSaved);
  }

  // Re-seed during render rather than in an effect, so the first paint after a read already
  // shows the server's positions (React's "adjusting state when a prop changes" pattern).
  if (lockers && lockers !== seededFrom) {
    const nextSaved: PositionMap = {};
    const nextDraft: PositionMap = {};
    const nextVersions: Record<string, string> = {};
    for (const locker of lockers) {
      const serverPosition = positionOf(locker);
      const pending =
        locker.id in draft && !samePosition(draft[locker.id] ?? null, saved[locker.id] ?? null);
      nextSaved[locker.id] = serverPosition;
      nextDraft[locker.id] = pending ? (draft[locker.id] ?? null) : serverPosition;
      nextVersions[locker.id] = locker.updatedAt;
    }
    setSeededFrom(lockers);
    setSaved(nextSaved);
    setDraft(nextDraft);
    setVersions(nextVersions);
  }

  const cabinets = useMemo(() => (lockers ?? []).map(toCabinet).sort(bySymbol), [lockers]);

  const dirtyIds = useMemo(
    () =>
      new Set(
        Object.keys(draft).filter((id) => !samePosition(draft[id] ?? null, saved[id] ?? null)),
      ),
    [draft, saved],
  );

  const imageChange: ImageChange | null =
    savedImage === draftImage
      ? null
      : draftImage === null
        ? 'delete'
        : savedImage === null
          ? 'register'
          : 'replace';

  const isDirty = dirtyIds.size > 0 || imageChange !== null;

  // The latest images, for the unmount cleanup below without re-running it on every change
  const imagesRef = useRef({ savedImage, draftImage });
  useEffect(() => {
    imagesRef.current = { savedImage, draftImage };
  }, [savedImage, draftImage]);

  // Every `blob:` preview dies with the screen
  useEffect(
    () => () => {
      const { savedImage: kept, draftImage: pending } = imagesRef.current;
      releasePreview(pending, null);
      releasePreview(kept, null);
    },
    [],
  );

  const place = useCallback((id: string, position: MapPosition) => {
    setDraft((prev) => ({ ...prev, [id]: position }));
  }, []);

  /** Moves a placed cabinet; a no-op for an unplaced one */
  const move = useCallback(
    (id: string, next: MapPosition | ((current: MapPosition) => MapPosition)) => {
      setDraft((prev) => {
        const current = prev[id];
        if (!current) return prev;
        return { ...prev, [id]: typeof next === 'function' ? next(current) : next };
      });
    },
    [],
  );

  const unplace = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, [id]: null }));
  }, []);

  const setImage = useCallback(
    (file: File) => {
      releasePreview(draftImage, savedImage);
      setDraftImage({ file, previewUrl: URL.createObjectURL(file) });
    },
    [draftImage, savedImage],
  );

  /** Cabinet positions are kept: registering an image again shows them where they were (FR-016) */
  const removeImage = useCallback(() => {
    releasePreview(draftImage, savedImage);
    setDraftImage(null);
  }, [draftImage, savedImage]);

  const discard = useCallback(() => {
    releasePreview(draftImage, savedImage);
    setDraftImage(savedImage);
    setDraft(saved);
  }, [draftImage, savedImage, saved]);

  /**
   * Folds what was actually written into the saved state. Called with the cabinets whose write
   * succeeded only, so a failed one stays 未保存 (FR-046); `image` is true when the draft image
   * was written to the store's CMS row. The re-read of that row then swaps in the signed URL.
   */
  const markSaved = useCallback(
    ({ positions, image }: { positions: SavedPosition[]; image: boolean }) => {
      if (positions.length > 0) {
        setSaved((prev) => {
          const next = { ...prev };
          for (const { id, position } of positions) next[id] = position;
          return next;
        });
        setVersions((prev) => {
          const next = { ...prev };
          for (const { id, updatedAt } of positions) next[id] = updatedAt;
          return next;
        });
      }
      if (image) {
        releasePreview(savedImage, draftImage);
        setSavedImage(draftImage);
      }
    },
    [draftImage, savedImage],
  );

  return {
    cabinets,
    saved,
    draft,
    versions,
    dirtyIds,
    draftImage,
    imageChange,
    isDirty,
    place,
    move,
    unplace,
    setImage,
    removeImage,
    discard,
    markSaved,
  };
}
