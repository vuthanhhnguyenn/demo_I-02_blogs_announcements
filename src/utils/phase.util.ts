import { PHASE2_ROUTE_PREFIXES } from '../constants/phase.constants';

/**
 * Returns true if the pathname belongs to a Phase 2 screen. Segment-aware, so
 * `/banners-x` does not match `/banners` while `/banners/1/edit` does.
 */
export function isPhase2Route(pathname: string): boolean {
  return PHASE2_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}
