import type { NoticeRecord } from '@/app/api/_mock-db/types/notices.type';
import type {
  NoticeBrandCode,
  NoticeNotificationSummary,
  NoticePublishStatus,
  NoticeSyncLog,
  NoticeType,
  NoticeWordpressSyncDetail,
  NoticeWordpressSyncStatus,
} from '@/app/api/_schemas/notice.schema';

/**
 * Seed for the shared 告知 / ブログ notices table (specs/blog-list, research R3 / R5).
 *
 * The header store switcher and `/crm/me` run on the real API, so store and staff ids
 * here are REAL dev-environment ids, captured from the running app on 2026-11-13
 * (`/stores` master, `/staffs` list). If the dev data is reset, 店舗指定 rows and the
 * own-article check simply stop matching — re-capture the ids then.
 *
 * These ids / names are real dev-environment values kept on purpose, so store scope
 * (blog-list Q4) and the own-article check (Q6) work in Phase 1. Replace them if the dev data
 * is reset. They are mock-only and are dropped in Phase 2 (real API).
 */

/** Real dev stores (`brandEnum` is the store's sub-brand, as served by GET /admin/stores). */
export const NOTICE_STORE_DIRECTORY = [
  { id: '01a1b4a9-4a10-7a84-8787-cf746b4ebaca', name: 'JOYFIT 群馬', brandEnum: 'Joyfit' },
  { id: '01a1b3f1-0b45-7951-9322-c4fbf13efbe9', name: 'JOYFIT+ 沖縄', brandEnum: 'JoyfitPlus' },
  { id: '01a1aef0-aedd-724a-9fe3-d76ba5004c74', name: 'JOYFIT YOGA 千葉', brandEnum: 'JoyfitYoga' },
  { id: '01a1aaea-dd79-7825-b9ba-1e858f6d5ba0', name: 'ST-TEST-Calendar', brandEnum: 'Joyfit24' },
  { id: '01a1b3b9-65ae-757c-9bfe-84cbb39c1097', name: 'FIT365 京都', brandEnum: 'Fit365' },
  { id: '01a1a4dd-2188-72f7-bd72-89cedb792630', name: 'FIT365_八潮', brandEnum: 'Fit365' },
  // Home store of the active Staff test account below.
  { id: '01a151cf-1b0a-7937-9dd6-4b1cfd8d15db', name: 'FIT 365 TESTER', brandEnum: 'Fit365' },
] as const;

/** Real dev staff ids used as `createdBy`. */
export const SEED_STAFF_IDS = {
  /** Active Staff account (home store: FIT 365 TESTER) — rows it authors are "own" for that login. */
  staff: '5944d560-54d9-49fe-bbf4-f1e08152fe3c',
  /** Another staff member — rows it authors are "他者作成" for the Staff login. */
  other: '9dc38b21-d97e-45fc-8350-f7a45484ba30',
} as const;

/** Display names for `createdByName` / `updatedByName` (gap BD-02, specs/blog-detail D7). */
const SEED_STAFF_NAMES: Record<string, string> = {
  [SEED_STAFF_IDS.staff]: 'テスト PW履歴',
  [SEED_STAFF_IDS.other]: '山田 花子',
};

/** Operator name the mock stamps as `updatedByName` on mutations (the caller is unknown). */
export const NOTICE_FALLBACK_OPERATOR_NAME = '本部 太郎';

/** Staff id stamped as createdBy / updatedBy when a mutation carries no `operator` (BF-02). */
export const NOTICE_FALLBACK_OPERATOR_ID = '00000000-0000-4000-8000-000000000001';

// ---------------------------------------------------------------------------
// Seed rows (T003). Compact specs expanded by `buildRows` into full `NoticeRecord`s.
// Datetimes are JST (+09:00). Ids are deterministic uuids.
// ---------------------------------------------------------------------------

type JoyfitSubBrand = Exclude<NoticeBrandCode, 'Fit365'>;

type ScopeSpec =
  | { kind: 'company' }
  | { kind: 'brand'; family: 'Joyfit' | 'Fit365'; subs?: JoyfitSubBrand[] }
  /** Indexes into `NOTICE_STORE_DIRECTORY` (all of one brand family). */
  | { kind: 'store'; storeIndexes: number[] };

type SeedSpec = {
  title: string;
  categoryId: string | null;
  scope: ScopeSpec;
  channel: 'web' | 'app' | 'both';
  status: NoticePublishStatus;
  /** `YYYY-MM-DD` (JST), published at 10:00. */
  start: string | null;
  end?: string;
  /** `YYYY-MM-DD` (JST) of the soft delete. */
  deleted?: string;
  /** Omitted → `success` for sync targets (WEB + published / unpublished), else null. */
  sync?: NoticeWordpressSyncStatus | null;
  author?: 'staff' | 'other';
  /** false → no thumbnail. */
  thumbnail?: boolean;
  /** `YYYY-MM-DD` creation date; defaults to 3 days before `start`. */
  created?: string;
  /** 通知到達サマリー figures recorded at publish time (gap AD-01); omitted → null. */
  reach?: { target: number; notified: number };
};

