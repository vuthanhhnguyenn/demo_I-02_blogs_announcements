import type { OrgLevel } from '@/app/api/_schemas/org-hierarchy.schema';

/**
 * Y-15 organisational hierarchy (head office -> block -> area -> territory -> store) mock data.
 *
 * Taken from the UI prototype `dx-fitness/fitness-crm-ui`, `src/data/org-hierarchy.ts`
 * (3 head offices / 8 blocks / 11 areas / 57 territories, 2 of them inactive). Y-15 itself
 * carries no full list — the prototype invented this data — so it is copied here verbatim,
 * ids (HQ-x / BLK-nn / AREA-nn / TRT-nnn) and ordering included, to keep the two comparable.
 *
 * The prototype's hash-generated store names under each territory are NOT carried over: in
 * this CRM the store master (`store.table.ts`) is the single source of truth, and the
 * store→territory link lives on the store row's `territory_id` (Y-02 L132: the territory is
 * the only thing a store stores).
 */
export type OrgNodeRow = {
  id: string;
  level: OrgLevel;
  name: string;
  parent_id: string | null;
  order: number;
  note: string | null;
  active: boolean;
};

const HEADQUARTERS_DEFS: { id: string; name: string; note: string }[] = [
  { id: 'HQ-E', name: 'EAST運営本部', note: '関東・東北・北海道エリアを統括' },
  { id: 'HQ-W', name: 'WEST運営本部', note: '中部・関西エリアを統括' },
  { id: 'HQ-S', name: 'SOUTH運営本部', note: '中国・九州・四国エリアを統括' },
];

/** Area order — territory ids (TRT-nnn) are numbered following it, as in the prototype */
const AREA_NAMES = [
  '第1エリア',
  '第2エリア',
  '第3エリア',
  '第4エリア',
  '第5エリア',
  '第6エリア',
  '第7エリア',
  '中部エリア',
  '関西エリア',
  '中国・九州エリア',
  '四国エリア',
];

const BLOCK_DEFS: {
  id: string;
  name: string;
  headquarters_id: string;
  areas: string[];
  note?: string;
}[] = [
  {
    id: 'BLK-01',
    name: '関東第1運営ブロック',
    headquarters_id: 'HQ-E',
    areas: ['第1エリア', '第2エリア'],
  },
  {
    id: 'BLK-02',
    name: '関東第2運営ブロック',
    headquarters_id: 'HQ-E',
    areas: ['第3エリア', '第4エリア'],
  },
  { id: 'BLK-03', name: '北関東運営ブロック', headquarters_id: 'HQ-E', areas: ['第5エリア'] },
  {
    id: 'BLK-04',
    name: '東北・北海道運営ブロック',
    headquarters_id: 'HQ-E',
    areas: ['第6エリア', '第7エリア'],
  },
  { id: 'BLK-05', name: '中部運営ブロック', headquarters_id: 'HQ-W', areas: ['中部エリア'] },
  { id: 'BLK-06', name: '関西運営ブロック', headquarters_id: 'HQ-W', areas: ['関西エリア'] },
  {
    id: 'BLK-07',
    name: '中国・九州運営ブロック',
    headquarters_id: 'HQ-S',
    areas: ['中国・九州エリア'],
  },
  {
    id: 'BLK-08',
    name: '四国ブロック',
    headquarters_id: 'HQ-S',
    areas: ['四国エリア'],
    note: 'スイミング部門を含む（部門区分の管理は Phase 2）',
  },
];

type TerritoryDef = { name: string; note?: string };

