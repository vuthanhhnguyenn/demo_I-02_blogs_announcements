'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { adminLockerControllerListLocationsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerLocationDto } from '@/lib/api-real/types.gen';

/** 「A: 更衣室エリア」 */
export function formatLockerLocationLabel(
  location: Pick<LockerLocationDto, 'locationCode' | 'locationName'>,
) {
  return `${location.locationCode}: ${location.locationName}`;
}

/**
 * The A–Z location master (`GET /admin/locker-locations`), replacing the hard-coded area lists.
 * Small and rarely changed, so it is cached for the session.
 */
export function useLockerLocations() {
  const query = useQuery({
    ...adminLockerControllerListLocationsOptions(),
    staleTime: Infinity,
  });

  const locations = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const byId = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );

  return { ...query, locations, byId };
}
