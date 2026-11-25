import type {
  MainContractChangeHistoryItem,
  MainContractDetail,
  MainContractListItem,
} from '@/app/api/_schemas/main-contract.schema';

/** Projects a 主契約 detail row onto the list shape so both views can never drift. */
function toListItem(detail: MainContractDetail): MainContractListItem {
  return {
    id: detail.id,
    name: detail.name,
    contract_type: detail.contract_type,
    brand: detail.brand,
    target_store_name: detail.target_store_name,
    price_including_tax: detail.price_including_tax,
    companion_benefit_enabled: detail.companion_benefit_enabled,
    parent_contract_name: detail.parent_contract_name,
    status: detail.status,
    active_contracts: detail.active_contracts,
    derived_child_count: detail.child_contracts.length,
  };
}

/** `YYYY/MM/DD HH:mm` — the format the change-history table renders. */
function formatChangeHistoryTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const formatHistoryYen = (value: unknown): string =>
  typeof value === 'number' ? `¥${value.toLocaleString()}` : '―';
const formatHistoryMonths = (value: unknown): string =>
  typeof value === 'number' ? `${value}ヶ月` : '―';
const formatHistoryText = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '―' : String(value);

/**
 * Fields the 変更履歴 records on update (G-01 FR-S001), with the label and the rendering the
 * history table shows for 変更前 / 変更後.
 */
const TRACKED_HISTORY_FIELDS: ReadonlyArray<{
  key: keyof MainContractDetail;
  label: string;
  format: (value: unknown) => string;
}> = [
  { key: 'name', label: '主契約名', format: formatHistoryText },
  { key: 'price_including_tax', label: '料金（税込）', format: formatHistoryYen },
  { key: 'suspension_fee', label: '休会時請求金額', format: formatHistoryYen },
  { key: 'cancellation_fee', label: '違約金', format: formatHistoryYen },
  { key: 'tax_rate', label: '税率', format: (value) => (value == null ? '―' : `${value}%`) },
  { key: 'suspendable_months', label: '休会可能月', format: formatHistoryMonths },
  { key: 'cancellable_months', label: '退会可能月', format: formatHistoryMonths },
  { key: 'start_date', label: '利用開始日', format: formatHistoryText },
  { key: 'description', label: '説明文', format: formatHistoryText },
  {
    key: 'status',
    label: 'ステータス',
    format: (value) => (value === 'active' ? '有効' : '無効'),
  },
];

