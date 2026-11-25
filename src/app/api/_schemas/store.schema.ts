import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/** G-01 main contract status (mock) */
export const StoreMainContractStatusSchema = z
  .enum(['draft', 'active', 'suspended', 'expired', 'terminated'])
  .openapi({
    title: 'StoreMainContractStatus',
    description: 'Main contract lifecycle for the store',
  });

/** Mutual-use mechanism type */
export const MutualUseTypeSchema = z
  .enum(['none', 'within_brand', 'cross_brand', 'custom'])
  .openapi({
    title: 'MutualUseType',
    description: 'Cơ chế sử dụng lẫn nhau / mutual use type',
  });

/** Brand (list/filter + master) */
export const StoreListBrandSchema = z
  .enum(['joyfit', 'fit365', 'joyfit24', 'joyfit_yoga', 'joyfit_plus'])
  .openapi({
    title: 'StoreListBrand',
    description: 'Store brand',
  });

export const StoreAreaSchema = z.enum(['kanto', 'kansai', 'chubu', 'other']).openapi({
  title: 'StoreArea',
  description:
    'Rough geographic area kept for the store form/detail (Y-02 FR-002). NOT the Y-15 organisational エリア — that one is derived from the store の territory (see `territory_id`).',
});

/**
 * Query-string booleans arrive as `'true'` / `'false'`. Absent stays at the caller's default.
 */
function booleanQuery(description: string, defaultValue?: boolean) {
  return z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return defaultValue;
    if (typeof val === 'boolean') return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return defaultValue;
  }, z.boolean().optional().openapi({ description }));
}

/**
 * Store lifecycle status — four values, matching the real master and prototype `47423ec`
 * (準備中 / 営業中 / 休業中 / 閉店; Y-02 v6, store-list spec Q1 re-resolved 2026-10-02).
 * The store screens are on the real API; this mock enum survives only for Y-03's
 * FC linked-stores tab (research R14).
 */
export const StoreListStatusSchema = z
  .enum(['preparing', 'operating', 'temporarily_closed', 'closed'])
  .openapi({
    title: 'StoreListStatus',
    description:
      'Store lifecycle status — preparing=準備中 / operating=営業中 / temporarily_closed=休業中 / closed=閉店',
  });

/**
 * Gender restriction (Y-02 FR-002: mixed or women-only).
 *
 * The BE design's `StoreDetailDto.genderRestriction` carries `none | male_only | female_only`
 * while its own `UpdateStoreDto` carries `mixed | women_only`. The requirement and the
 * prototype both know only mixed / women-only, so the mock follows the prototype.
 */
export const StoreGenderRestrictionSchema = z.enum(['mixed', 'women_only']).openapi({
  title: 'StoreGenderRestriction',
  description: '性別制限 — mixed=混合 / women_only=女性専用',
});

/**
 * Store master (Y-01) — single shape for list, detail, and mock DB
 */