const COMPANY: ScopeSpec = { kind: 'company' };
const brand = (family: 'Joyfit' | 'Fit365', subs?: JoyfitSubBrand[]): ScopeSpec => ({
  kind: 'brand',
  family,
  subs,
});
const stores = (...storeIndexes: number[]): ScopeSpec => ({ kind: 'store', storeIndexes });

// Same host/photos as other seeds; `images.unsplash.com` is allowed in next.config images.
const THUMBNAIL_URLS = [
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=533&fit=crop',
];

const BLOG_SPECS: SeedSpec[] = [
  {
    title: '初心者向け：ジムデビュー前に知っておきたい5つのこと',
    categoryId: 'CAT-020',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2025-09-01',
  },
  {
    title: 'スクワットの正しいフォームを徹底解説',
    categoryId: 'CAT-004',
    scope: brand('Joyfit'),
    channel: 'web',
    status: 'published',
    start: '2025-09-10',
  },
  {
    title: '秋の味覚で栄養補給！トレーニング後のおすすめ食材',
    categoryId: 'CAT-007',
    scope: brand('Joyfit', ['Joyfit24']),
    channel: 'both',
    status: 'published',
    start: '2025-09-20',
  },
  {
    title: 'ホットヨガで得られる3つの効果',
    categoryId: 'CAT-005',
    scope: brand('Joyfit', ['JoyfitYoga']),
    channel: 'both',
    status: 'published',
    start: '2025-10-01',
  },
  {
    title: 'FIT365で24時間トレーニングを楽しむコツ',
    categoryId: 'CAT-021',
    scope: brand('Fit365'),
    channel: 'web',
    status: 'published',
    start: '2025-10-05',
  },
  {
    title: 'スタッフ紹介：JOYFIT群馬の人気トレーナー',
    categoryId: 'CAT-008',
    scope: stores(0),
    channel: 'web',
    status: 'unpublished',
    start: '2025-10-12',
    end: '2025-12-31',
  },
  {
    title: '体幹トレーニングで姿勢を整えよう',
    categoryId: 'CAT-022',
    scope: COMPANY,
    channel: 'app',
    status: 'published',
    start: '2025-10-20',
  },
  {
    title: 'プロテインの選び方ガイド',
    categoryId: 'CAT-023',
    scope: brand('Joyfit', ['JoyfitPlus']),
    channel: 'both',
    status: 'published',
    start: '2025-11-01',
  },
  {
    title: '女性のための筋トレ入門',
    categoryId: 'CAT-024',
    scope: brand('Joyfit'),
    channel: 'both',
    status: 'published',
    start: '2025-11-10',
    sync: 'failed',
  },
  {
    title: 'シニア世代の安全なトレーニング方法',
    categoryId: 'CAT-025',
    scope: COMPANY,
    channel: 'web',
    status: 'published',
    start: '2025-11-20',
    thumbnail: false,
  },
  {
    title: '冬の運動不足を解消する自宅ストレッチ',
    categoryId: 'CAT-022',
    scope: brand('Fit365'),
    channel: 'app',
    status: 'published',
    start: '2025-12-01',
  },
  {
    title: '年末年始の過ごし方とトレーニングのヒント',
    categoryId: null,
    scope: COMPANY,
    channel: 'both',
    status: 'unpublished',
    start: '2025-12-15',
    end: '2026-01-10',
  },
  {
    title: '新年の目標設定：続けられるトレーニング計画',
    categoryId: 'CAT-009',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-01-05',
  },
  {
    title: 'JOYFIT24で深夜トレーニングを安全に楽しむ',
    categoryId: 'CAT-021',
    scope: brand('Joyfit', ['Joyfit24']),
    channel: 'web',
    status: 'published',
    start: '2026-01-15',
    sync: 'pending',
  },
  {
    title: 'ヨガ初心者が最初に覚えたいポーズ10選',
    categoryId: 'CAT-005',
    scope: stores(2),
    channel: 'both',
    status: 'published',
    start: '2026-01-25',
  },
  {
    title: 'バレンタイン特集：ヘルシースイーツレシピ',
    categoryId: 'CAT-007',
    scope: brand('Joyfit'),
    channel: 'both',
    status: 'unpublished',
    start: '2026-02-05',
    end: '2026-02-15',
  },
  {
    title: 'ダイエット中でも楽しめる外食メニューの選び方',
    categoryId: 'CAT-006',
    scope: COMPANY,
    channel: 'web',
    status: 'published',
    start: '2026-02-15',
    author: 'staff',
  },
  {
    title: '花粉の季節のトレーニング注意点',
    categoryId: 'CAT-009',
    scope: brand('Fit365'),
    channel: 'both',
    status: 'published',
    start: '2026-03-01',
  },
  {
    title: 'JOYFIT+ 沖縄 スタッフおすすめのマシン',
    categoryId: 'CAT-008',
    scope: stores(1),
    channel: 'app',
    status: 'published',
    start: '2026-03-10',
  },
  {
    title: '春から始めるランニング入門',
    categoryId: 'CAT-021',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-03-20',
  },
  {
    title: 'ピラティスとヨガの違いとは？',
    categoryId: 'CAT-005',
    scope: brand('Joyfit', ['JoyfitYoga', 'JoyfitPlus']),
    channel: 'both',
    status: 'published',
    start: '2026-04-01',
  },
  {
    title: '新生活応援！ジム通いを習慣にする方法',
    categoryId: 'CAT-020',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-04-10',
    thumbnail: false,
  },
  {
    title: 'ベンチプレスで胸板を厚くするポイント',
    categoryId: 'CAT-004',
    scope: brand('Joyfit', ['Joyfit']),
    channel: 'web',
    status: 'published',
    start: '2026-04-20',
  },
  {
    title: 'GW中のおすすめ自宅トレーニング',
    categoryId: 'CAT-022',
    scope: brand('Fit365'),
    channel: 'web',
    status: 'unpublished',
    start: '2026-04-28',
    sync: 'failed',
    author: 'staff',
  },
  {
    title: 'たんぱく質を効率よく摂る食事術',
    categoryId: 'CAT-023',
    scope: COMPANY,
    channel: 'app',
    status: 'published',
    start: '2026-05-08',
  },
  {
    title: 'FIT365 京都 オープン1周年記念ブログ',
    categoryId: null,
    scope: stores(4),
    channel: 'both',
    status: 'published',
    start: '2026-05-15',
  },
  {
    title: '梅雨時期の体調管理とコンディショニング',
    categoryId: 'CAT-009',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-06-01',
    deleted: '2026-06-20',
  },
  {
    title: '夏に向けたボディメイク計画',
    categoryId: 'CAT-006',
    scope: brand('Joyfit'),
    channel: 'both',
    status: 'published',
    start: '2026-06-10',
  },
  {
    title: '熱中症を防ぐ水分補給のポイント',
    categoryId: 'CAT-009',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-06-20',
  },
  {
    title: 'FIT 365 TESTER店 スタッフ日記',
    categoryId: 'CAT-008',
    scope: stores(6),
    channel: 'web',
    status: 'published',
    start: '2026-07-01',
    author: 'staff',
  },
  {
    title: 'ヨガで夏バテ知らずの体づくり',
    categoryId: 'CAT-005',
    scope: brand('Joyfit', ['JoyfitYoga']),
    channel: 'app',
    status: 'published',
    start: '2026-07-10',
  },
  {
    title: '有酸素運動と筋トレの最適な順番',
    categoryId: 'CAT-021',
    scope: brand('Fit365'),
    channel: 'both',
    status: 'published',
    start: '2026-07-20',
  },
  {
    title: '夏休みに親子でできる簡単エクササイズ',
    categoryId: null,
    scope: COMPANY,
    channel: 'both',
    status: 'unpublished',
    start: '2026-07-25',
    end: '2026-08-31',
  },
  {
    title: '骨盤まわりを整えるストレッチ',
    categoryId: 'CAT-022',
    scope: brand('Joyfit', ['JoyfitPlus']),
    channel: 'web',
    status: 'published',
    start: '2026-08-05',
    sync: 'failed',
  },
  {
    title: 'JOYFIT YOGA 千葉 新クラスのご紹介',
    categoryId: 'CAT-005',
    scope: stores(2),
    channel: 'both',
    status: 'published',
    start: '2026-08-15',
    deleted: '2026-09-01',
  },
  {
    title: 'サプリメントとの上手な付き合い方',
    categoryId: 'CAT-023',
    scope: brand('Joyfit'),
    channel: 'both',
    status: 'published',
    start: '2026-08-25',
  },
  {
    title: '秋のスポーツシーズンに向けた体づくり',
    categoryId: 'CAT-004',
    scope: COMPANY,
    channel: 'web',
    status: 'published',
    start: '2026-09-01',
    sync: 'pending',
  },
  {
    title: '女性に人気のヒップアップトレーニング',
    categoryId: 'CAT-024',
    scope: brand('Joyfit', ['Joyfit24']),
    channel: 'both',
    status: 'published',
    start: '2026-09-10',
  },
  {
    title: 'FIT365 八潮 × 京都 合同イベントレポート',
    categoryId: null,
    scope: stores(4, 5),
    channel: 'both',
    status: 'published',
    start: '2026-09-15',
  },
  {
    title: 'シニア向け転倒予防エクササイズ',
    categoryId: 'CAT-025',
    scope: brand('Fit365'),
    channel: 'app',
    status: 'published',
    start: '2026-09-25',
  },
  {
    title: '食欲の秋に気をつけたい間食のとり方',
    categoryId: 'CAT-007',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-10-01',
  },
  {
    title: 'デッドリフトの基本とケガ予防',
    categoryId: 'CAT-004',
    scope: brand('Joyfit'),
    channel: 'web',
    status: 'unpublished',
    start: '2026-10-05',
  },
  {
    title: '睡眠の質を上げる夜のストレッチ',
    categoryId: 'CAT-022',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-10-10',
    thumbnail: false,
  },
  {
    title: 'ST-TEST-Calendar店 24時間営業のご案内',
    categoryId: null,
    scope: stores(3),
    channel: 'web',
    status: 'published',
    start: '2026-10-15',
    sync: 'failed',
  },
  {
    title: 'ハロウィン特集：かぼちゃを使った高たんぱくレシピ',
    categoryId: 'CAT-007',
    scope: brand('Joyfit', ['Joyfit', 'Joyfit24']),
    channel: 'both',
    status: 'unpublished',
    start: '2026-10-20',
    end: '2026-10-31',
    deleted: '2026-11-05',
  },
  {
    title: '筋肉痛のときはトレーニングしていい？',
    categoryId: 'CAT-020',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-10-25',
    author: 'staff',
  },
  {
    title: 'FIT365 京都・八潮・TESTER 合同キャンペーン振り返り',
    categoryId: 'CAT-021',
    scope: stores(4, 5, 6),
    channel: 'both',
    status: 'published',
    start: '2026-11-01',
    author: 'staff',
  },
  {
    title: '冬に向けた免疫力アップの食習慣',
    categoryId: 'CAT-009',
    scope: brand('Fit365'),
    channel: 'both',
    status: 'published',
    start: '2026-11-05',
    sync: 'pending',
  },
  {
    title: 'ヨガ×瞑想でストレスケア',
    categoryId: 'CAT-005',
    scope: brand('Joyfit', ['JoyfitYoga']),
    channel: 'web',
    status: 'published',
    start: '2026-11-10',
    sync: null,
  },
  {
    title: 'ジムでのマナーとエチケット',
    categoryId: 'CAT-020',
    scope: COMPANY,
    channel: 'web',
    status: 'published',
    start: '2026-11-12',
    sync: null,
    author: 'staff',
  },
  // 公開予定
  {
    title: '年末大掃除で消費カロリーアップ',
    categoryId: 'CAT-009',
    scope: COMPANY,
    channel: 'both',
    status: 'scheduled',
    start: '2026-11-20',
  },
  {
    title: 'クリスマス前の2週間集中ボディメイク',
    categoryId: 'CAT-006',
    scope: brand('Joyfit'),
    channel: 'web',
    status: 'scheduled',
    start: '2026-12-01',
  },
  {
    title: 'FIT365 冬季限定プログラムのご案内',
    categoryId: 'CAT-021',
    scope: brand('Fit365'),
    channel: 'app',
    status: 'scheduled',
    start: '2026-12-05',
    author: 'staff',
  },
  {
    title: 'JOYFIT+ 沖縄 年末イベントレポート予告',
    categoryId: null,
    scope: stores(1),
    channel: 'both',
    status: 'scheduled',
    start: '2026-12-10',
    thumbnail: false,
  },
  {
    title: '新年に向けたヨガ習慣づくり',
    categoryId: 'CAT-005',
    scope: brand('Joyfit', ['JoyfitYoga']),
    channel: 'both',
    status: 'scheduled',
    start: '2026-12-20',
    deleted: '2026-11-11',
  },
  // 下書き
  {
    title: 'トレーナーが教える肩こり解消法',
    categoryId: 'CAT-022',
    scope: COMPANY,
    channel: 'both',
    status: 'draft',
    start: null,
    created: '2026-11-02',
  },
  {
    title: 'FIT 365 TESTER店 新マシン紹介',
    categoryId: null,
    scope: stores(6),
    channel: 'web',
    status: 'draft',
    start: null,
    author: 'staff',
    thumbnail: false,
    created: '2026-11-03',
  },
  {
    title: '低糖質ダイエットの始め方',
    categoryId: 'CAT-006',
    scope: brand('Joyfit', ['JoyfitPlus']),
    channel: 'app',
    status: 'draft',
    start: null,
    created: '2026-11-04',
  },
  {
    title: '筋トレ記録アプリの活用術',
    categoryId: 'CAT-020',
    scope: brand('Fit365'),
    channel: 'both',
    status: 'draft',
    start: '2027-01-10',
    created: '2026-11-05',
  },
  {
    title: 'JOYFIT群馬 冬のおすすめレッスン',
    categoryId: 'CAT-005',
    scope: stores(0),
    channel: 'both',
    status: 'draft',
    start: null,
    deleted: '2026-11-08',
    created: '2026-11-06',
  },
  {
    title: 'インターバルトレーニングで効率よく脂肪燃焼',
    categoryId: 'CAT-021',
    scope: brand('Joyfit', ['Joyfit24']),
    channel: 'web',
    status: 'draft',
    start: null,
    author: 'staff',
    created: '2026-11-07',
  },
  {
    title: 'ストレッチポールの使い方',
    categoryId: 'CAT-022',
    scope: COMPANY,
    channel: 'app',
    status: 'draft',
    start: null,
    thumbnail: false,
    created: '2026-11-09',
  },
  {
    title: '栄養士監修：1週間の作り置き献立',
    categoryId: 'CAT-007',
    scope: COMPANY,
    channel: 'both',
    status: 'draft',
    start: null,
    created: '2026-11-10',
  },
  {
    title: '春の新プログラム予告',
    categoryId: 'CAT-006',
    scope: brand('Joyfit'),
    channel: 'both',
    status: 'draft',
    start: '2027-03-01',
    created: '2026-11-11',
  },
];

