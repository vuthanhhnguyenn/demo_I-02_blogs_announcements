import type {
  CreateDomainBody,
  Domain,
  DomainDetail,
  DomainListItem,
  GetDomainsQueryParams,
  GetDomainsResponse,
  UpdateDomainBody,
} from '@/app/api/_schemas/domain.schema';

import type { DbType } from '../_db.types';
import { SEED_DOMAIN_ROWS } from '../seeds/domain.seed';
import type { DomainsType } from '../types/domains.type';

export function createDomainTables(getDb: () => DbType) {
  return {
    domains: {
      _rows: [] as Domain[],
      _seeded: false,

      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        this._rows.push(...SEED_DOMAIN_ROWS.map((row) => ({ ...row })));
      },

      getList(): Domain[] {
        this._seed();
        return [...this._rows];
      },

      getById(id: string): Domain | undefined {
        this._seed();
        return this._rows.find((row) => row.id === id);
      },

      staffLinkage(domain: string) {
        const lower = domain.toLowerCase();
        const linked = getDb()
          .staffs.getList()
          .filter((staff) => {
            const at = staff.email.lastIndexOf('@');
            if (at === -1) return false;
            return staff.email.slice(at + 1).toLowerCase() === lower;
          });
        return {
          staffCount: linked.length,
          linkedStaff: linked.map((staff) => ({
            id: staff.id,
            staffId: staff.staff_id,
            name: staff.name,
            email: staff.email,
            position: staff.position_name,
            status: staff.status,
          })),
        };
      },

      toListItem(row: Domain): DomainListItem {
        return {
          id: row.id,
          name: row.name,
          domain: row.domain,
          authProvider: row.auth_provider,
          staffCount: this.staffLinkage(row.domain).staffCount,
        };
      },

      toDetail(row: Domain): DomainDetail {
        const { staffCount, linkedStaff } = this.staffLinkage(row.domain);
        return {
          id: row.id,
          name: row.name,
          domain: row.domain,
          authProvider: row.auth_provider,
          staffCount,
          createdBy: row.created_by,
          createdAt: row.created_at,
          linkedStaff,
        };
      },

      list(query: GetDomainsQueryParams): GetDomainsResponse {
        this._seed();
        const { query: search, authProvider, page, limit } = query;

        let filtered = this._rows.map((row) => this.toListItem(row));
        const count = filtered.length;

        if (search) {
          const normalized = search.toLowerCase().trim();
          filtered = filtered.filter(
            (item) =>
              item.name.toLowerCase().includes(normalized) ||
              item.domain.toLowerCase().includes(normalized),
          );
        }

        if (authProvider) {
          filtered = filtered.filter((item) => item.authProvider === authProvider);
        }

        const totalItems = filtered.length;
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const items = filtered.slice(startIndex, startIndex + limit);

        return {
          items,
          pagination: { page, limit, totalItems, totalPages },
          count,
        };
      },

      findDuplicateDomain(domain: string, excludeId?: string): Domain | undefined {
        const lower = domain.toLowerCase();
        return this._rows.find((row) => row.domain.toLowerCase() === lower && row.id !== excludeId);
      },

      create(body: CreateDomainBody) {
        this._seed();
        if (this.findDuplicateDomain(body.domain)) {
          return {
            ok: false as const,
            status: 409 as const,
            error: 'このドメインは既に登録されています',
          };
        }
        const ids = this._rows
          .map((row) => Number(row.id.replace('D-', '')))
          .filter((n) => !Number.isNaN(n));
        const nextNumber = ids.length > 0 ? Math.max(...ids) + 1 : 1;
        const row: Domain = {
          id: `D-${String(nextNumber).padStart(3, '0')}`,
          name: body.name,
          domain: body.domain,
          auth_provider: body.authProvider,
          created_by: 'システム管理者',
          created_at: new Date().toISOString(),
        };
        this._rows.push(row);
        return { ok: true as const, data: this.toDetail(row) };
      },

      update(id: string, body: UpdateDomainBody) {
        this._seed();
        const row = this._rows.find((r) => r.id === id);
        if (!row) {
          return {
            ok: false as const,
            status: 404 as const,
            error: 'ドメインが見つかりません',
          };
        }
        if (this.findDuplicateDomain(body.domain, id)) {
          return {
            ok: false as const,
            status: 409 as const,
            error: 'このドメインは既に登録されています',
          };
        }
        row.name = body.name;
        row.domain = body.domain;
        row.auth_provider = body.authProvider;
        return { ok: true as const, data: this.toDetail(row) };
      },

      remove(id: string) {
        this._seed();
        const index = this._rows.findIndex((row) => row.id === id);
        if (index === -1) {
          return {
            ok: false as const,
            status: 404 as const,
            error: 'ドメインが見つかりません',
          };
        }
        const row = this._rows[index]!;
        const { staffCount } = this.staffLinkage(row.domain);
        if (staffCount >= 1) {
          return {
            ok: false as const,
            status: 409 as const,
            error: `このドメインには紐づくスタッフが${staffCount}名います。先にスタッフの所属変更または無効化を行ってください。`,
            staffCount,
          };
        }
        this._rows.splice(index, 1);
        return { ok: true as const, data: null };
      },
    } satisfies DomainsType,
  };
}