export const StoreSchema = z
  .object({
    /** Internal primary key (API paths, FK) */
    id: z.string().openapi({ example: 'store-001', description: '内部ID' }),
    /** Display store id (一覧・帳票) */
    store_id: z.string().openapi({ example: 'S-001', description: '店舗ID (表示)' }),
    club_code: z.string().optional().openapi({ example: 'STR-00001', description: 'クラブコード' }),
    name: z.string().openapi({ example: 'Fit365八潮店', description: '店舗名' }),
    /** Y-02 FR-002 store name in kana — BE design `StoreDetailDto.nameKana` */
    name_kana: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: 'フィットサンロクゴヤシオテン', description: '店舗名（カナ）' }),
    brand: StoreListBrandSchema.openapi({ description: 'ブランド' }),
    area: StoreAreaSchema.optional().openapi({ description: 'エリア' }),
    operating_company_name: z.string().optional().openapi({
      example: '株式会社ウェルネスフロンティア',
      description: '運営企業',
    }),
    postal_code: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '160-0022', description: '郵便番号' }),
    prefecture: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '東京都', description: '都道府県' }),
    address: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '新宿区新宿3-1-1 ABCビル 2F', description: '住所' }),
    email: z
      .string()
      .optional()
      .openapi({ example: 'shinjuku@joyfit.jp', description: 'メールアドレス' }),
    phone: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '03-1234-5678', description: '電話番号' }),
    /** Y-02 FR-002 fax number — BE design `StoreDetailDto.fax` */
    fax: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '03-1234-5679', description: 'FAX番号' }),
    accounting_code: z
      .string()
      .optional()
      .openapi({ example: 'ACC-TK001', description: '会計コード' }),
    interview_url: z.string().optional().openapi({
      example: 'https://goo.gl/maps/indoor-shinjuku',
      description: 'インドアビュー URL',
    }),
    google_map_url: z.string().optional().openapi({
      example: 'https://goo.gl/maps/shinjuku-store',
      description: 'Google Map URL',
    }),
    x_url: z.string().optional().openapi({ example: '@joyfit24_shinjuku', description: 'X URL' }),
    instagram_url: z
      .string()
      .optional()
      .openapi({ example: '@joyfit24_shinjuku', description: 'Instagram URL' }),
    line_url: z
      .string()
      .optional()
      .openapi({ example: '@joyfit24shinjuku', description: 'LINE URL' }),
    facebook_url: z
      .string()
      .optional()
      .openapi({ example: 'joyfit24shinjuku', description: 'Facebook URL' }),
    youtube_url: z.string().optional().openapi({ example: '', description: 'YouTube URL' }),
    store_photos: z.array(z.string()).optional().openapi({ description: '店舗写真 URLs' }),
    floor_map_url: z.string().optional().openapi({ description: 'フロアマップ URL' }),
    /** UIステータス (一覧・詳細共通) */
    status: StoreListStatusSchema.openapi({ description: 'ステータス' }),
    fc_company_id: z.string().nullable().optional().openapi({
      example: 'fc-001',
      description: 'FK FC company (Y-03), null for directly managed',
    }),
    /**
     * Y-02 L132: a store stores only its territory; area / block / head office are derived
     * from it. Null while a newly opened store is not yet assigned (rendered as "not set").
     */
    territory_id: z.string().nullable().optional().openapi({
      example: 'TRT-002',
      description: 'FK Y-15 テリトリー — null で未設定',
    }),
    manager_staff_id: z.string().nullable().optional().openapi({
      example: '12',
      description: 'FK Staff — 店舗責任者 (Y-01)',
    }),
    main_contract_id: z.string().nullable().optional().openapi({
      example: 'ctr-store-001',
      description: 'FK G-01 main contract',
    }),
    main_contract_status: StoreMainContractStatusSchema.nullable().optional().openapi({
      description: 'Main contract status snapshot',
    }),
    option_pass_price: z.number().openapi({
      example: 800,
      description: '1Day Pass price (staff with permission may edit)',
    }),
    mutual_use_enabled: z.boolean().openapi({ description: '相互利用を有効にするか' }),
    mutual_use_type: MutualUseTypeSchema.openapi({ description: '相互利用タイプ' }),
    /**
     * Y-02 FR-002 opening-related dates, kept as the same three fields the BE design uses.
     *
     * The prototype has a single opening-date field, but the customer settled on the three-way
     * split on 2026-08-24 (QA #202), so `028-store-form` follows the split instead.
     * `receipt_date` takes the meaning from the customer answer — the date enrolment starts
     * being accepted — which conflicts with the BE design's "Handover/receipt date" wording.
     * Raised with BE.
     */
    receipt_date: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '2020-02-01', description: '受付開始日 YYYY-MM-DD' }),
    preopen_date: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '2020-03-15', description: 'プレオープン日 YYYY-MM-DD' }),
    grand_open_date: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '2020-04-01', description: '開店日（グランドオープン） YYYY-MM-DD' }),
    closing_date: z.string().nullable().optional().openapi({
      example: '2027-03-31',
      description: '閉店日 — null while operating',
    }),
    gender_restriction: StoreGenderRestrictionSchema.optional().openapi({
      description: '性別制限',
    }),
    /** Y-02 FR-002 remarks — BE design `StoreDetailDto.memo` */
    memo: z.string().nullable().optional().openapi({ example: null, description: '備考' }),
    locker_map_id: z.string().nullable().optional().openapi({
      example: 'locker-map-001',
      description: 'FK E-01 locker map',
    }),
    asset_id: z.string().nullable().optional().openapi({
      example: 'asset-ph2-001',
      description: 'FK I-01 (Phase 2)',
    }),
    created_by: z.string().openapi({ example: 'STF-001', description: '作成者' }),
    created_at: z.string().openapi({ example: '2024-01-10T09:00:00Z' }),
    updated_by: z.string().openapi({ example: 'STF-002', description: '更新者' }),
    updated_at: z.string().openapi({ example: '2026-03-01T12:00:00Z' }),
  })
  .openapi({
    title: 'Store',
    description: 'Store master row',
  });