const NOTICE_SPECS: SeedSpec[] = [
  {
    title: 'JOYFIT群馬 設備リニューアルのお知らせ',
    categoryId: 'CAT-002',
    scope: stores(0),
    channel: 'web',
    status: 'unpublished',
    start: '2026-09-01',
    reach: { target: 3420, notified: 3418 },
  },
  {
    title: 'FIT365 新規入会キャンペーンのお知らせ',
    categoryId: 'CAT-010',
    scope: brand('Fit365'),
    channel: 'both',
    status: 'published',
    start: '2026-10-01',
    reach: { target: 12850, notified: 12790 },
  },
  {
    title: '年末年始の営業時間のお知らせ',
    categoryId: 'CAT-002',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-11-01',
    reach: { target: 5210, notified: 5102 },
  },
  {
    title: 'システムメンテナンスのお知らせ',
    categoryId: 'CAT-003',
    scope: COMPANY,
    channel: 'app',
    status: 'scheduled',
    start: '2026-11-25',
  },
  {
    title: '会員アプリ機能追加のお知らせ',
    categoryId: null,
    scope: COMPANY,
    channel: 'app',
    status: 'draft',
    start: null,
    created: '2026-11-08',
  },
  // -- Announcement list cases (specs/announcement-list research R7 / R8), consistent with 2026-11-20. --
  {
    title: '会員規約改定のお知らせ',
    categoryId: null,
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-11-15',
    end: '2026-12-31',
    reach: { target: 860, notified: 858 },
  },
  {
    title: '台風接近に伴う臨時休館のお知らせ',
    categoryId: 'CAT-003',
    scope: brand('Joyfit'),
    channel: 'both',
    status: 'published',
    start: '2026-11-18',
    end: '2026-11-22',
    sync: 'failed',
    reach: { target: 41200, notified: 40870 },
  },
  {
    title: 'JOYFIT24・JOYFIT YOGA 合同キャンペーンのお知らせ',
    categoryId: 'CAT-001',
    scope: brand('Joyfit', ['Joyfit24', 'JoyfitYoga']),
    channel: 'web',
    status: 'published',
    start: '2026-11-10',
    end: '2026-12-15',
    reach: { target: 1530, notified: 1497 },
  },
  {
    title: 'FIT365 京都・八潮 駐車場工事のお知らせ',
    categoryId: 'CAT-002',
    scope: stores(4, 5),
    channel: 'web',
    status: 'published',
    start: '2026-11-12',
    end: '2026-11-30',
    author: 'staff',
    reach: { target: 2280, notified: 2280 },
  },
  {
    title: 'FIT 365 TESTER 営業時間変更のお知らせ',
    categoryId: 'CAT-002',
    scope: stores(6),
    channel: 'both',
    status: 'published',
    start: '2026-11-05',
    author: 'staff',
    reach: { target: 9640, notified: 9512 },
  },
  {
    title: '会員アプリ新バージョン公開のお知らせ',
    categoryId: 'CAT-003',
    scope: COMPANY,
    channel: 'app',
    status: 'published',
    start: '2026-11-02',
    end: '2027-01-31',
  },
  {
    title: '冬季限定 入会金無料キャンペーン',
    categoryId: 'CAT-010',
    scope: brand('Fit365'),
    channel: 'both',
    status: 'scheduled',
    start: '2026-12-01',
    end: '2027-01-15',
  },
  {
    title: 'JOYFIT+ 沖縄 リニューアルオープンのお知らせ',
    categoryId: 'CAT-002',
    scope: stores(1),
    channel: 'web',
    status: 'scheduled',
    start: '2026-12-10',
    end: '2027-02-28',
  },
  {
    title: '年末年始の休館日について',
    categoryId: null,
    scope: COMPANY,
    channel: 'both',
    status: 'scheduled',
    start: '2026-12-20',
    end: '2027-01-05',
  },
  {
    title: 'JOYFIT YOGA 千葉 新プログラム開始のお知らせ',
    categoryId: 'CAT-002',
    scope: stores(2),
    channel: 'app',
    status: 'draft',
    start: null,
    created: '2026-11-17',
    author: 'staff',
  },
  {
    title: 'スタッフ募集のお知らせ',
    categoryId: null,
    scope: brand('Joyfit'),
    channel: 'web',
    status: 'draft',
    start: null,
    created: '2026-11-19',
  },
  {
    title: '夏季休業期間の営業時間のお知らせ',
    categoryId: 'CAT-002',
    scope: COMPANY,
    channel: 'both',
    status: 'unpublished',
    start: '2026-07-15',
    end: '2026-08-31',
    reach: { target: 415, notified: 409 },
  },
  {
    title: '秋の入会キャンペーン終了のお知らせ',
    categoryId: 'CAT-001',
    scope: brand('Joyfit'),
    channel: 'web',
    status: 'unpublished',
    start: '2026-09-15',
    end: '2026-10-31',
    reach: { target: 18300, notified: 18120 },
  },
  {
    title: 'FIT365 京都 シャワー設備点検のお知らせ',
    categoryId: 'CAT-002',
    scope: stores(4),
    channel: 'web',
    status: 'unpublished',
    start: '2026-10-20',
    end: '2026-11-10',
    sync: 'failed',
    reach: { target: 3075, notified: 3011 },
  },
  {
    title: '個人情報保護方針改定のお知らせ',
    categoryId: 'CAT-003',
    scope: COMPANY,
    channel: 'web',
    status: 'published',
    start: '2026-11-19',
    sync: 'pending',
    reach: { target: 6720, notified: 6688 },
  },
  {
    title: 'JOYFIT24 深夜帯セキュリティ強化のお知らせ',
    categoryId: 'CAT-003',
    scope: brand('Joyfit', ['Joyfit24']),
    channel: 'both',
    status: 'published',
    start: '2026-11-16',
    end: '2026-12-20',
    sync: 'pending',
    reach: { target: 27450, notified: 27210 },
  },
  {
    title: 'ST-TEST-Calendar 休館日カレンダー更新',
    categoryId: null,
    scope: stores(3),
    channel: 'app',
    status: 'published',
    start: '2026-11-08',
    end: '2026-11-28',
    reach: { target: 990, notified: 984 },
  },
  {
    title: 'JOYFIT群馬 ロッカー増設のお知らせ',
    categoryId: 'CAT-002',
    scope: stores(0),
    channel: 'both',
    status: 'published',
    start: '2026-11-11',
    end: '2026-12-25',
    reach: { target: 4410, notified: 4365 },
  },
  {
    title: 'FIT365 全店 料金プラン改定のお知らせ',
    categoryId: 'CAT-010',
    scope: brand('Fit365'),
    channel: 'web',
    status: 'published',
    start: '2026-11-03',
    end: '2027-03-31',
    reach: { target: 735, notified: 731 },
  },
  {
    title: '【重要】不審メールにご注意ください',
    categoryId: 'CAT-003',
    scope: COMPANY,
    channel: 'both',
    status: 'published',
    start: '2026-10-25',
    reach: { target: 15800, notified: 15640 },
  },
  {
    title: 'FIT365 八潮 イベント開催のお知らせ',
    categoryId: 'CAT-010',
    scope: stores(5),
    channel: 'web',
    status: 'published',
    start: '2026-11-14',
    end: '2026-11-29',
    author: 'staff',
    reach: { target: 2100, notified: 2077 },
  },
  {
    title: 'JOYFIT 全店 キッズスクール受付開始',
    categoryId: 'CAT-001',
    scope: brand('Joyfit'),
    channel: 'app',
    status: 'scheduled',
    start: '2026-11-28',
  },
  {
    title: '旧会員サイト終了のお知らせ',
    categoryId: 'CAT-003',
    scope: COMPANY,
    channel: 'web',
    status: 'unpublished',
    start: '2026-06-01',
    end: '2026-09-30',
    deleted: '2026-10-05',
    reach: { target: 3420, notified: 3418 },
  },
  {
    title: 'テスト投稿（削除予定）',
    categoryId: null,
    scope: brand('Fit365'),
    channel: 'app',
    status: 'draft',
    start: null,
    created: '2026-11-01',
    deleted: '2026-11-04',
    author: 'staff',
  },
  {
    title: 'JOYFIT YOGA 千葉 レッスン時間変更のお知らせ',
    categoryId: 'CAT-002',
    scope: stores(2),
    channel: 'both',
    status: 'published',
    start: '2026-11-09',
    end: '2026-12-08',
    reach: { target: 12850, notified: 12790 },
  },
];

