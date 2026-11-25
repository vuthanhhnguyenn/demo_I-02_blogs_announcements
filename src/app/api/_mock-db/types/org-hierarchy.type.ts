import type { OrgArea } from '@/app/api/_schemas/org-hierarchy.schema';

import type { OrgNodeRow } from '../seeds/org-hierarchy.seed';

/** Resolved hierarchy path of a territory: head office > block > area > territory */
export type OrgTerritoryPath = {
  headquarters: OrgNodeRow;
  block: OrgNodeRow;
  area: OrgNodeRow;
  territory: OrgNodeRow;
};

export type OrgNodesType = {
  _rows: OrgNodeRow[];
  _seeded: boolean;
  _seed(): void;
  getList(): OrgNodeRow[];
  getById(id: string): OrgNodeRow | undefined;
  /** Areas with their territories, blocks/head offices resolved — one call feeds the whole screen */
  listAreas(): OrgArea[];
  /** Full path of a territory, or `undefined` for an unknown / non-territory id */
  getTerritoryPath(territoryId: string | null | undefined): OrgTerritoryPath | undefined;
};