export type Store = z.infer<typeof StoreSchema>;

// ─── Per-weekday default business hours ──────────────────────────────────────
// Declared before the business-hours section because the store-create payload embeds them.

export const DayOfWeekSchema = z
  .enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday'])
  .openapi({ title: 'DayOfWeek', description: 'Day of week including holiday' });

export const DefaultHoursEntrySchema = z
  .object({
    day: DayOfWeekSchema,
    /** null on a regular closing day — the BE design states both times are null when `isClosed` (E-STR-003) */
    open_time: z
      .string()
      .nullable()
      .openapi({ example: '10:00', description: '開店時刻 HH:mm — 定休日は null' }),
    close_time: z
      .string()
      .nullable()
      .openapi({ example: '23:00', description: '閉店時刻 HH:mm — 定休日は null' }),
    is_closed: z.boolean().openapi({ description: '定休日フラグ' }),
    /**
     * Y-02 FR-005 staff-on-site hours — the window the B-01 gate stop (FR-M005) reads.
     * null = no staff on site. Not in the BE design yet; the customer approved adding it in QA #206.
     */
    staff_start_time: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '10:00', description: 'スタッフ常駐開始 HH:mm — null で常駐なし' }),
    staff_end_time: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '19:00', description: 'スタッフ常駐終了 HH:mm — null で常駐なし' }),
  })
  .openapi({ title: 'DefaultHoursEntry', description: '曜日別デフォルト営業時間＋常駐時間帯' });

/**
 * Y-02 FR-002 store basic info — the create payload the store form submits.
 *
 * Field set follows the prototype's form (`store-form.tsx` @ `b223fef`), not the repo's older
 * form: no status, no is-FC boolean, no accounting code or email address, no store photos, no floor
 * map and no social URLs — the prototype has a control for none of them
 * (`specs/028-store-form/spec.md` FR-051). Those columns stay on `StoreSchema` because the
 * detail screen still reads them; they simply have no write path from this form.
 *
 * Divergences from `CreateStoreDto` of the BE design, all recorded in spec.md Appendix A.5:
 * - `territory_id` — the design has no hierarchy concept at all (`territory` matches 0 times
 *   in the dev Swagger), yet Y-02 FR-002 marks the territory required. Standing BE task.
 * - `closing_date` — customer-approved addition to the create body (QA #202), not yet on dev.
 * - `default_hours` — customer-approved: registration must cost one request (QA #202), so the
 *   weekly set travels with the store instead of a second `business-hours` call.
 * - no `status` — a new store takes the master's default; the form never chooses one
 *   (QA #202/#205, confirmed 2026-08-24).
 */
