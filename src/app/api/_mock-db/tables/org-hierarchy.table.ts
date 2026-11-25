import type { OrgArea } from '@/app/api/_schemas/org-hierarchy.schema';

import { type OrgNodeRow, SEED_ORG_NODES } from '../seeds/org-hierarchy.seed';
import type { OrgTerritoryPath } from '../types/org-hierarchy.type';

/**
 * Y-15 organisational hierarchy — read-only. The only thing this phase writes is the store's
 * own `territory_id`; maintaining the nodes themselves belongs to the Y-15 screens, so only
 * read accessors are exposed here.
 */
export function createOrgHierarchyTables() {
  return {
    orgNodes: {
      _rows: [] as OrgNodeRow[],
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        this._rows.push(...SEED_ORG_NODES.map((node) => ({ ...node })));
      },
      getList(): OrgNodeRow[] {
        this._seed();
        return [...this._rows];
      },
      getById(id: string): OrgNodeRow | undefined {
        this._seed();
        return this._rows.find((node) => node.id === id);
      },
      listAreas(): OrgArea[] {
        this._seed();
        const byId = new Map(this._rows.map((node) => [node.id, node]));

        return this._rows
          .filter((node) => node.level === 'area')
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((area) => {
            const block = area.parent_id ? byId.get(area.parent_id) : undefined;
            const headquarters = block?.parent_id ? byId.get(block.parent_id) : undefined;

            return {
              id: area.id,
              name: area.name,
              block_name: block?.name ?? '',
              headquarters_name: headquarters?.name ?? '',
              territories: this._rows
                .filter((node) => node.level === 'territory' && node.parent_id === area.id)
                .sort((a, b) => a.order - b.order)
                .map((territory) => ({
                  id: territory.id,
                  name: territory.name,
                  active: territory.active,
                  note: territory.note,
                })),
            };
          });
      },
      getTerritoryPath(territoryId: string | null | undefined): OrgTerritoryPath | undefined {
        if (!territoryId) return undefined;
        this._seed();
        const territory = this._rows.find(
          (node) => node.id === territoryId && node.level === 'territory',
        );
        if (!territory?.parent_id) return undefined;
        const area = this._rows.find((node) => node.id === territory.parent_id);
        if (!area?.parent_id) return undefined;
        const block = this._rows.find((node) => node.id === area.parent_id);
        if (!block?.parent_id) return undefined;
        const headquarters = this._rows.find((node) => node.id === block.parent_id);
        if (!headquarters) return undefined;
        return { headquarters, block, area, territory };
      },
    },
  };
}