/** `YYYY-MM-DD` shifted by `days` (calendar arithmetic, timezone-free). */
function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const jst = (date: string, time: string) => `${date}T${time}+09:00`;

function familyOf(brandEnum: NoticeBrandCode): 'Joyfit' | 'Fit365' {
  return brandEnum === 'Fit365' ? 'Fit365' : 'Joyfit';
}

function scopeFields(
  scope: ScopeSpec,
): Pick<
  NoticeRecord,
  'brandScope' | 'brandCode' | 'subBrandCodes' | 'storeScope' | 'targetStores'
> {
  if (scope.kind === 'company') {
    return {
      brandScope: 'company',
      brandCode: null,
      subBrandCodes: null,
      storeScope: 'all',
      targetStores: [],
    };
  }
  if (scope.kind === 'brand') {
    return {
      brandScope: 'brand',
      brandCode: scope.family,
      subBrandCodes: scope.subs ? [...scope.subs] : null,
      storeScope: 'all',
      targetStores: [],
    };
  }
  const targets = scope.storeIndexes.map((index) => NOTICE_STORE_DIRECTORY[index]);
  const family = familyOf(targets[0].brandEnum);
  return {
    brandScope: 'store',
    brandCode: family,
    // JOYFIT store rows name the targeted sub-brands so a sub-brand filter stays precise.
    subBrandCodes:
      family === 'Joyfit' ? [...new Set(targets.map((store) => store.brandEnum))] : null,
    storeScope: 'specific',
    targetStores: targets.map((store) => ({ id: store.id, name: store.name })),
  };
}