export const CreateStorePayloadSchema = z
  .object({
    club_code: z
      .string()
      .trim()
      .min(1, '店舗コードを入力してください')
      .openapi({ example: 'TK-001' }),
    name: z
      .string()
      .trim()
      .min(1, '店舗名を入力してください')
      .openapi({ example: 'JOYFIT24新宿店' }),
    name_kana: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: 'ジョイフィット24シンジュクテン' }),
    /**
     * One flat value covering the prototype's two selects: FIT365 → `fit365`; JOYFIT plus its
     * sub-brand → `joyfit` / `joyfit24` / `joyfit_yoga` / `joyfit_plus`. The BE design's
     * `brandEnum` has no bare JOYFIT value either, which is why the client made the sub-brand
     * mandatory for JOYFIT on 2026-08-24 (QA #202).
     */
    brand: StoreListBrandSchema,
    /** Y-15 territory — required by Y-02 FR-002 L131 */
    territory_id: z.string().trim().min(1, 'テリトリーを選択してください'),
    /** null / omitted = directly managed. The display name is resolved from this id, as API-083 does. */
    fc_company_id: z.string().nullable().optional(),
    /**
     * The four location/contact fields are nullable rather than merely optional: on the edit form
     * they are optional inputs the operator may clear, and an omitted field means「変更しない」
     * (API-083), so clearing one has to travel as an explicit null. API-083's `UpdateStoreDto`
     * marks all four `nullable: true` for the same reason.
     */
    prefecture: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    receipt_date: z.string().nullable().optional(),
    preopen_date: z.string().nullable().optional(),
    grand_open_date: z.string().nullable().optional(),
    closing_date: z.string().nullable().optional(),
    gender_restriction: StoreGenderRestrictionSchema.optional(),
    memo: z.string().nullable().optional(),
    /** The 8 per-weekday default rows, submitted with the store (QA #202: one request) */
    default_hours: z.array(DefaultHoursEntrySchema).optional(),
  })
  .openapi({
    title: 'CreateStorePayload',
    description: 'Y-02 FR-002 店舗新規登録ペイロード（曜日別デフォルト営業時間を同梱）',
  });

/**
 * The edit payload — every field optional, an omitted field meaning "leave unchanged".
 *
 * `default_hours` is omitted whenever the operator did not touch the weekly table, so a save
 * that changes only e.g. the phone number cannot overwrite hours changed on the detail screen
 * since this form was loaded (spec.md FR-045a).
 */
export const UpdateStorePayloadSchema = CreateStorePayloadSchema.partial().openapi({
  title: 'UpdateStorePayload',
  description: 'Y-02 FR-002 店舗編集ペイロード（未指定フィールドは変更しない）',
});

/**
 * Store list row — the store master row plus the Y-15 hierarchy names resolved server-side,
 * the same way the backend design resolves `fcCompanyName`. The screen must never look up
 * the hierarchy itself, because filtering/sorting/paging all run over the full result set.
 */
export const StoreListItemSchema = StoreSchema.extend({
  territory_name: z
    .string()
    .nullable()
    .openapi({ example: '埼玉南テリトリー', description: 'テリトリー名 — 未設定は null' }),
  area_name: z.string().nullable().openapi({
    example: '第1エリア',
    description: 'テリトリーから逆引きした Y-15 エリア名 — 未設定は null',
  }),
}).openapi({
  title: 'StoreListItem',
  description: '店舗一覧の行（テリトリー・エリア名を解決済み）',
});

export const GetStoresQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    /**
     * 100 mirrors the cap API-083 `GET /admin/stores` declares (`limit` maximum 100), so a
     * request this mock accepts is one the real endpoint accepts too. It is also the largest
     * page size the screen offers (25 / 50 / 100).
     */
    limit: z.coerce.number().int().min(1).max(100).default(50).openapi({ example: 50 }),
    search: z.string().optional().openapi({
      description: '店舗名・クラブコード・テリトリー名で部分一致検索',
    }),
    brand: StoreListBrandSchema.optional().openapi({ description: 'ブランド' }),
    prefecture: z.string().optional().openapi({ example: '東京都', description: '都道府県' }),
    /** `direct` = directly-managed stores (`fc_company_id IS NULL`), per the API-083 design */
    fc_company_id: z.string().optional().openapi({
      example: 'fc-001',
      description: '運営企業 — FC企業ID、または直営を表す `direct`',
    }),
    area_id: z.string().optional().openapi({ example: 'AREA-01', description: 'Y-15 エリアID' }),
    territory_id: z
      .string()
      .optional()
      .openapi({ example: 'TRT-002', description: 'Y-15 テリトリーID（エリア選択時のみ有効）' }),
    status: StoreListStatusSchema.optional().openapi({ description: 'ステータス' }),
    sort_by: z
      .enum(['store_id', 'club_code', 'name', 'created_at'])
      .optional()
      .openapi({ description: 'Sort field — 未指定は店舗ID順' }),
    sort_order: z.enum(['asc', 'desc']).default('asc').openapi({ description: 'Sort order' }),
    include_total_all: booleanQuery(
      '絞り込み前の母数（totalAllItems）を返すか（既定false）',
      false,
    ),
  })
  .openapi({
    title: 'GetStoresQuery',
    description: 'Query parameters for store list',
  });

