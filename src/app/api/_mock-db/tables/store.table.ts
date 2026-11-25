import type { StoreHolidaysResponse } from '@/app/api/_schemas/lesson-schedule.schema';
import type { StoreAccessSettings } from '@/app/api/_schemas/store-access-settings.schema';
import type { OneDayPassException } from '@/app/api/_schemas/store-one-day-pass.schema';
import type {
  StoreLinkedMainContract,
  StoreLinkedOption,
} from '@/app/api/_schemas/store-sales-settings.schema';
import type {
  DefaultHoursEntry,
  Store,
  StoreBusinessHours,
  StoreChangeHistoryEntry,
} from '@/app/api/_schemas/store.schema';
import { formatISODateLocal } from '@/utils/date.util';

import type { DbType } from '../_db.types';

/**
 * A newly opened store seeded on purpose **without members**, so screens that scope by
 * store have a genuinely empty scope to render. `members.table.ts` excludes it from the
 * round-robin that assigns members to stores — appending it therefore leaves every other
 * member's store untouched.
 */
export const MEMBERLESS_STORE_CODE = 'STR-10011';

/**
 * One weekly business-hour row. Opening is 10:00 chain-wide; the closing time and the staff
 * resident window differ per day (Y-02 FR-005). `staffEnd = null` means no staff on site.
 */
function WEEKDAY_HOURS(
  day: DefaultHoursEntry['day'],
  closeTime: string,
  staffEnd: string | null,
): DefaultHoursEntry {
  return {
    day,
    open_time: '10:00',
    close_time: closeTime,
    is_closed: false,
    staff_start_time: staffEnd === null ? null : '10:00',
    staff_end_time: staffEnd,
  };
}

/**
 * Club-code prefix of the stores seeded purely to give the store master (Y-02 FR-001) a
 * realistic size: paging, cross-page selection and the bulk territory change's before/after
 * distribution are not observable on 13 rows.
 *
 * They are deliberately inert everywhere else: directly-managed (no FC company, so Y-03's
 * jurisdiction store counts are untouched), no main contract, no locker map, and `members.table.ts`
 * excludes them from the round-robin that assigns members to stores — so every other
 * screen's data is exactly what it was before these rows existed.
 */
export const TERRITORY_DEMO_CLUB_CODE_PREFIX = 'ST-';

type StoreSeedSpec = {
  name: string;
  brand: Store['brand'];
  code: string;
  pass: number;
  mutualOn: boolean;
  mutualType: Store['mutual_use_type'];
  fc?: string | null;
  contract?: NonNullable<Store['main_contract_status']>;
  closing?: string | null;
  area: Store['area'];
  operating_company_name: string;
  status: Store['status'];
  /** Y-02 FR-001 prefecture column. Optional — `STORE_LOCATION_BY_ID` fills it in for the original rows */
  prefecture?: string;
  /** Y-15 territory. `null` means unassigned, which the list renders as "not set" */
  territory?: string | null;
  /** Y-02 FR-002 detail-only attributes (basic-info tab of the store detail screen) */
  name_kana?: string;
  postal_code?: string;
  address?: string;
  phone?: string;
  fax?: string;
  /** Y-02 FR-002 opening-related dates — the same three-way split as the BE design (spec `028-store-form` FR-019) */
  receipt_date?: string;
  preopen_date?: string;
  grand_open_date?: string;
  gender_restriction?: Store['gender_restriction'];
  memo?: string | null;
};

/**
 * Prefecture (a Y-02 FR-001 display item) and the Y-15 territory for the original 13 stores.
 * Kept as a lookup so their seed definitions above stay untouched; it is keyed by store id
 * rather than club code because two of them share the club code `STR-10011`. Territory ids
 * follow the numbering in `seeds/org-hierarchy.seed.ts` (TRT-001… in area order).
 */
const STORE_LOCATION_BY_ID: Record<string, { prefecture: string; territory: string | null }> = {
  'store-001': { prefecture: '埼玉県', territory: 'TRT-002' }, // Fit365八潮店 / 埼玉南テリトリー
  'store-002': { prefecture: '東京都', territory: 'TRT-001' }, // Fit365新宿店 / 東京中央テリトリー
  'store-003': { prefecture: '東京都', territory: 'TRT-001' }, // Fit365渋谷店
  'store-004': { prefecture: '東京都', territory: 'TRT-009' }, // JOYFIT池袋店 / 城北テリトリー
  'store-005': { prefecture: '埼玉県', territory: 'TRT-005' }, // JOYFIT大宮店 / 埼玉北テリトリー
  'store-006': { prefecture: '東京都', territory: 'TRT-001' }, // JOYFIT24 新宿店
  'store-007': { prefecture: '大阪府', territory: 'TRT-042' }, // JOYFIT YOGA 心斎橋店 / 大阪中央
  'store-008': { prefecture: '愛知県', territory: 'TRT-037' }, // JOYFIT+ 名古屋駅前店 / 名古屋
  'store-009': { prefecture: '大阪府', territory: 'TRT-042' }, // Fit365梅田店
  'store-010': { prefecture: '静岡県', territory: 'TRT-041' }, // ジョイフィット静岡店 / 静岡・東三河
  'store-011': { prefecture: '大阪府', territory: 'TRT-042' }, // JOYFIT24 天王寺店
  'store-012': { prefecture: '東京都', territory: 'TRT-009' }, // JOYFIT東十条店
  'store-013': { prefecture: '岩手県', territory: 'TRT-029' }, // JOYFIT盛岡店 / 岩手テリトリー
};

