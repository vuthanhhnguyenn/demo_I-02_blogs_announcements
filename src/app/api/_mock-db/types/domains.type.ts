import type {
  CreateDomainBody,
  Domain,
  DomainDetail,
  DomainListItem,
  GetDomainsQueryParams,
  GetDomainsResponse,
  UpdateDomainBody,
} from '@/app/api/_schemas/domain.schema';

export type DomainTableError = {
  status: 404 | 409;
  error: string;
  staffCount?: number;
};

export type DomainTableResult<T> = { ok: true; data: T } | ({ ok: false } & DomainTableError);

export type DomainsType = {
  _rows: Domain[];
  _seeded: boolean;
  _seed(): void;
  getList(): Domain[];
  getById(id: string): Domain | undefined;
  staffLinkage(domain: string): { staffCount: number; linkedStaff: DomainDetail['linkedStaff'] };
  toListItem(row: Domain): DomainListItem;
  toDetail(row: Domain): DomainDetail;
  list(query: GetDomainsQueryParams): GetDomainsResponse;
  findDuplicateDomain(domain: string, excludeId?: string): Domain | undefined;
  create(body: CreateDomainBody): DomainTableResult<DomainDetail>;
  update(id: string, body: UpdateDomainBody): DomainTableResult<DomainDetail>;
  remove(id: string): DomainTableResult<null>;
};