export const GetStoresResponseSchema = z
  .object({
    stores: z.array(StoreListItemSchema).openapi({ description: 'Stores' }),
    pagination: z
      .object({
        page: z.number().openapi({ example: 1 }),
        limit: z.number().openapi({ example: 50 }),
        total: z.number().openapi({ example: 10 }),
        total_pages: z.number().openapi({ example: 1 }),
        totalAllItems: z.number().optional().openapi({
          example: 48,
          description: '絞り込み前の母数（include_total_all=true のときのみ）',
        }),
      })
      .openapi({ title: 'StorePagination' }),
  })
  .openapi({
    title: 'GetStoresResponse',
    description: 'Store list response with pagination',
  });

/**
 * Filter option sources for the list. Both are derived from the caller's permitted stores so
 * that no offered option can return zero rows, and so the options do not shift while paging.
 */
export const GetStoreFilterOptionsResponseSchema = z
  .object({
    prefectures: z.array(z.string()).openapi({
      example: ['埼玉県', '東京都'],
      description: '権限内の店舗が実際に使っている都道府県（北から南の順）',
    }),
    operating_companies: z
      .array(
        z.object({
          id: z.string().openapi({ example: 'fc-001', description: 'FC企業ID、または `direct`' }),
          name: z.string().openapi({ example: '直営' }),
        }),
      )
      .openapi({ description: '運営企業の選択肢（直営を含む）' }),
  })
  .openapi({
    title: 'GetStoreFilterOptionsResponse',
    description: '店舗一覧の詳細フィルター選択肢',
  });

/** Y-02 FR-001 bulk action "change territory" / Y-15 FR-M005 */
export const BulkChangeStoreTerritoryPayloadSchema = z
  .object({
    store_ids: z.array(z.string()).min(1).openapi({ description: '対象店舗ID' }),
    territory_id: z
      .string()
      .min(1)
      .openapi({ example: 'TRT-004', description: '変更先テリトリー' }),
  })
  .openapi({
    title: 'BulkChangeStoreTerritoryPayload',
    description: 'テリトリー一括変更リクエスト',
  });

export const BulkChangeStoreTerritoryResponseSchema = z
  .object({
    message: z.string().openapi({ example: '12件のテリトリーを変更しました' }),
    updated_count: z.number().openapi({ example: 12, description: '変更できた件数' }),
    updated_store_ids: z.array(z.string()).openapi({ description: '変更できた店舗ID' }),
    /**
     * Partial success is intentional: reassignable stores are reassigned even when others
     * fail, and the caller narrows its selection down to these so a retry needs no re-select.
     */
    failed: z
      .array(
        z.object({
          store_id: z.string().openapi({ example: 'store-009' }),
          name: z.string().openapi({ example: 'Fit365梅田店' }),
          reason: z.string().openapi({ example: '店舗が見つかりません' }),
        }),
      )
      .openapi({ description: '変更できなかった店舗' }),
    territory_name: z
      .string()
      .openapi({ example: '埼玉西テリトリー', description: '変更先の名称' }),
  })
  .openapi({
    title: 'BulkChangeStoreTerritoryResponse',
    description: 'テリトリー一括変更レスポンス（部分成功あり）',
  });

// ─── Store change history (Y-02 FR-008 — seed only for this feature) ─────────