/** ISO JST datetime shifted by `minutes`, re-rendered as `YYYY-MM-DDTHH:mm:ss+09:00`. */
function shiftJst(iso: string, minutes: number): string {
  const shifted = new Date(Date.parse(iso) + Math.round((minutes + 9 * 60) * 60 * 1000));
  return `${shifted.toISOString().slice(0, 19)}+09:00`;
}

const BODY_HEADINGS = ['ポイント', 'おすすめの取り組み方', '続けるためのコツ', 'チェックリスト'];
const BODY_LIST_ITEMS = [
  ['無理のない頻度から始める', '正しいフォームを意識する', '水分補給をこまめに行う'],
  ['ウォームアップを丁寧に行う', '目標を小さく区切る', 'スタッフに気軽に相談する', '記録をつける'],
  ['睡眠と食事を整える', '週ごとに振り返る'],
];

/** Short rich-text body (paragraphs + one `<h2>` + a `<ul>`), varied by row index (research D7). */
function buildBody(title: string, index: number): string {
  const heading = BODY_HEADINGS[index % BODY_HEADINGS.length];
  const items = BODY_LIST_ITEMS[index % BODY_LIST_ITEMS.length]
    .map((item) => `<li>${item}</li>`)
    .join('');
  const intro =
    index % 2 === 0
      ? `<p>今回は「${title}」についてご紹介します。</p>`
      : `<p>「${title}」をテーマに、スタッフがわかりやすく解説します。</p><p>初めての方も<strong>安心して</strong>お読みください。</p>`;
  return `${intro}<h2>${heading}</h2><ul>${items}</ul><p>ご不明な点は店舗スタッフまでお気軽にお問い合わせください。</p>`;
}