/** One fixed timestamp for every added store — the mock stays deterministic (no Math.random()) */
const TERRITORY_DEMO_STORE_META = {
  c: '2025-04-01T09:00:00Z',
  u: '2026-04-01T09:00:00Z',
  cb: 'STF-001',
  ub: 'STF-001',
};

/**
 * 38 stores added for the store master list. They are spread across areas and territories so
 * the cascade filter, cross-page selection, the bulk dialog's before/after distribution and
 * its cross-area warning all have something to show. Every one is directly managed (no FC
 * company); three are closed; the last one has no territory, to exercise the "not set" rendering.
 */
const TERRITORY_DEMO_STORE_SPECS: StoreSeedSpec[] = (
  [
    ['JOYFIT24川口店', 'joyfit24', '埼玉県', 'TRT-002'],
    ['JOYFIT草加店', 'joyfit', '埼玉県', 'TRT-002'],
    ['JOYFIT24松戸店', 'joyfit24', '千葉県', 'TRT-003'],
    ['JOYFIT柏店', 'joyfit', '千葉県', 'TRT-003'],
    ['JOYFIT+流山店', 'joyfit_plus', '千葉県', 'TRT-003'],
    ['JOYFIT川越店', 'joyfit', '埼玉県', 'TRT-004'],
    ['JOYFIT24所沢店', 'joyfit24', '埼玉県', 'TRT-004'],
    ['JOYFIT24上尾店', 'joyfit24', '埼玉県', 'TRT-005'],
    ['JOYFIT24錦糸町店', 'joyfit24', '東京都', 'TRT-006'],
    ['JOYFIT YOGA 押上店', 'joyfit_yoga', '東京都', 'TRT-006'],
    ['JOYFIT24豊洲店', 'joyfit24', '東京都', 'TRT-007'],
    ['Fit365葛西店', 'fit365', '東京都', 'TRT-007'],
    ['JOYFIT上野店', 'joyfit', '東京都', 'TRT-008'],
    ['JOYFIT24北千住店', 'joyfit24', '東京都', 'TRT-008'],
    ['JOYFIT24中野店', 'joyfit24', '東京都', 'TRT-010'],
    ['JOYFIT荻窪店', 'joyfit', '東京都', 'TRT-010', 'closed'],
    ['JOYFIT24川崎店', 'joyfit24', '神奈川県', 'TRT-011'],
    ['Fit365武蔵小杉店', 'fit365', '神奈川県', 'TRT-011'],
    ['JOYFIT24横浜西口店', 'joyfit24', '神奈川県', 'TRT-014'],
    ['JOYFIT関内店', 'joyfit', '神奈川県', 'TRT-014'],
    ['JOYFIT24新横浜店', 'joyfit24', '神奈川県', 'TRT-015'],
    ['JOYFIT24船橋店', 'joyfit24', '千葉県', 'TRT-017'],
    ['JOYFIT市川店', 'joyfit', '千葉県', 'TRT-017'],
    ['JOYFIT24千葉中央店', 'joyfit24', '千葉県', 'TRT-020'],
    ['JOYFIT24高崎店', 'joyfit24', '群馬県', 'TRT-023'],
    ['JOYFIT前橋店', 'joyfit', '群馬県', 'TRT-023', 'closed'],
    ['JOYFIT24水戸店', 'joyfit24', '茨城県', 'TRT-024'],
    ['JOYFIT24仙台泉店', 'joyfit24', '宮城県', 'TRT-027'],
    ['JOYFIT仙台長町店', 'joyfit', '宮城県', 'TRT-027'],
    ['JOYFIT24札幌大通店', 'joyfit24', '北海道', 'TRT-032'],
    ['JOYFIT札幌北店', 'joyfit', '北海道', 'TRT-032'],
    ['JOYFIT24岐阜店', 'joyfit24', '岐阜県', 'TRT-039'],
    ['JOYFIT24江坂店', 'joyfit24', '大阪府', 'TRT-043'],
    ['JOYFIT24神戸三宮店', 'joyfit24', '兵庫県', 'TRT-046'],
    ['JOYFIT西宮店', 'joyfit', '兵庫県', 'TRT-046', 'closed'],
    ['JOYFIT24広島紙屋町店', 'joyfit24', '広島県', 'TRT-048'],
    ['JOYFIT24博多店', 'joyfit24', '福岡県', 'TRT-051'],
    // No territory yet, as a newly opened store would be — renders as "not set" in the list
    ['JOYFIT高松店', 'joyfit', '香川県', null],
  ] as const
).map(([name, brand, prefecture, territory, status], index) => ({
  name,
  brand: brand as Store['brand'],
  code: `${TERRITORY_DEMO_CLUB_CODE_PREFIX}${String(101 + index)}`,
  pass: 900,
  mutualOn: true,
  mutualType: 'within_brand' as Store['mutual_use_type'],
  area: 'other' as Store['area'],
  operating_company_name: '株式会社ウェルネスフロンティア',
  status: (status ?? 'operating') as Store['status'],
  prefecture,
  territory,
}));

