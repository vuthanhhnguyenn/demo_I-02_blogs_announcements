import type { OneDayPassException } from '@/app/api/_schemas/store-one-day-pass.schema';
import type { Store, StoreChangeHistoryEntry } from '@/app/api/_schemas/store.schema';

export type StoresType = {
  _rows: Store[];
  _seeded: boolean;
  _seed(): void;
  getList(): Store[];
  getById(id: string): Store | undefined;
  create(input: Omit<Store, 'id' | 'store_id' | 'created_at' | 'updated_at'>): Store;
  updateById(id: string, patch: Partial<Store>): Store | undefined;
  setManagerStaff(storeId: string, manager_staff_id: string | null): void;
  changeTerritory(
    storeIds: string[],
    territoryId: string,
    allowedStoreIds: string[] | null,
  ): { updated: Store[]; failed: { store_id: string; name: string; reason: string }[] };
};

export type StoreChangeHistoryType = {
  _rows: StoreChangeHistoryEntry[];
  _seeded: boolean;
  _seed(): void;
  listByStoreId(storeId: string): StoreChangeHistoryEntry[];
};

export type StoreOneDayPassPricesType = {
  _byStoreId: Record<string, OneDayPassException[]>;
  _seeded: boolean;
  _seed(): void;
  listByStoreId(storeId: string): OneDayPassException[];
  upsertMany(
    storeId: string,
    dates: string[],
    price: number,
    note: string | null,
  ): OneDayPassException[];
  deleteMany(storeId: string, dates: string[]): OneDayPassException[];
};