export function createBrandTables() {
  return {
    mainContracts: {
      _rows: [] as MainContractListItem[],
      _details: {} as Record<string, MainContractDetail>,
      _changeHistory: {} as Record<string, MainContractChangeHistoryItem[]>,
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;

        type MainContractSeedSpec = {
          id: string;
          name: string;
          contract_type: MainContractDetail['contract_type'];
          brand: MainContractDetail['brand'];
          /** Only set for 特殊契約 (API-087: storeId required iff contractType = special) */
          store?: { id: string; name: string };
          old_code?: string;
          parent?: { id: string; name: string };
          price: number;
          suspension_fee: number;
          cancellation_fee?: number;
          monthly_limit?: number;
          suspendable_months?: number;
          cancellable_months?: number;
          initial_payment_months?: number;
          other_store_usage: MainContractDetail['other_store_usage'];
          is_multi_usable?: boolean;
          is_changeable?: boolean;
          companion_benefit_enabled: boolean;
          gender_restriction?: MainContractDetail['gender_restriction'];
          same_day_cancellation?: boolean;
          accounting_code: string;
          terms?: { id: string; name: string };
          company?: string;
          public_name?: string;
          description?: string;
          start_date: string;
          active_contracts: number;
          status: MainContractDetail['status'];
          created_at: string;
          updated_at: string;
        };

        const JOYFIT_BRANDS = ['joyfit', 'joyfit24', 'joyfit_yoga', 'joyfit_plus'];
        const MEMBERSHIP_TERMS = { id: 'TM-002', name: '会員規約（v1.1）' };

        const BUSINESS_HOURS: MainContractDetail['usage_hours_by_day'] = [
          { day: '月', from: '06:00', to: '23:00', all_day: false },
          { day: '火', from: '06:00', to: '23:00', all_day: false },
          { day: '水', from: '06:00', to: '23:00', all_day: false },
          { day: '木', from: '06:00', to: '23:00', all_day: false },
          { day: '金', from: '06:00', to: '23:00', all_day: false },
          { day: '土', from: '08:00', to: '21:00', all_day: false },
          { day: '日', from: '08:00', to: '21:00', all_day: false },
          { day: '祝日', from: '00:00', to: '23:59', all_day: false },
        ];
        const ALL_DAY_HOURS: MainContractDetail['usage_hours_by_day'] = [
          '月',
          '火',
          '水',
          '木',
          '金',
          '土',
          '日',
          '祝日',
        ].map((day) => ({ day, from: '00:00', to: '24:00', all_day: true }));

        const SPECS: MainContractSeedSpec[] = [
          {
            id: 'MC001',
            name: 'レギュラー会員',
            contract_type: 'general',
            brand: 'joyfit',
            old_code: 'OLD-REG-001',
            price: 7700,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            is_multi_usable: true,
            companion_benefit_enabled: true,
            accounting_code: 'ACC-101',
            terms: MEMBERSHIP_TERMS,
            public_name: 'レギュラー（全時間利用可）',
            description:
              '全時間帯利用可能な標準的な会員プラン。24時間いつでも全店舗のトレーニング施設を利用できます。初心者から上級者まで幅広い会員層に対応。',
            start_date: '2024/04/01',
            active_contracts: 1250,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2026/02/28 14:30',
          },
          {
            id: 'MC001-A',
            name: 'レギュラー会員（学生）',
            contract_type: 'general',
            brand: 'joyfit',
            old_code: 'OLD-REG-001S',
            parent: { id: 'MC001', name: 'レギュラー会員' },
            price: 5500,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-101S',
            terms: MEMBERSHIP_TERMS,
            start_date: '2024/04/01',
            active_contracts: 180,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/10/01 09:00',
          },
          {
            id: 'MC001-B',
            name: 'レギュラー会員（シニア）',
            contract_type: 'general',
            brand: 'joyfit',
            parent: { id: 'MC001', name: 'レギュラー会員' },
            price: 6600,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-101R',
            terms: MEMBERSHIP_TERMS,
            start_date: '2024/04/01',
            active_contracts: 95,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/10/01 09:00',
          },
          {
            id: 'MC002',
            name: 'デイタイム会員',
            contract_type: 'general',
            brand: 'fit365',
            old_code: 'OLD-DAY-001',
            price: 6600,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-201',
            start_date: '2024/04/01',
            active_contracts: 820,
            status: 'active',
            created_at: '2024/03/20 10:00',
            updated_at: '2026/01/15 11:00',
          },
          {
            id: 'MC003',
            name: 'ナイト会員',
            contract_type: 'general',
            brand: 'joyfit24',
            price: 5500,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'direct',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-301',
            start_date: '2024/04/01',
            active_contracts: 450,
            status: 'active',
            created_at: '2024/03/25 10:00',
            updated_at: '2025/12/01 10:00',
          },
          {
            id: 'MC004',
            name: 'ウィークエンド会員',
            contract_type: 'general',
            brand: 'fit365',
            price: 4400,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-401',
            start_date: '2024/06/01',
            active_contracts: 320,
            status: 'active',
            created_at: '2024/05/20 10:00',
            updated_at: '2025/11/10 10:00',
          },
          {
            id: 'MC005',
            name: '1Day利用',
            contract_type: 'oneDay',
            brand: 'joyfit',
            price: 1650,
            suspension_fee: 0,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-501',
            start_date: '2024/04/01',
            active_contracts: 0,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2024/03/15 10:00',
          },
          {
            id: 'MC006',
            name: 'ファミリー会員（親）',
            contract_type: 'family',
            brand: 'joyfit',
            old_code: 'OLD-FAM-001',
            price: 7700,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-601',
            terms: MEMBERSHIP_TERMS,
            start_date: '2024/04/01',
            active_contracts: 210,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/09/01 10:00',
          },
          {
            id: 'MC006-A',
            name: 'ファミリー会員（子・大人）',
            contract_type: 'family',
            brand: 'joyfit',
            parent: { id: 'MC006', name: 'ファミリー会員（親）' },
            price: 4400,
            suspension_fee: 550,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-601A',
            terms: MEMBERSHIP_TERMS,
            start_date: '2024/04/01',
            active_contracts: 85,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/09/01 10:00',
          },
          {
            id: 'MC006-B',
            name: 'ファミリー会員（子・学生）',
            contract_type: 'family',
            brand: 'joyfit',
            parent: { id: 'MC006', name: 'ファミリー会員（親）' },
            price: 3300,
            suspension_fee: 550,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-601B',
            terms: MEMBERSHIP_TERMS,
            start_date: '2024/04/01',
            active_contracts: 45,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/09/01 10:00',
          },
          {
            id: 'MC007',
            name: '法人会員',
            contract_type: 'corporate',
            brand: 'fit365',
            old_code: 'OLD-CORP-001',
            price: 6600,
            suspension_fee: 0,
            monthly_limit: 8,
            cancellable_months: 1,
            other_store_usage: 'none',
            is_changeable: false,
            companion_benefit_enabled: false,
            accounting_code: 'ACC-701',
            company: '株式会社ウェルネスフロンティア',
            start_date: '2024/07/01',
            active_contracts: 35,
            status: 'active',
            created_at: '2024/06/20 10:00',
            updated_at: '2025/08/01 10:00',
          },
          {
            id: 'MC008',
            name: '体験利用',
            contract_type: 'oneDay',
            brand: 'joyfit24',
            price: 0,
            suspension_fee: 0,
            monthly_limit: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-801',
            start_date: '2024/04/01',
            active_contracts: 0,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2024/03/15 10:00',
          },
          {
            id: 'MC009',
            name: 'プレミアム会員',
            contract_type: 'general',
            brand: 'joyfit',
            price: 11000,
            suspension_fee: 2200,
            suspendable_months: 6,
            cancellable_months: 1,
            other_store_usage: 'all',
            is_multi_usable: true,
            companion_benefit_enabled: true,
            accounting_code: 'ACC-901',
            terms: MEMBERSHIP_TERMS,
            public_name: 'プレミアム（全時間利用可・特典付）',
            description: 'プレミアム会員専用の最上位プラン。全時間帯利用可・同伴特典あり。',
            start_date: '2025/01/01',
            active_contracts: 0,
            status: 'inactive',
            created_at: '2024/12/15 10:00',
            updated_at: '2026/01/10 14:30',
          },
          {
            id: 'MC010',
            name: 'スタッフ会員（当店限定）',
            contract_type: 'special',
            brand: 'joyfit24',
            store: { id: 'store-006', name: 'JOYFIT24 新宿店' },
            price: 0,
            suspension_fee: 0,
            cancellable_months: 1,
            other_store_usage: 'direct',
            companion_benefit_enabled: true,
            accounting_code: 'ACC-A10',
            start_date: '2024/04/01',
            active_contracts: 18,
            status: 'inactive',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/07/01 10:00',
          },
          {
            id: 'MC011',
            name: 'ファミリー会員',
            contract_type: 'family',
            brand: 'joyfit',
            price: 8800,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: true,
            accounting_code: 'ACC-A11',
            terms: MEMBERSHIP_TERMS,
            start_date: '2024/04/01',
            active_contracts: 276,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/06/01 10:00',
          },
          {
            id: 'MC012',
            name: 'キッズ会員',
            contract_type: 'kids',
            brand: 'fit365',
            price: 4400,
            suspension_fee: 550,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A12',
            start_date: '2024/04/01',
            active_contracts: 140,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/05/01 10:00',
          },
          {
            id: 'MC013',
            name: '法人スタンダード',
            contract_type: 'corporate',
            brand: 'joyfit24',
            price: 9900,
            suspension_fee: 0,
            monthly_limit: 12,
            cancellable_months: 1,
            other_store_usage: 'none',
            is_changeable: false,
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A13',
            company: '株式会社ジェイフィット',
            start_date: '2024/07/01',
            active_contracts: 52,
            status: 'active',
            created_at: '2024/06/20 10:00',
            updated_at: '2025/04/01 10:00',
          },
          {
            id: 'MC014',
            name: '福利厚生プラン',
            contract_type: 'welfare',
            brand: 'fit365',
            price: 7150,
            suspension_fee: 550,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'direct',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A14',
            start_date: '2024/04/01',
            active_contracts: 98,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/03/01 10:00',
          },
          {
            id: 'MC015',
            name: 'プリペイド30',
            contract_type: 'prepaid',
            brand: 'joyfit',
            price: 3300,
            suspension_fee: 0,
            monthly_limit: 30,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A15',
            start_date: '2024/04/01',
            active_contracts: 72,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/02/01 10:00',
          },
          {
            id: 'MC016',
            name: '朝活会員',
            contract_type: 'general',
            brand: 'joyfit_yoga',
            price: 6050,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'direct',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A16',
            start_date: '2024/04/01',
            active_contracts: 64,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2025/01/01 10:00',
          },
          {
            id: 'MC017',
            name: '平日デイ会員',
            contract_type: 'general',
            brand: 'joyfit_plus',
            price: 6600,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'direct',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A17',
            start_date: '2024/04/01',
            active_contracts: 128,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2024/12/01 10:00',
          },
          {
            id: 'MC018',
            name: 'シニア午前会員',
            contract_type: 'special',
            brand: 'joyfit24',
            store: { id: 'store-006', name: 'JOYFIT24 新宿店' },
            price: 3850,
            suspension_fee: 550,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'direct',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A18',
            start_date: '2024/04/01',
            active_contracts: 54,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2024/11/01 10:00',
          },
          {
            id: 'MC019',
            name: '学生ナイト会員',
            contract_type: 'student',
            brand: 'joyfit',
            price: 4950,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: false,
            accounting_code: 'ACC-A19',
            start_date: '2024/04/01',
            active_contracts: 96,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2024/10/01 10:00',
          },
          {
            id: 'MC020',
            name: 'Weekend会員',
            contract_type: 'general',
            brand: 'fit365',
            price: 5720,
            suspension_fee: 1100,
            suspendable_months: 3,
            cancellable_months: 1,
            other_store_usage: 'all',
            companion_benefit_enabled: true,
            accounting_code: 'ACC-A20',
            start_date: '2024/04/01',
            active_contracts: 288,
            status: 'active',
            created_at: '2024/03/15 10:00',
            updated_at: '2024/09/01 10:00',
          },
        ];

        for (const spec of SPECS) {
          const isJoyfit = JOYFIT_BRANDS.includes(spec.brand);
          const children = SPECS.filter((other) => other.parent?.id === spec.id).map((child) => ({
            id: child.id,
            name: child.name,
          }));

          this._details[spec.id] = {
            id: spec.id,
            name: spec.name,
            old_code: spec.old_code ?? null,
            contract_type: spec.contract_type,
            brand: spec.brand,
            status: spec.status,

            target_store_id: spec.store?.id ?? null,
            target_store_name: spec.store?.name ?? null,
            other_store_usage: spec.other_store_usage,
            is_multi_usable: spec.is_multi_usable ?? false,
            is_changeable: spec.is_changeable ?? true,
            companion_benefit_enabled: spec.companion_benefit_enabled,
            previous_contract: null,

            public_name: spec.public_name ?? spec.name,
            public_description: spec.description ?? '',
            company: spec.company ?? null,
            terms_id: spec.terms?.id ?? null,
            terms_name: spec.terms?.name ?? null,
            thumbnail_url: null,
            description: spec.description ?? '',
            memo: null,

            price_including_tax: spec.price,
            suspension_fee: spec.suspension_fee,
            cancellation_fee: spec.cancellation_fee ?? null,
            tax_rate: 10,
            accounting_code: spec.accounting_code,
            // G-01 FR-M002 ブランド別差異: 入会金・事務手数料は JOYFIT系 / カード発行料・セキュリティ管理費・
            // 施設メンテナンス料は FIT365 のみ設定される
            enrollment_fee: isJoyfit ? 2000 : null,
            registration_fee: isJoyfit ? 3000 : null,
            card_issue_fee: isJoyfit ? null : 5000,
            security_fee: isJoyfit ? null : 0,
            maintenance_fee: isJoyfit ? null : 0,

            start_date: spec.start_date,
            monthly_limit: spec.monthly_limit ?? null,
            usage_hours_by_day: spec.is_multi_usable ? ALL_DAY_HOURS : BUSINESS_HOURS,

            suspendable_months: spec.suspendable_months ?? null,
            cancellable_months: spec.cancellable_months ?? null,
            initial_payment_months: spec.initial_payment_months ?? 1,
            same_day_cancellation: spec.same_day_cancellation ?? false,

            // G-01 ブランド別設定構築: 年齢制限は JOYFIT=15歳以上 / FIT365=16歳以上
            age_restriction: isJoyfit ? '15歳以上' : '16歳以上',
            gender_restriction: spec.gender_restriction ?? 'none',
            billing_enabled: spec.price > 0,

            is_copyable: true,
            copied_from_id: null,

            parent_contract_id: spec.parent?.id ?? null,
            parent_contract_name: spec.parent?.name ?? null,
            child_contracts: children,
            active_contracts: spec.active_contracts,

            created_at: spec.created_at,
            updated_at: spec.updated_at,
          };
          this._rows.push(toListItem(this._details[spec.id]!));
        }
      },
      getList(): MainContractListItem[] {
        this._seed();
        return [...this._rows];
      },
      getById(id: string): MainContractDetail | undefined {
        this._seed();
        return this._details[id];
      },
      getChangeHistory(id: string): MainContractChangeHistoryItem[] {
        this._seed();
        if (!this._changeHistory[id]) {
          this._changeHistory[id] = [
            {
              date: '2026/02/28 14:30',
              user: '管理者A',
              field: '説明文',
              from: '全時間帯利用可能な標準的な会員プラン。',
              to: '全時間帯利用可能な標準的な会員プラン。24時間いつでも全店舗のトレーニング施設を利用できます...',
            },
            {
              date: '2025/10/01 09:00',
              user: '管理者B',
              field: '料金（税込）',
              from: '¥7,150',
              to: '¥7,700',
            },
            {
              date: '2025/07/01 10:00',
              user: '管理者C',
              field: '休会可能月',
              from: '1ヶ月',
              to: '3ヶ月',
            },
            {
              date: '2025/04/01 10:00',
              user: '管理者A',
              field: 'ステータス',
              from: '無効',
              to: '有効',
            },
            { date: '2024/03/15 10:00', user: '管理者A', field: null, from: null, to: '新規作成' },
          ];
        }
        return this._changeHistory[id];
      },
      delete(id: string): boolean {
        this._seed();
        const idx = this._rows.findIndex((r) => r.id === id);
        if (idx === -1) return false;
        const parentId = this._details[id]?.parent_contract_id;
        this._rows.splice(idx, 1);
        delete this._details[id];
        delete this._changeHistory[id];
        // Drop the row from its parent's 派生マスタ list, otherwise the parent stays
        // undeletable behind a child that no longer exists.
        this._syncParentChildren(parentId);
        return true;
      },
      add(contract: MainContractDetail): void {
        this._seed();
        this._details[contract.id] = contract;
        this._rows.push(toListItem(contract));
        this._changeHistory[contract.id] = [
          {
            date: formatChangeHistoryTimestamp(new Date()),
            user: '管理者A',
            field: null,
            from: null,
            to: '新規作成',
          },
        ];
        this._syncParentChildren(contract.parent_contract_id);
      },
      update(id: string, data: Partial<MainContractDetail>): MainContractDetail | undefined {
        this._seed();
        const existing = this._details[id];
        if (!existing) return undefined;
        const previousParentId = existing.parent_contract_id;
        const now = new Date();
        const updated: MainContractDetail = {
          ...existing,
          ...data,
          id,
          updated_at: now.toISOString(),
        };
        this._details[id] = updated;

        // G-01 FR-S001: every change is recorded with its 変更前 / 変更後 pair.
        const changes = TRACKED_HISTORY_FIELDS.filter(
          (field) => existing[field.key] !== updated[field.key],
        ).map((field) => ({
          date: formatChangeHistoryTimestamp(now),
          user: '管理者A',
          field: field.label,
          from: field.format(existing[field.key]),
          to: field.format(updated[field.key]),
        }));
        if (changes.length > 0) this.getChangeHistory(id).unshift(...changes);

        const idx = this._rows.findIndex((r) => r.id === id);
        if (idx !== -1) this._rows[idx] = toListItem(updated);
        if (previousParentId !== updated.parent_contract_id) {
          this._syncParentChildren(previousParentId);
          this._syncParentChildren(updated.parent_contract_id);
        }
        return updated;
      },
      /** Recomputes 派生マスタ (child_contracts) of a parent so the delete guard stays accurate. */
      _syncParentChildren(parentId: string | null | undefined): void {
        if (!parentId) return;
        const parent = this._details[parentId];
        if (!parent) return;
        const children = Object.values(this._details)
          .filter((row) => row.parent_contract_id === parentId)
          .map((row) => ({ id: row.id, name: row.name }));
        this._details[parentId] = { ...parent, child_contracts: children };
        const idx = this._rows.findIndex((r) => r.id === parentId);
        if (idx !== -1) this._rows[idx] = toListItem(this._details[parentId]!);
      },
    },
  };
}