export const StoreChangeHistoryEntrySchema = z
  .object({
    id: z.string().openapi({ example: 'sch-001' }),
    store_id: z.string().openapi({ example: 'store-001' }),
    changed_by: z.string().openapi({ example: '田中 太郎（本部管理者）', description: '操作者' }),
    changed_at: z.string().openapi({ example: '2026-06-01T09:12:33Z' }),
    change_action: z.string().openapi({
      example: 'business_hours_update',
      description: '変更種別 (create / update / business_hours_update / fc_company_assign …)',
    }),
    /**
     * Y-02 FR-008 before/after diff. The BE design returns `changeAction` + a free-shape
     * `snapshot` with no prior value, which cannot express the diff the screen renders, so
     * the mock seeds the diff already resolved (`specs/027-store-detail/spec.md` FR-082).
     */
    field_label: z.string().openapi({ example: '営業時間（土曜日）', description: '変更項目' }),
    before: z.string().nullable().openapi({ example: '10:00〜22:00', description: '変更前' }),
    after: z.string().nullable().openapi({ example: '10:00〜20:00', description: '変更後' }),
  })
  .openapi({ title: 'StoreChangeHistoryEntry', description: '店舗変更履歴（参照専用）' });

export const GetStoreChangeHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  })
  .openapi({ title: 'GetStoreChangeHistoryQuery' });

export const GetStoreChangeHistoryResponseSchema = z
  .object({
    items: z.array(StoreChangeHistoryEntrySchema).openapi({ description: '新しい順' }),
    pagination: z
      .object({
        page: z.number().openapi({ example: 1 }),
        limit: z.number().openapi({ example: 20 }),
        total: z.number().openapi({ example: 3 }),
        total_pages: z.number().openapi({ example: 1 }),
      })
      .openapi({ title: 'StoreChangeHistoryPagination' }),
  })
  .openapi({
    title: 'GetStoreChangeHistoryResponse',
    description: '店舗変更履歴レスポンス',
  });

/**
 * Y-02 FR-002: the levels above (area, block, head office) are derived from the territory.
 * The detail screen renders the resolved path under the territory name, so the store detail
 * response carries it rather than making the screen walk the hierarchy itself.
 */
export const StoreTerritoryPathSchema = z
  .object({
    territory_id: z.string().openapi({ example: 'TRT-002' }),
    territory_name: z.string().openapi({ example: '埼玉南テリトリー' }),
    area_name: z.string().openapi({ example: '第1エリア' }),
    block_name: z.string().openapi({ example: '関東第1運営ブロック' }),
    headquarters_name: z.string().openapi({ example: 'EAST運営本部' }),
  })
  .openapi({ title: 'StoreTerritoryPath', description: 'テリトリーの階層パス（解決済み）' });

export const GetStoreByIdResponseSchema = z
  .object({
    store: StoreSchema,
    /** null when the store has no territory (rendered as "not set") */
    territory_path: StoreTerritoryPathSchema.nullable().openapi({
      description: 'テリトリーの階層パス — テリトリー未設定なら null',
    }),
  })
  .openapi({
    title: 'GetStoreByIdResponse',
    description: 'Store detail response',
  });

export const CreateStoreResponseSchema = z
  .object({
    message: z.string().openapi({ example: '店舗を作成しました' }),
    store: StoreSchema,
  })
  .openapi({
    title: 'CreateStoreResponse',
    description: 'Store create response',
  });

export const UpdateStoreResponseSchema = z
  .object({
    message: z.string().openapi({ example: '店舗情報を更新しました' }),
    store: StoreSchema,
  })
  .openapi({
    title: 'UpdateStoreResponse',
    description: 'Store update response',
  });

export type StoreListBrand = z.infer<typeof StoreListBrandSchema>;
export type StoreArea = z.infer<typeof StoreAreaSchema>;
export type StoreListStatus = z.infer<typeof StoreListStatusSchema>;
export type StoreListItem = z.infer<typeof StoreListItemSchema>;
export type GetStoresQuery = z.infer<typeof GetStoresQuerySchema>;
export type GetStoresResponse = z.infer<typeof GetStoresResponseSchema>;
export type CreateStorePayload = z.infer<typeof CreateStorePayloadSchema>;
export type UpdateStorePayload = z.infer<typeof UpdateStorePayloadSchema>;
export type GetStoreFilterOptionsResponse = z.infer<typeof GetStoreFilterOptionsResponseSchema>;
export type BulkChangeStoreTerritoryPayload = z.infer<typeof BulkChangeStoreTerritoryPayloadSchema>;
export type BulkChangeStoreTerritoryResponse = z.infer<
  typeof BulkChangeStoreTerritoryResponseSchema