const TERRITORY_DEFS: Record<string, TerritoryDef[]> = {
  第1エリア: [
    {
      name: '東京中央テリトリー',
      note: '都心3店＋吉祥寺に、東京都練馬区・板橋区と隣接する和光を加えた東京都心圏のテリトリー',
    },
    { name: '埼玉南テリトリー' },
    { name: '東葛テリトリー' },
    { name: '埼玉西テリトリー' },
    { name: '埼玉北テリトリー' },
  ],
  第2エリア: [
    { name: '城東テリトリー' },
    { name: '江東テリトリー' },
    { name: '下町テリトリー' },
    { name: '城北テリトリー' },
    { name: '城西テリトリー' },
  ],
  第3エリア: [
    { name: '川崎テリトリー' },
    { name: '湘南テリトリー' },
    {
      name: '県央テリトリー',
      note: '旧「県西テリトリー」。配下が県央（厚木・海老名・相模原）中心のため名称を実態に合わせた',
    },
    { name: '横浜中央テリトリー' },
    { name: '横浜北テリトリー' },
  ],
  第4エリア: [
    { name: '千葉西テリトリー' },
    { name: '湾岸テリトリー' },
    { name: '房総テリトリー' },
    { name: '千葉中央テリトリー' },
    { name: '千葉東テリトリー' },
  ],
  第5エリア: [
    { name: '栃木南テリトリー' },
    { name: '群馬テリトリー' },
    { name: '茨城中央テリトリー' },
    { name: '茨城南テリトリー' },
    {
      name: '北関東テリトリー',
      note: '栃木県北（宇都宮・鹿沼・那須塩原）と群馬県北（渋川・沼田）をまとめた県境跨ぎのテリトリー',
    },
  ],
  第6エリア: [
    { name: '宮城テリトリー' },
    { name: '福島テリトリー' },
    {
      name: '岩手テリトリー',
      note: '旧「岩手・秋田テリトリー」。秋田3店は青森・秋田テリトリーへ移し、一関に隣接する気仙沼を受け持つ',
    },
    {
      name: '青森・秋田テリトリー',
      note: '旧「青森テリトリー」。青森3店のみでは直下5店に満たないため北東北で1テリトリーに統合',
    },
    { name: '山形テリトリー' },
  ],
  第7エリア: [
    { name: '札幌テリトリー' },
    { name: '石狩テリトリー' },
    { name: '道南・道東テリトリー' },
    {
      name: '中越・上越テリトリー',
      note: '旧「上越テリトリー」。配下は中越（長岡・三条・燕三条）が中心のため名称を実態に合わせた',
    },
    {
      name: '日本海テリトリー',
      note: '旧「下越テリトリー」。新潟4店では直下5店に満たないため、フェリー航路でつながる小樽を含めた日本海沿岸のテリトリー',
    },
  ],
  中部エリア: [
    { name: '名古屋テリトリー' },
    {
      name: '西三河・東濃テリトリー',
      note: '旧「西三河テリトリー」。豊田市に隣接する多治見（岐阜県東濃）を含むため名称に東濃を加えた',
    },
    { name: '尾張・岐阜テリトリー' },
    {
      name: '三重・西濃テリトリー',
      note: '旧「三重テリトリー」。桑名と近接する大垣（岐阜県西濃）を含むため名称に西濃を加えた',
    },
    {
      name: '静岡・東三河テリトリー',
      note: '旧「静岡テリトリー」。浜松に隣接する豊橋（愛知県東三河）を含むため名称に東三河を加えた',
    },
  ],
  関西エリア: [
    { name: '大阪中央テリトリー' },
    { name: '北大阪テリトリー' },
    { name: '東関西テリトリー' },
    {
      name: '西関西テリトリー',
      note: '播磨（姫路・明石）から南大阪・和歌山までの関西西部〜南部を受け持つ広域テリトリー',
    },
    { name: '阪神テリトリー' },
  ],
  '中国・九州エリア': [
    { name: '広島テリトリー' },
    { name: '山口・岡山テリトリー' },
    {
      name: '山陰テリトリー',
      note: '旧「山陰・福岡テリトリー」。福岡5店は福岡・佐賀テリトリーへ移し、因美線でつながる津山を受け持つ',
    },
    {
      name: '福岡・佐賀テリトリー',
      note: '旧「九州中央テリトリー」。配下が福岡・佐賀のため名称を実態に合わせた',
    },
    {
      name: '九州南西テリトリー',
      note: '旧「九州西テリトリー」。長崎から南九州までを1テリトリーで受け持つ',
    },
  ],
  四国エリア: [
    {
      name: '香川テリトリー',
      note: '旧「香川・徳島テリトリー」。徳島は徳島テリトリーへ分離した',
    },
    { name: '徳島テリトリー' },
    {
      name: '東予・徳島西テリトリー',
      note: '旧「徳島西テリトリー」。徳島県西部（美馬）と愛媛県東予を四国中央部で束ねる',
    },
    {
      name: '四国西南テリトリー',
      note: '旧「伊予・土佐テリトリー」。国道56号沿い（松山〜宇和島〜四万十〜須崎）の四国西南部',
    },
    {
      name: '高知テリトリー',
      note: '旧「高知・讃岐テリトリー」。讃岐（香川）は香川テリトリーへ分離した',
    },
  ],
};