const SYNC_ERROR_MESSAGE = 'WordPress APIがタイムアウトしました';

function buildWordpressSync(
  status: NoticeWordpressSyncStatus,
  syncedAt: string | null,
): NoticeWordpressSyncDetail {
  return {
    status,
    syncedAt,
    errorMessage: status === 'failed' ? SYNC_ERROR_MESSAGE : null,
    attemptCount: status === 'failed' ? 3 : 1,
  };
}

/**
 * 1–3 sync logs, newest first: failed rows log all 3 failed attempts; success rows 1–3 successful
 * syncs; pending rows a pending entry on top of earlier successful syncs.
 */
function buildSyncLogs(
  idPrefix: string,
  sync: NoticeWordpressSyncDetail,
  baseAt: string,
  triggeredBy: string,
  index: number,
): NoticeSyncLog[] {
  const count = sync.status === 'failed' ? 3 : (index % 3) + 1;
  return Array.from({ length: count }, (_, k) => {
    // 20 s apart, so even retries of a 10:01 sync stay after the 10:00 publish.
    const at = shiftJst(baseAt, -k / 3);
    const syncStatus: NoticeWordpressSyncStatus =
      k === 0 || sync.status === 'failed' ? sync.status : 'success';
    return {
      id: `${idPrefix}${String(k + 1).padStart(3, '0')}`,
      syncStatus,
      syncedAt: syncStatus === 'pending' ? null : at,
      errorMessage: syncStatus === 'failed' ? SYNC_ERROR_MESSAGE : null,
      triggeredBy: k === 0 ? triggeredBy : null,
      createdAt: at,
    };
  });
}