export function createStoreTables(getDb: () => DbType) {
  return {
    storeMainContracts: {
      _rows: [] as Array<{ store_id: string; main_contract_id: string; linked_at: string }>,
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        getDb().stores._seed();
        getDb().mainContracts._seed();
        const seeds = [
          { store_id: 'store-001', ids: ['MC001', 'MC002', 'MC003'] },
          { store_id: 'store-002', ids: ['MC001', 'MC001-A'] },
          { store_id: 'store-006', ids: ['MC001', 'MC005'] },
        ];
        for (const seed of seeds) {
          for (const id of seed.ids) {
            this._rows.push({
              store_id: seed.store_id,
              main_contract_id: id,
              linked_at: '2024/04/01',
            });
          }
        }
      },
      listByStoreId(storeId: string): StoreLinkedMainContract[] {
        this._seed();
        getDb().mainContracts._seed();
        const masterMap = new Map(
          getDb()
            .mainContracts.getList()
            .map((item) => [item.id, item]),
        );
        return this._rows
          .filter((row) => row.store_id === storeId)
          .map((row) => {
            const master = masterMap.get(row.main_contract_id);
            if (!master) return undefined;
            return {
              id: master.id,
              name: master.name,
              contract_type: master.contract_type,
              price_including_tax: master.price_including_tax,
              linked_at: row.linked_at,
            };
          })
          .filter((item): item is StoreLinkedMainContract => Boolean(item));
      },
      addByStoreId(storeId: string, mainContractIds: string[]): StoreLinkedMainContract[] {
        this._seed();
        const current = new Set(
          this._rows.filter((row) => row.store_id === storeId).map((row) => row.main_contract_id),
        );
        const today = formatISODateLocal(new Date()).replaceAll('-', '/');
        for (const id of mainContractIds) {
          if (current.has(id)) continue;
          this._rows.push({ store_id: storeId, main_contract_id: id, linked_at: today });
        }
        return this.listByStoreId(storeId);
      },
      removeByStoreId(storeId: string, mainContractId: string): boolean {
        this._seed();
        const before = this._rows.length;
        this._rows = this._rows.filter(
          (row) => !(row.store_id === storeId && row.main_contract_id === mainContractId),
        );
        return this._rows.length < before;
      },
    },

    storeOptions: {
      _rows: [] as Array<{ store_id: string; option_id: string; linked_at: string }>,
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        getDb().stores._seed();
        getDb().optionMasters._seed();
        // Each store keeps a mix of prorated (OP001/OP002 = 日割りあり) and
        // non-prorated options so the option-add sheet can be exercised both ways
        const seeds = [
          { store_id: 'store-001', ids: ['OP002', 'OP003', 'OP006'] },
          { store_id: 'store-002', ids: ['OP001', 'OP007'] },
          { store_id: 'store-003', ids: ['OP001', 'OP003', 'OP007'] },
          { store_id: 'store-004', ids: ['OP002', 'OP004'] },
          { store_id: 'store-005', ids: ['OP001', 'OP005', 'OP006'] },
          { store_id: 'store-006', ids: ['OP021'] },
        ];
        for (const seed of seeds) {
          for (const id of seed.ids) {
            this._rows.push({ store_id: seed.store_id, option_id: id, linked_at: '2024/04/01' });
          }
        }
      },
      listByStoreId(storeId: string): StoreLinkedOption[] {
        this._seed();
        getDb().optionMasters._seed();
        const masterMap = new Map(
          getDb()
            .optionMasters.getList()
            .map((item) => [item.id, item]),
        );
        return this._rows
          .filter((row) => row.store_id === storeId)
          .map((row) => {
            const master = masterMap.get(row.option_id);
            if (!master) return undefined;
            return {
              id: master.id,
              name: master.name,
              related_option_name:
                master.option_type === 'metered'
                  ? 'パーソナル'
                  : master.option_type === 'auto_attached'
                    ? '自動付与'
                    : null,
              price_including_tax: master.price_including_tax,
              prorated_enabled: master.prorated_enabled,
            };
          })
          .filter((item): item is StoreLinkedOption => Boolean(item));
      },
      addByStoreId(storeId: string, optionIds: string[]): StoreLinkedOption[] {
        this._seed();
        const current = new Set(
          this._rows.filter((row) => row.store_id === storeId).map((row) => row.option_id),
        );
        const today = formatISODateLocal(new Date()).replaceAll('-', '/');
        for (const id of optionIds) {
          if (current.has(id)) continue;
          this._rows.push({ store_id: storeId, option_id: id, linked_at: today });
        }
        return this.listByStoreId(storeId);
      },
      removeByStoreId(storeId: string, optionId: string): boolean {
        this._seed();
        const before = this._rows.length;
        this._rows = this._rows.filter(
          (row) => !(row.store_id === storeId && row.option_id === optionId),
        );
        return this._rows.length < before;
      },
    },

    stores: {
      _rows: [] as Store[],
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;

        const STORE_SEED_META: { c: string; u: string; cb: string; ub: string }[] = [
          { c: '2024-01-10T09:00:00Z', u: '2026-03-01T12:00:00Z', cb: 'STF-001', ub: 'STF-001' },
          { c: '2024-01-11T09:00:00Z', u: '2026-02-15T10:00:00Z', cb: 'STF-001', ub: 'STF-002' },
          { c: '2024-01-12T09:00:00Z', u: '2026-01-20T11:00:00Z', cb: 'STF-002', ub: 'STF-002' },
          { c: '2024-02-01T09:00:00Z', u: '2026-03-10T09:30:00Z', cb: 'STF-003', ub: 'STF-003' },
          { c: '2024-02-05T09:00:00Z', u: '2026-02-28T08:00:00Z', cb: 'STF-004', ub: 'STF-004' },
          { c: '2024-03-01T09:00:00Z', u: '2026-03-05T12:00:00Z', cb: 'STF-001', ub: 'STF-001' },
          { c: '2024-03-10T09:00:00Z', u: '2026-02-10T09:00:00Z', cb: 'STF-002', ub: 'STF-002' },
          { c: '2024-04-01T09:00:00Z', u: '2026-01-15T10:00:00Z', cb: 'STF-003', ub: 'STF-003' },
          { c: '2025-01-10T09:00:00Z', u: '2026-04-01T15:00:00Z', cb: 'STF-001', ub: 'STF-001' },
          { c: '2020-06-01T09:00:00Z', u: '2025-12-01T10:00:00Z', cb: 'STF-004', ub: 'STF-004' },
          { c: '2026-07-01T09:00:00Z', u: '2026-07-01T09:00:00Z', cb: 'STF-001', ub: 'STF-001' },
          { c: '2024-05-01T09:00:00Z', u: '2026-02-20T09:00:00Z', cb: 'STF-002', ub: 'STF-002' },
          { c: '2024-06-01T09:00:00Z', u: '2026-03-15T09:00:00Z', cb: 'STF-003', ub: 'STF-003' },
        ];

        const STORE_SEED_SPECS: StoreSeedSpec[] = [
          {
            name: 'Fit365八潮店',
            brand: 'fit365',
            code: 'STR-00001',
            pass: 1650,
            mutualOn: true,
            mutualType: 'within_brand',
            area: 'kanto',
            operating_company_name: '株式会社ウェルネスフロンティア',
            status: 'operating',
            name_kana: 'フィットサンロクゴヤシオテン',
            postal_code: '340-0822',
            address: '八潮市大瀬1-1-1 八潮ステーションビル2F',
            phone: '03-1234-5678',
            fax: '03-1234-5679',
            receipt_date: '2020-02-01',
            preopen_date: '2020-03-15',
            grand_open_date: '2020-04-01',
            gender_restriction: 'mixed',
          },
          {
            name: 'Fit365新宿店',
            brand: 'fit365',
            code: 'STR-00002',
            pass: 900,
            mutualOn: true,
            mutualType: 'cross_brand',
            area: 'kanto',
            operating_company_name: '株式会社ウェルネスフロンティア',
            status: 'operating',
          },
          {
            name: 'Fit365渋谷店',
            brand: 'fit365',
            code: 'STR-00003',
            pass: 850,
            mutualOn: false,
            mutualType: 'none',
            area: 'kanto',
            operating_company_name: '株式会社フィット365',
            status: 'operating',
          },
          {
            name: 'JOYFIT池袋店',
            brand: 'joyfit',
            code: 'STR-10004',
            pass: 1000,
            mutualOn: true,
            mutualType: 'within_brand',
            area: 'kanto',
            operating_company_name: '株式会社ジェイフィット',
            status: 'operating',
          },
          {
            name: 'JOYFIT大宮店',
            brand: 'joyfit',
            code: 'STR-10005',
            pass: 950,
            mutualOn: true,
            mutualType: 'custom',
            fc: 'fc-001',
            area: 'kanto',
            operating_company_name: 'FCワーカーズ株式会社',
            status: 'operating',
          },
          {
            name: 'JOYFIT24 新宿店',
            brand: 'joyfit24',
            code: 'TK-006',
            pass: 900,
            mutualOn: true,
            mutualType: 'within_brand',
            area: 'kanto',
            operating_company_name: '株式会社ウェルネスフロンティア',
            fc: 'fc-002',
            status: 'operating',
          },
          {
            name: 'JOYFIT YOGA 心斎橋店',
            brand: 'joyfit_yoga',
            code: 'YG-007',
            pass: 1100,
            mutualOn: true,
            mutualType: 'none',
            area: 'kansai',
            operating_company_name: '株式会社ウェルネスフロンティア',
            fc: 'fc-002',
            status: 'operating',
          },
          {
            name: 'JOYFIT+ 名古屋駅前店',
            brand: 'joyfit_plus',
            code: 'JP-008',
            pass: 950,
            mutualOn: false,
            mutualType: 'none',
            contract: 'suspended',
            fc: 'fc-002',
            area: 'chubu',
            operating_company_name: '株式会社JOYFITプラス',
            status: 'operating',
          },
          {
            name: 'Fit365梅田店',
            brand: 'fit365',
            code: 'TK-009',
            pass: 850,
            mutualOn: true,
            mutualType: 'cross_brand',
            contract: 'draft',
            fc: 'fc-002',
            area: 'kansai',
            operating_company_name: '株式会社フィット365',
            status: 'operating',
          },
          {
            name: 'ジョイフィット静岡店',
            brand: 'joyfit',
            code: 'STR-10010',
            pass: 1000,
            mutualOn: false,
            mutualType: 'none',
            contract: 'terminated',
            fc: 'fc-002',
            closing: '2025-12-31',
            area: 'other',
            operating_company_name: '株式会社ジェイフィット',
            status: 'closed',
          },
          {
            // Deliberately member-free — see MEMBERLESS_STORE_CODE. A store that has just
            // opened has no suspension or withdrawal applications on file yet, which is what
            // gives store-scoped screens their genuinely-empty state.
            name: 'JOYFIT24 天王寺店',
            brand: 'joyfit24',
            code: MEMBERLESS_STORE_CODE,
            pass: 900,
            mutualOn: true,
            mutualType: 'within_brand',
            area: 'kansai',
            operating_company_name: '株式会社ウェルネスフロンティア',
            status: 'operating',
          },
          {
            name: 'JOYFIT東十条店',
            brand: 'joyfit',
            code: 'STR-10011',
            pass: 950,
            mutualOn: true,
            mutualType: 'within_brand',
            fc: 'fc-003',
            area: 'kanto',
            operating_company_name: '株式会社フィットイースト',
            status: 'operating',
          },
          {
            name: 'JOYFIT盛岡店',
            brand: 'joyfit',
            code: 'STR-10012',
            pass: 1000,
            mutualOn: true,
            mutualType: 'within_brand',
            fc: 'fc-004',
            area: 'other',
            operating_company_name: '株式会社ノースフィットネス',
            status: 'operating',
          },
        ];

        if (STORE_SEED_SPECS.length !== STORE_SEED_META.length) {
          throw new Error('STORE_SEED_SPECS and STORE_SEED_META must have the same length');
        }

        const allSpecs = [...STORE_SEED_SPECS, ...TERRITORY_DEMO_STORE_SPECS];

        for (let i = 0; i < allSpecs.length; i++) {
          const spec = allSpecs[i]!;
          const meta = STORE_SEED_META[i] ?? TERRITORY_DEMO_STORE_META;
          const n = i + 1;
          const storeKey = `store-${String(n).padStart(3, '0')}`;
          const location = STORE_LOCATION_BY_ID[storeKey];
          const contract = spec.contract ?? 'active';
          // Rows added for the store-master list (Y-02 FR-001) reference no contract and no
          // locker map — nothing else in the mock owns those children for them.
          const isTerritoryDemo = spec.code.startsWith(TERRITORY_DEMO_CLUB_CODE_PREFIX);
          this._rows.push({
            id: storeKey,
            store_id: `S-${String(n).padStart(3, '0')}`,
            club_code: spec.code,
            name: spec.name,
            brand: spec.brand,
            area: spec.area,
            prefecture: spec.prefecture ?? location?.prefecture,
            territory_id:
              spec.territory !== undefined ? spec.territory : (location?.territory ?? null),
            operating_company_name: spec.operating_company_name,
            status: spec.status,
            name_kana: spec.name_kana ?? null,
            // The detail screen shows these; every seeded store carries a plausible value so
            // no row renders a wall of dashes (Y-02 FR-002 registration fields).
            postal_code: spec.postal_code ?? `${340 + n}-0822`.slice(0, 8),
            address: spec.address ?? `${location?.prefecture ?? ''}${spec.name}前 1-1-1`,
            phone: spec.phone ?? `03-1234-${String(5600 + n).padStart(4, '0')}`,
            fax: spec.fax ?? `03-1234-${String(5700 + n).padStart(4, '0')}`,
            receipt_date: spec.receipt_date ?? null,
            preopen_date: spec.preopen_date ?? null,
            grand_open_date: spec.grand_open_date ?? '2020-04-01',
            gender_restriction: spec.gender_restriction ?? 'mixed',
            memo: spec.memo ?? null,
            fc_company_id: spec.fc ?? null,
            manager_staff_id: null,
            main_contract_id: isTerritoryDemo ? null : `ctr-store-${String(n).padStart(3, '0')}`,
            main_contract_status: isTerritoryDemo ? null : contract,
            option_pass_price: spec.pass,
            mutual_use_enabled: spec.mutualOn,
            mutual_use_type: spec.mutualType,
            closing_date: spec.closing ?? null,
            locker_map_id: isTerritoryDemo ? null : `locker-map-${String(n).padStart(3, '0')}`,
            asset_id: null,
            created_by: meta.cb,
            created_at: meta.c,
            updated_by: meta.ub,
            updated_at: meta.u,
          });
        }
      },
      getList(): Store[] {
        this._seed();
        return [...this._rows];
      },
      getById(id: string): Store | undefined {
        this._seed();
        return this._rows.find((s) => s.id === id);
      },
      create(input: Omit<Store, 'id' | 'store_id' | 'created_at' | 'updated_at'>): Store {
        this._seed();
        const nextNumber = this._rows.length + 1;
        const now = new Date().toISOString();
        const row: Store = {
          ...input,
          id: `store-${String(nextNumber).padStart(3, '0')}`,
          store_id: `S-${String(nextNumber).padStart(3, '0')}`,
          created_at: now,
          updated_at: now,
        };
        this._rows.unshift(row);
        return row;
      },
      updateById(id: string, patch: Partial<Store>): Store | undefined {
        this._seed();
        const index = this._rows.findIndex((s) => s.id === id);
        if (index === -1) return undefined;
        const current = this._rows[index]!;
        const updated: Store = {
          ...current,
          ...patch,
          id: current.id,
          store_id: current.store_id,
          created_at: current.created_at,
          updated_at: new Date().toISOString(),
        };
        this._rows[index] = updated;
        return updated;
      },
      setManagerStaff(storeId: string, manager_staff_id: string | null): void {
        this._seed();
        const row = this._rows.find((s) => s.id === storeId);
        if (row) row.manager_staff_id = manager_staff_id;
      },
      /**
       * Y-02 FR-001 bulk action "change territory" / Y-15 FR-M005.
       *
       * Partial success by design: every store that can be reassigned is reassigned, and the
       * ids that could not be (unknown, or outside the caller's scope) come back so the screen
       * can name them and narrow the selection down to a retry. Never rolled back.
       */
      changeTerritory(
        storeIds: string[],
        territoryId: string,
        allowedStoreIds: string[] | null,
      ): { updated: Store[]; failed: { store_id: string; name: string; reason: string }[] } {
        this._seed();
        const updated: Store[] = [];
        const failed: { store_id: string; name: string; reason: string }[] = [];

        for (const storeId of storeIds) {
          const row = this._rows.find((s) => s.id === storeId);
          if (!row) {
            failed.push({ store_id: storeId, name: storeId, reason: '店舗が見つかりません' });
            continue;
          }
          if (allowedStoreIds !== null && !allowedStoreIds.includes(storeId)) {
            failed.push({ store_id: storeId, name: row.name, reason: '参照権限がありません' });
            continue;
          }
          row.territory_id = territoryId;
          row.updated_at = new Date().toISOString();
          updated.push(row);
        }

        return { updated, failed };
      },
    },

    /**
     * Y-02 FR-008 store change history — **seed only** for the store-master list feature
     * (`specs/026-store-list/spec.md` FR-039). Nothing in this feature writes history:
     * the bulk territory change deliberately records none.
     */
    storeChangeHistory: {
      _rows: [] as StoreChangeHistoryEntry[],
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        const seeds: Omit<StoreChangeHistoryEntry, 'id'>[] = [
          {
            store_id: 'store-001',
            changed_at: '2026-03-10T14:30:15+09:00',
            changed_by: '山田 花子（本部）',
            change_action: 'business_hours_update',
            field_label: '営業時間（土曜日）',
            before: '10:00〜22:00',
            after: '10:00〜20:00',
          },
          {
            store_id: 'store-001',
            changed_at: '2026-01-20T11:05:42+09:00',
            changed_by: '佐藤 健（新宿店）',
            change_action: 'business_exception_create',
            field_label: '臨時休業日',
            before: null,
            after: '2026/03/15（設備点検）',
          },
          {
            store_id: 'store-001',
            changed_at: '2025-11-01T09:12:08+09:00',
            changed_by: '山田 花子（本部）',
            change_action: 'update',
            field_label: '電話番号',
            before: '03-1234-0000',
            after: '03-1234-5678',
          },
          {
            store_id: 'store-001',
            changed_at: '2024-01-15T09:00:00+09:00',
            changed_by: 'システム',
            change_action: 'create',
            field_label: '店舗登録',
            before: null,
            after: '新規作成',
          },
          {
            store_id: 'store-005',
            changed_at: '2026-02-15T10:00:00+09:00',
            changed_by: '山田 花子（本部）',
            change_action: 'fc_company_assign',
            field_label: '運営企業',
            before: '直営',
            after: 'FCワーカーズ株式会社',
          },
          {
            store_id: 'store-010',
            changed_at: '2025-12-01T10:00:00+09:00',
            changed_by: '鈴木 一郎（エリアマネージャー）',
            change_action: 'update',
            field_label: '閉店日',
            before: null,
            after: '2025/12/31',
          },
        ];

        seeds.forEach((seed, index) => {
          this._rows.push({ id: `sch-${String(index + 1).padStart(3, '0')}`, ...seed });
        });
      },
      listByStoreId(storeId: string): StoreChangeHistoryEntry[] {
        this._seed();
        return this._rows
          .filter((row) => row.store_id === storeId)
          .sort((a, b) => b.changed_at.localeCompare(a.changed_at));
      },
    },

    store_access_settings: {
      _byStoreId: {} as Record<string, StoreAccessSettings>,
      _seeded: false,
      /**
       * A partner row references a real store (Y-02 FR-004, FR-076), so the seeded 相互利用グループ
       * is drawn from the store master with the same restrictions the partner picker applies: the
       * same brand group, operating stores only, the store itself excluded.
       */
      _defaultPermittedStores(storeId: string): StoreAccessSettings['permitted_stores'] {
        const self = getDb().stores.getById(storeId);
        if (!self) return [];
        return getDb()
          .stores._rows.filter(
            (store) =>
              store.id !== self.id && store.brand === self.brand && store.status === 'operating',
          )
          .slice(0, 3)
          .map((store) => ({
            id: store.id,
            store_name: store.name,
            brand: store.brand,
            setup_date: '2024/04/01',
          }));
      },
      _default(storeId: string): StoreAccessSettings {
        return {
          mutual_use_enabled: true,
          deferred_payment_enabled: true,
          start_date: '2024/04/01',
          end_date: '2027/03/31',
          under18_start_time: '10:00',
          under18_end_time: '18:00',
          permitted_stores: this._defaultPermittedStores(storeId),
          // Y-02 FR-004 yoga usage fee: JPY 3,000 per day, billed to the store that is visited
          yoga_usage_fee: 3000,
        };
      },
      _clone(data: StoreAccessSettings): StoreAccessSettings {
        return JSON.parse(JSON.stringify(data)) as StoreAccessSettings;
      },
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        getDb().stores._seed();
        for (const store of getDb().stores._rows) {
          this._byStoreId[store.id] = this._clone(this._default(store.id));
        }
      },
      getByStoreId(storeId: string): StoreAccessSettings | undefined {
        this._seed();
        if (!getDb().stores.getById(storeId)) return undefined;
        const row = this._byStoreId[storeId];
        return this._clone(row ?? this._default(storeId));
      },
      replaceForStore(storeId: string, data: StoreAccessSettings): StoreAccessSettings | undefined {
        this._seed();
        if (!getDb().stores.getById(storeId)) return undefined;
        const next = this._clone(data);
        this._byStoreId[storeId] = next;
        return this._clone(next);
      },
    },

    businessHours: {
      _rows: [] as StoreBusinessHours[],
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        getDb().stores._seed();
        const now = '2026-03-01T12:00:00Z';
        for (const store of getDb().stores._rows) {
          this._rows.push({
            store_id: store.id,
            default_hours: [
              // staff_start_time / staff_end_time = the Y-02 FR-005 staff-on-site window.
              // null on the public-holiday row renders as a dash (no staff on site) on the detail screen.
              WEEKDAY_HOURS('mon', '23:00', '19:00'),
              WEEKDAY_HOURS('tue', '23:00', '19:00'),
              WEEKDAY_HOURS('wed', '23:00', '19:00'),
              WEEKDAY_HOURS('thu', '23:00', '19:00'),
              WEEKDAY_HOURS('fri', '23:00', '19:00'),
              WEEKDAY_HOURS('sat', '20:00', '17:00'),
              WEEKDAY_HOURS('sun', '18:00', '16:00'),
              WEEKDAY_HOURS('holiday', '18:00', null),
            ],
            exception_hours: [
              {
                id: `exc-${store.id}-001`,
                date: '2026-12-31',
                open_time: '10:00',
                close_time: '17:00',
              },
            ],
            temporary_closures: [
              { id: `tcl-${store.id}-001`, date: '2026-03-15', reason: '設備点検' },
            ],
            updated_at: now,
            updated_by: 'STF-001',
          });
        }
      },
      getByStoreId(storeId: string): StoreBusinessHours | undefined {
        this._seed();
        return this._rows.find((r) => r.store_id === storeId);
      },
      upsert(
        storeId: string,
        patch: Partial<Omit<StoreBusinessHours, 'store_id'>>,
      ): StoreBusinessHours {
        this._seed();
        const idx = this._rows.findIndex((r) => r.store_id === storeId);
        const now = new Date().toISOString();
        if (idx === -1) {
          const row: StoreBusinessHours = {
            store_id: storeId,
            default_hours: patch.default_hours ?? [],
            exception_hours: patch.exception_hours ?? [],
            temporary_closures: patch.temporary_closures ?? [],
            updated_at: now,
            updated_by: patch.updated_by ?? 'system',
          };
          this._rows.push(row);
          return row;
        }
        const current = this._rows[idx]!;
        const updated: StoreBusinessHours = {
          ...current,
          ...patch,
          store_id: storeId,
          updated_at: now,
        };
        this._rows[idx] = updated;
        return updated;
      },
    },

    /**
     * Y-02 FR-003 1DayPass price setting — per-date prices for one store.
     *
     * The base price is the store's own default (`stores.option_pass_price`); the screen only
     * displays it (`specs/027-store-detail/spec.md` FR-050a). Per-date rows mirror the BE
     * design's `one-day-pass-exceptions` upsert semantics, applied to a whole date set at once
     * because that is how the prototype's pricing panel works.
     */
    storeOneDayPassPrices: {
      _byStoreId: {} as Record<string, OneDayPassException[]>,
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        getDb().stores._seed();
        // Only the first three stores carry per-date prices, so the empty state is reachable.
        this._byStoreId['store-001'] = [
          { date: '2026-03-20', price: 1800, note: '春分の日・繁忙期価格' },
          { date: '2026-04-29', price: 1800, note: 'GW特別価格' },
          { date: '2026-05-05', price: 700, note: 'こどもの日キャンペーン' },
        ];
        this._byStoreId['store-002'] = [{ date: '2026-04-29', price: 1500, note: 'GW特別価格' }];
        this._byStoreId['store-003'] = [];
      },
      listByStoreId(storeId: string): OneDayPassException[] {
        this._seed();
        return [...(this._byStoreId[storeId] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      },
      /** Upsert on (store, date) — an existing date is overwritten, matching the design. */
      upsertMany(
        storeId: string,
        dates: string[],
        price: number,
        note: string | null,
      ): OneDayPassException[] {
        this._seed();
        const rows = this._byStoreId[storeId] ?? [];
        for (const date of dates) {
          const index = rows.findIndex((row) => row.date === date);
          if (index >= 0) rows[index] = { date, price, note };
          else rows.push({ date, price, note });
        }
        this._byStoreId[storeId] = rows;
        return this.listByStoreId(storeId);
      },
      /** Idempotent, like the design's per-date delete. */
      deleteMany(storeId: string, dates: string[]): OneDayPassException[] {
        this._seed();
        const remove = new Set(dates);
        this._byStoreId[storeId] = (this._byStoreId[storeId] ?? []).filter(
          (row) => !remove.has(row.date),
        );
        return this.listByStoreId(storeId);
      },
    },

    storeHolidays: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getHolidays(_storeId: string, _from: string, _to: string): StoreHolidaysResponse {
        return { holidays: [] };
      },
    },
  };
}