/**
 * Inactive territories: merged away by a reorganisation but kept so historical rows still
 * resolve. They are offered neither in the cascade filter nor as a bulk-change destination,
 * and hold no stores.
 */
const INACTIVE_TERRITORY_DEFS: { area: string; name: string; note: string }[] = [
  {
    area: '第3エリア',
    name: '旧港北テリトリー',
    note: '2026/04/01の組織改編で横浜中央テリトリーへ統合。過去データの参照整合のため無効化して保持',
  },
  {
    area: '関西エリア',
    name: '旧南大阪テリトリー',
    note: '2026/04/01の組織改編で大阪中央テリトリーへ統合。過去データの参照整合のため無効化して保持',
  },
];

function buildOrgNodes(): OrgNodeRow[] {
  const nodes: OrgNodeRow[] = [];

  HEADQUARTERS_DEFS.forEach((hq, index) => {
    nodes.push({
      id: hq.id,
      level: 'headquarters',
      name: hq.name,
      parent_id: null,
      order: index + 1,
      note: hq.note,
      active: true,
    });
  });

  BLOCK_DEFS.forEach((block, index) => {
    nodes.push({
      id: block.id,
      level: 'block',
      name: block.name,
      parent_id: block.headquarters_id,
      order: index + 1,
      note: block.note ?? null,
      active: true,
    });
  });

  const areaIdByName: Record<string, string> = {};
  AREA_NAMES.forEach((areaName, index) => {
    areaIdByName[areaName] = `AREA-${String(index + 1).padStart(2, '0')}`;
  });

  let territorySeq = 0;
  AREA_NAMES.forEach((areaName) => {
    const block = BLOCK_DEFS.find((item) => item.areas.includes(areaName));
    if (!block) return;

    nodes.push({
      id: areaIdByName[areaName]!,
      level: 'area',
      name: areaName,
      parent_id: block.id,
      order: block.areas.indexOf(areaName) + 1,
      note: null,
      active: true,
    });

    const territoryDefs = TERRITORY_DEFS[areaName] ?? [];
    territoryDefs.forEach((def, index) => {
      territorySeq += 1;
      nodes.push({
        id: `TRT-${String(territorySeq).padStart(3, '0')}`,
        level: 'territory',
        name: def.name,
        parent_id: areaIdByName[areaName]!,
        order: index + 1,
        note: def.note ?? null,
        active: true,
      });
    });

    INACTIVE_TERRITORY_DEFS.filter((def) => def.area === areaName).forEach((def, index) => {
      territorySeq += 1;
      nodes.push({
        id: `TRT-${String(territorySeq).padStart(3, '0')}`,
        level: 'territory',
        name: def.name,
        parent_id: areaIdByName[areaName]!,
        order: territoryDefs.length + index + 1,
        note: def.note,
        active: false,
      });
    });
  });

  return nodes;
}

/** Every hierarchy node: 3 head offices / 8 blocks / 11 areas / 57 territories (2 inactive) */
export const SEED_ORG_NODES: OrgNodeRow[] = buildOrgNodes();