/** 配信率 = notified / target × 100, one decimal (0 when nobody was targeted). */
function buildNotificationSummary(reach: SeedSpec['reach']): NoticeNotificationSummary | null {
  if (!reach) return null;
  const deliveryRate =
    reach.target === 0 ? 0 : Math.round((reach.notified / reach.target) * 1000) / 10;
  return { targetCount: reach.target, notifiedCount: reach.notified, deliveryRate };
}

function buildRows(type: NoticeType, specs: SeedSpec[]): NoticeRecord[] {
  const prefix = type === 'blog' ? 'BL' : 'AN';
  const idGroup = type === 'blog' ? '8000' : '8001';
  const logIdGroup = type === 'blog' ? '9000' : '9001';
  const counterByYear = new Map<string, number>();

  return specs.map((spec, index) => {
    const seq = index + 1;
    const id = `0193a2b4-5c6d-7e8f-${idGroup}-${String(seq).padStart(12, '0')}`;
    const createdDate = spec.created ?? shiftDate(spec.start ?? '2026-11-01', -3);
    const year = createdDate.slice(0, 4);
    const yearCount = (counterByYear.get(year) ?? 0) + 1;
    counterByYear.set(year, yearCount);

    const channelWeb = spec.channel !== 'app';
    const channelApp = spec.channel !== 'web';
    const isSyncTarget =
      channelWeb && (spec.status === 'published' || spec.status === 'unpublished');
    const syncStatus = spec.sync === undefined ? (isSyncTarget ? 'success' : null) : spec.sync;
    const hasThumbnail = spec.thumbnail !== false;
    const author = spec.author === 'staff' ? SEED_STAFF_IDS.staff : SEED_STAFF_IDS.other;
    const createdAt = jst(createdDate, '09:00:00');
    const publishStartAt = spec.start ? jst(spec.start, '10:00:00') : null;
    const deletedAt = spec.deleted ? jst(spec.deleted, '15:30:00') : null;
    const wordpressSync =
      syncStatus === null
        ? null
        : buildWordpressSync(
            syncStatus,
            syncStatus === 'pending' || !spec.start ? null : jst(spec.start, '10:01:00'),
          );
    const authorName = SEED_STAFF_NAMES[author] ?? null;

    return {
      id,
      type,
      articleNo: `${prefix}-${year}-${String(yearCount).padStart(4, '0')}`,
      title: spec.title,
      categoryId: spec.categoryId,
      thumbnailS3Key: hasThumbnail ? `notices/${type}/${id}.jpg` : null,
      thumbnailUrl: hasThumbnail ? THUMBNAIL_URLS[index % THUMBNAIL_URLS.length] : null,
      ...scopeFields(spec.scope),
      channelWeb,
      channelApp,
      publishStatus: spec.status,
      publishStartAt,
      publishEndAt: spec.end ? jst(spec.end, '23:59:59') : null,
      wordpressSync,
      deletedAt,
      createdBy: author,
      updatedBy: author,
      createdAt,
      updatedAt: deletedAt ?? publishStartAt ?? createdAt,
      body: buildBody(spec.title, index),
      recentSyncLogs: wordpressSync
        ? buildSyncLogs(
            `0193a2b4-5c6d-7e8f-${logIdGroup}-${String(seq).padStart(9, '0')}`,
            wordpressSync,
            wordpressSync.syncedAt ?? shiftJst(publishStartAt ?? createdAt, 1),
            author,
            index,
          )
        : [],
      createdByName: authorName,
      updatedByName: authorName,
      notificationSummary: buildNotificationSummary(spec.reach),
    };
  });
}

export const SEED_NOTICES: NoticeRecord[] = [
  ...buildRows('blog', BLOG_SPECS),
  ...buildRows('notice', NOTICE_SPECS),
];