>;
export type StoreGenderRestriction = z.infer<typeof StoreGenderRestrictionSchema>;
export type StoreTerritoryPath = z.infer<typeof StoreTerritoryPathSchema>;
export type GetStoreByIdResponse = z.infer<typeof GetStoreByIdResponseSchema>;
export type StoreChangeHistoryEntry = z.infer<typeof StoreChangeHistoryEntrySchema>;
export type GetStoreChangeHistoryQuery = z.infer<typeof GetStoreChangeHistoryQuerySchema>;
export type GetStoreChangeHistoryResponse = z.infer<typeof GetStoreChangeHistoryResponseSchema>;

// ─── Business Hours (Y-02-04 営業カレンダー) ──────────────────────────────────

export const ExceptionHoursEntrySchema = z
  .object({
    id: z.string().openapi({ example: 'exc-001' }),
    date: z.string().openapi({ example: '2026-12-31', description: '例外日 YYYY-MM-DD' }),
    open_time: z.string().openapi({ example: '10:00' }),
    close_time: z.string().openapi({ example: '17:00' }),
  })
  .openapi({ title: 'ExceptionHoursEntry', description: '例外営業時間（特定日）' });

export const TemporaryClosureEntrySchema = z
  .object({
    id: z.string().openapi({ example: 'tcl-001' }),
    date: z.string().openapi({ example: '2026-03-15', description: '臨時休業日 YYYY-MM-DD' }),
    reason: z.string().optional().openapi({ example: '設備点検', description: '理由' }),
  })
  .openapi({ title: 'TemporaryClosureEntry', description: '臨時休業日' });

export const StoreBusinessHoursSchema = z
  .object({
    store_id: z.string().openapi({ example: 'store-001' }),
    default_hours: z.array(DefaultHoursEntrySchema).openapi({
      description: '曜日別デフォルト営業時間',
    }),
    exception_hours: z.array(ExceptionHoursEntrySchema).openapi({
      description: '例外営業時間（特定日に通常と異なる時間）',
    }),
    temporary_closures: z.array(TemporaryClosureEntrySchema).openapi({
      description: '臨時休業日一覧',
    }),
    updated_at: z.string().openapi({ example: '2026-03-01T12:00:00Z' }),
    updated_by: z.string().openapi({ example: 'STF-001' }),
  })
  .openapi({ title: 'StoreBusinessHours', description: '店舗営業時間設定' });

export const UpdateStoreBusinessHoursPayloadSchema = z
  .object({
    default_hours: z.array(DefaultHoursEntrySchema).optional(),
    exception_hours: z.array(ExceptionHoursEntrySchema).optional(),
    temporary_closures: z.array(TemporaryClosureEntrySchema).optional(),
  })
  .openapi({
    title: 'UpdateStoreBusinessHoursPayload',
    description: '営業時間更新リクエスト',
  });

export const GetStoreBusinessHoursResponseSchema = z
  .object({ business_hours: StoreBusinessHoursSchema })
  .openapi({ title: 'GetStoreBusinessHoursResponse' });

export const UpdateStoreBusinessHoursResponseSchema = z
  .object({
    message: z.string().openapi({ example: '営業時間を更新しました' }),
    business_hours: StoreBusinessHoursSchema,
  })
  .openapi({ title: 'UpdateStoreBusinessHoursResponse' });

export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;
export type DefaultHoursEntry = z.infer<typeof DefaultHoursEntrySchema>;
export type ExceptionHoursEntry = z.infer<typeof ExceptionHoursEntrySchema>;
export type TemporaryClosureEntry = z.infer<typeof TemporaryClosureEntrySchema>;
export type StoreBusinessHours = z.infer<typeof StoreBusinessHoursSchema>;
export type UpdateStoreBusinessHoursPayload = z.infer<typeof UpdateStoreBusinessHoursPayloadSchema>;

export { ErrorResponseSchema } from './auth.schema';
