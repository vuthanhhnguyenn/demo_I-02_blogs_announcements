import type {
  Controller,
  ControllerDeviceSummary,
  ControllerHistoryItem,
} from '@/app/api/_schemas/controller.schema';
import type {
  ConnectedEquipmentDetail,
  ConnectedEquipmentListItem,
  ControllerSummary,
  EquipmentStatusHistoryItem,
  EquipmentUsageControlRuleInput,
  UsageControlRuleDisplay,
} from '@/app/api/_schemas/equipment.schema';

export const SEED_CONNECTED_EQUIPMENT: ConnectedEquipmentListItem[] = [
  {
    id: 'EQ-0001',
    name: '水素水サーバー',
    storeId: 'store-002',
    storeName: 'Fit365新宿店',
    deviceType: 'hydrogen_water',
    serialNumber: 'SN-20250101-001',
    ipAddress: '192.168.1.100',
    macAddress: '00:11:22:33:44:55',
    location: '1F 休憩スペース',
    installedOn: '2026-01-10',
    status: 'normal',
    authMethod: 'none',
    linkedContractLabels: ['サービス種別（水素水）'],
    updatedAt: '2026-03-08T10:00:00+09:00',
  },
  {
    id: 'EQ-0002',
    name: 'プロテインサーバー',
    storeId: 'store-002',
    storeName: 'Fit365新宿店',
    deviceType: 'protein',
    serialNumber: 'SN-20250101-002',
    ipAddress: '192.168.1.101',
    macAddress: '00:11:22:33:44:56',
    location: '1F フロント横',
    installedOn: '2026-01-11',
    status: 'normal',
    authMethod: 'device_scan',
    linkedContractLabels: ['サービス種別（プロテイン）'],
    updatedAt: '2026-03-08T10:10:00+09:00',
  },
  {
    id: 'EQ-0003',
    name: '入口自動ドア',
    storeId: 'store-003',
    storeName: 'Fit365渋谷店',
    deviceType: 'entry_gate',
    serialNumber: 'SN-20240601-003',
    ipAddress: '192.168.1.102',
    macAddress: '00:11:22:33:44:57',
    location: '1F 入口',
    installedOn: '2025-06-01',
    status: 'abnormal',
    authMethod: 'member_scan',
    linkedContractLabels: ['主契約'],
    updatedAt: '2026-03-05T14:22:00+09:00',
  },
  {
    id: 'EQ-0004',
    name: 'タンニングマシン A',
    storeId: 'store-003',
    storeName: 'Fit365渋谷店',
    deviceType: 'tanning',
    serialNumber: 'SN-20240601-004',
    ipAddress: '192.168.1.103',
    macAddress: '00:11:22:33:44:58',
    location: '2F スタジオ',
    installedOn: '2025-06-01',
    status: 'abnormal',
    authMethod: 'member_scan',
    linkedContractLabels: ['サービス種別（日焼け）'],
    updatedAt: '2026-02-28T16:45:00+09:00',
  },
  {
    id: 'EQ-0005',
    name: '体組成計',
    storeId: 'store-004',
    storeName: 'JOYFIT池袋店',
    deviceType: 'body_composition',
    serialNumber: 'SN-20250301-005',
    ipAddress: null,
    macAddress: null,
    location: '1F カウンター前',
    installedOn: '2026-03-01',
    status: 'normal',
    authMethod: 'member_scan',
    linkedContractLabels: ['主契約'],
    updatedAt: '2026-01-20T09:00:00+09:00',
  },
  {
    id: 'EQ-0006',
    name: 'プロテインサーバー B',
    storeId: 'store-004',
    storeName: 'JOYFIT池袋店',
    deviceType: 'protein',
    serialNumber: 'SN-20250301-006',
    ipAddress: '192.168.1.104',
    macAddress: '00:11:22:33:44:59',
    location: '1F ロビー',
    installedOn: '2026-03-01',
    status: 'under_maintenance',
    authMethod: 'device_scan',
    linkedContractLabels: ['サービス種別（プロテイン）'],
    updatedAt: '2026-03-08T10:00:00+09:00',
  },
  {
    id: 'EQ-0007',
    name: 'シャワー利用ゲート',
    storeId: 'store-004',
    storeName: 'JOYFIT池袋店',
    deviceType: 'other',
    serialNumber: 'SN-20241220-007',
    ipAddress: '192.168.1.105',
    macAddress: null,
    location: '2F シャワー前',
    installedOn: '2025-12-20',
    status: 'under_maintenance',
    authMethod: 'member_scan',
    linkedContractLabels: ['サービス種別（シャワー）'],
    updatedAt: '2026-03-07T12:30:00+09:00',
  },
  {
    id: 'EQ-0008',
    name: '旧プロテインサーバー',
    storeId: 'store-002',
    storeName: 'Fit365新宿店',
    deviceType: 'protein',
    serialNumber: 'SN-20220115-008',
    ipAddress: null,
    macAddress: '00:11:22:33:44:60',
    location: '倉庫',
    installedOn: '2022-01-15',
    status: 'discarded',
    authMethod: 'none',
    linkedContractLabels: ['サービス種別（プロテイン）'],
    updatedAt: '2026-01-05T08:00:00+09:00',
  },
  {
    id: 'EQ-0009',
    name: '出口ゲート',
    storeId: 'store-003',
    storeName: 'Fit365渋谷店',
    deviceType: 'exit_gate',
    serialNumber: 'SN-20240601-009',
    ipAddress: '192.168.1.109',
    macAddress: '00:11:22:33:44:61',
    location: '1F 出口',
    installedOn: '2025-06-01',
    status: 'normal',
    authMethod: 'member_scan',
    linkedContractLabels: ['主契約'],
    updatedAt: '2026-03-05T14:30:00+09:00',
  },
];

// Store triples are the ones the store table seeds (`id` / `store_id` / `name`), so a
// controller, the devices hanging off it and the header store selector all agree on one store.
const CONTROLLER_STORES = {
  shinjuku: { storeId: 'store-002', storeCode: 'S-002', storeName: 'Fit365新宿店' },
  shibuya: { storeId: 'store-003', storeCode: 'S-003', storeName: 'Fit365渋谷店' },
  ikebukuro: { storeId: 'store-004', storeCode: 'S-004', storeName: 'JOYFIT池袋店' },
} as const;

export const SEED_CONTROLLERS: Controller[] = [
  {
    id: 'CTRL-001',
    ...CONTROLLER_STORES.shinjuku,
    name: '制御装置 新宿 1号',
    location: '受付室 機器ラック',
    ipAddress: '192.168.1.10',
    port: 80,
    firmwareVersion: 'v2.4.1',
    controlPortCount: 8,
    status: 'normal',
    createdAt: '2024-04-01T09:00:00+09:00',
    updatedAt: '2026-01-10T09:00:00+09:00',
  },
  {
    id: 'CTRL-002',
    ...CONTROLLER_STORES.shinjuku,
    name: '制御装置 新宿 2号',
    location: 'トレーニングフロア 北側',
    ipAddress: '192.168.1.11',
    port: 81,
    firmwareVersion: 'v2.4.1',
    controlPortCount: 4,
    status: 'normal',
    createdAt: '2024-04-01T09:00:00+09:00',
    updatedAt: '2026-01-10T09:00:00+09:00',
  },
  {
    id: 'CTRL-003',
    ...CONTROLLER_STORES.shibuya,
    name: '制御装置 渋谷 1号',
    location: '受付室 機器ラック',
    ipAddress: '192.168.1.12',
    port: 82,
    firmwareVersion: 'v2.3.0',
    controlPortCount: 16,
    status: 'error',
    createdAt: '2023-11-15T09:00:00+09:00',
    updatedAt: '2026-02-20T09:00:00+09:00',
  },
  {
    id: 'CTRL-004',
    ...CONTROLLER_STORES.shibuya,
    name: '制御装置 渋谷 2号',
    location: 'スタジオ入口',
    ipAddress: '192.168.1.13',
    port: 83,
    firmwareVersion: null,
    controlPortCount: 4,
    status: 'error',
    createdAt: '2023-11-15T09:00:00+09:00',
    updatedAt: '2026-02-20T09:00:00+09:00',
  },
  {
    id: 'CTRL-005',
    ...CONTROLLER_STORES.ikebukuro,
    name: '制御装置 池袋 1号',
    location: '受付室 機器ラック',
    ipAddress: '192.168.1.14',
    port: 84,
    firmwareVersion: 'v2.4.0',
    controlPortCount: 8,
    status: 'normal',
    createdAt: '2024-07-20T09:00:00+09:00',
    updatedAt: '2026-01-05T09:00:00+09:00',
  },
  {
    id: 'CTRL-006',
    ...CONTROLLER_STORES.ikebukuro,
    name: '制御装置 池袋 2号',
    location: 'マシンエリア',
    ipAddress: '192.168.1.15',
    port: 85,
    firmwareVersion: 'v2.4.0',
    controlPortCount: 12,
    status: 'maintenance',
    createdAt: '2024-07-20T09:00:00+09:00',
    updatedAt: '2026-03-01T09:00:00+09:00',
  },
  {
    id: 'CTRL-007',
    ...CONTROLLER_STORES.ikebukuro,
    name: '制御装置 池袋 3号',
    location: 'ロッカールーム前',
    ipAddress: '192.168.1.16',
    port: 86,
    firmwareVersion: 'v2.2.5',
    controlPortCount: 4,
    status: 'maintenance',
    createdAt: '2024-07-20T09:00:00+09:00',
    updatedAt: '2026-03-01T09:00:00+09:00',
  },
  {
    id: 'CTRL-008',
    ...CONTROLLER_STORES.shinjuku,
    name: '制御装置 新宿 旧号',
    location: '倉庫',
    ipAddress: '192.168.1.17',
    port: 87,
    firmwareVersion: null,
    controlPortCount: 4,
    status: 'discarded',
    createdAt: '2022-01-15T09:00:00+09:00',
    updatedAt: '2025-12-01T09:00:00+09:00',
  },
];

/** Same instant, `years` years earlier — used to spread the seeded history over time. */
function shiftYears(isoDate: string, years: number): string {
  const date = new Date(isoDate);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString();
}

/**
 * Seeded 変更履歴 for one controller: the creation row (null `previousStatus`) plus one follow-up
 * that explains how it reached its current status. Newest first, as the tab renders it.
 */
export function buildControllerHistorySeed(controller: Controller): ControllerHistoryItem[] {
  const genesis: ControllerHistoryItem = {
    historyId: `${controller.id}-H001`,
    changedAt: controller.createdAt,
    changedBy: { staffId: 'STF-000', name: 'システム' },
    previousStatus: null,
    newStatus: 'normal',
    changedNote: '接点制御装置を新規登録しました。',
  };

  // A routine inspection a year before the latest event, so the tab's 直近1年の対応 and
  // 平均対応間隔 figures have more than a single data point to work with.
  const inspection: ControllerHistoryItem = {
    historyId: `${controller.id}-H002`,
    changedAt: shiftYears(controller.updatedAt, -1),
    changedBy: { staffId: 'STF-002', name: '佐藤花子' },
    previousStatus: 'normal',
    newStatus: 'normal',
    changedNote: '点検完了。定期点検実施。異常なし。',
  };

  const followUps: ControllerHistoryItem[] = [];
  const followUpId = `${controller.id}-H003`;

  if (controller.status === 'error') {
    followUps.push({
      historyId: followUpId,
      changedAt: controller.updatedAt,
      changedBy: { staffId: 'STF-001', name: '山田太郎' },
      previousStatus: 'normal',
      newStatus: 'error',
      changedNote: '故障報告。通信エラーを検知。現地確認を依頼。',
    });
  } else if (controller.status === 'maintenance') {
    followUps.push({
      historyId: followUpId,
      changedAt: controller.updatedAt,
      changedBy: { staffId: 'STF-002', name: '佐藤花子' },
      previousStatus: 'normal',
      newStatus: 'maintenance',
      changedNote: '定期点検のためメンテナンス中に変更。',
    });
  } else if (controller.status === 'discarded') {
    followUps.push({
      historyId: followUpId,
      changedAt: controller.updatedAt,
      changedBy: { staffId: 'STF-002', name: '佐藤花子' },
      previousStatus: 'normal',
      newStatus: 'discarded',
      changedNote: '後継機へ入れ替えのため廃棄。',
    });
  } else {
    followUps.push({
      historyId: followUpId,
      changedAt: controller.updatedAt,
      changedBy: { staffId: 'STF-002', name: '佐藤花子' },
      previousStatus: 'normal',
      newStatus: 'normal',
      changedNote: '点検完了。定期点検実施。異常なし。',
    });
  }

  return [...followUps, inspection, genesis];
}

export const SEED_CONTROLLER_HISTORY: Record<string, ControllerHistoryItem[]> = Object.fromEntries(
  SEED_CONTROLLERS.map((controller) => [controller.id, buildControllerHistorySeed(controller)]),
);

export function buildControllerDeviceSummary(
  devices: { status: string }[],
): ControllerDeviceSummary {
  return {
    total: devices.length,
    normal: devices.filter((device) => device.status === 'normal').length,
    error: devices.filter((device) => device.status === 'abnormal').length,
  };
}

// Fallback for rows without a meta record: re-read the two FR-008 v2 axes out of the
// 紐づき契約種別 labels the list row carries ('主契約' / 'サービス種別（○○）').
export function buildUsageControlRule(item: ConnectedEquipmentListItem): UsageControlRuleDisplay {
  const contractLinkTypes: Array<'main' | 'service'> = [];
  let mainContractTypeLabel: string | null = null;
  const serviceTypeLabels: string[] = [];

  for (const label of item.linkedContractLabels) {
    const serviceType = label.match(/^サービス種別（(.+)）$/)?.[1];

    if (serviceType) {
      if (!contractLinkTypes.includes('service')) {
        contractLinkTypes.push('service');
      }
      serviceTypeLabels.push(serviceType);
      continue;
    }

    if (!contractLinkTypes.includes('main')) {
      contractLinkTypes.push('main');
    }
    mainContractTypeLabel = label;
  }

  return {
    contractLinkTypes,
    mainContractTypeLabel,
    serviceTypeLabels,
    showGateStopInfo: item.deviceType === 'entry_gate',
  };
}

export type EquipmentMeta = {
  /**
   * 接点制御先番号 — the contact-output port the device occupies on its relay controller.
   * Detail-only: not part of FR-001 §表示項目 and absent from the design doc, which is also
   * why the form never asks for it (the prototype form has no such field either).
   */
  controllerNumber: number;
  /** Relay controller the device hangs off. Required by the design doc (§6.1). */
  relayControllerId: string;
  note: string | null;
  usageControlRule: EquipmentUsageControlRuleInput | null;
};

export function buildUsageControlRuleFromInput(
  rule: EquipmentUsageControlRuleInput,
  equipmentType: ConnectedEquipmentListItem['deviceType'],
): UsageControlRuleDisplay {
  const contractLinkTypes: Array<'main' | 'service'> = [];
  if (rule.mainEnabled) contractLinkTypes.push('main');
  if (rule.serviceEnabled) contractLinkTypes.push('service');

  return {
    contractLinkTypes,
    mainContractTypeLabel: rule.mainEnabled ? rule.mainContractType : null,
    serviceTypeLabels: rule.serviceEnabled ? rule.serviceTypes : [],
    showGateStopInfo: equipmentType === 'entry_gate',
  };
}

// The 紐づき契約種別 column shows one badge per judgment, verbatim from the prototype list:
// '主契約' for the main-contract axis and 'サービス種別（○○）' per selected service type.
export function buildLabelsFromRule(rule: EquipmentUsageControlRuleInput | null): string[] {
  if (!rule) return [];
  const labels: string[] = [];
  if (rule.mainEnabled && rule.mainContractType) labels.push('主契約');
  if (rule.serviceEnabled) {
    labels.push(...rule.serviceTypes.map((type) => `サービス種別（${type}）`));
  }
  return labels;
}

/**
 * The design doc derives a device's store from its relay controller (§6.1) — `storeId` is never
 * accepted from the client.
 */
export function findControllerById(controllerId: string): Controller | undefined {
  return SEED_CONTROLLERS.find((entry) => entry.id === controllerId);
}

/** Store a device installed on `controllerId` belongs to, or null when it cannot be resolved. */
export function resolveStoreForController(
  controllerId: string,
): { storeId: string; storeName: string } | null {
  const controller = findControllerById(controllerId);
  if (!controller) return null;
  return { storeId: controller.storeId, storeName: controller.storeName };
}

export function buildEquipmentDetail(
  item: ConnectedEquipmentListItem,
  meta?: EquipmentMeta,
): ConnectedEquipmentDetail {
  const controllerNumber = meta?.controllerNumber ?? 0;
  const controller = meta?.relayControllerId
    ? findControllerById(meta.relayControllerId)
    : undefined;

  const controllerSummary: ControllerSummary = controller
    ? {
        controllerId: controller.id,
        ipAddress: controller.ipAddress,
        port: controller.port,
        status: controller.status,
        name: controller.name,
      }
    : {
        controllerId: meta?.relayControllerId ?? '',
        ipAddress: item.ipAddress ?? '0.0.0.0',
        port: 80,
        status: 'normal',
        name: null,
      };

  const usageControlRule = meta?.usageControlRule
    ? buildUsageControlRuleFromInput(meta.usageControlRule, item.deviceType)
    : buildUsageControlRule(item);

  return {
    ...item,
    controllerNumber,
    usageControlRule,
    controllerSummary,
    relayControllerId: meta?.relayControllerId ?? null,
    note: meta?.note ?? null,
    createdAt: `${item.installedOn}T09:00:00+09:00`,
    lastStatusConfirmedAt: item.updatedAt,
  };
}

/**
 * Latest first, and the install row is the only one with a null `previousStatus` — that is what
 * marks it as the first entry (design doc §5). The list screen's 新規作成 badge is derived from
 * that null rather than from a separate event-type field.
 */
export function buildEquipmentHistorySeed(
  equipmentId: string,
  installedOn: string,
): EquipmentStatusHistoryItem[] {
  return [
    {
      historyId: `${equipmentId}-hist-002`,
      previousStatus: 'under_maintenance',
      newStatus: 'normal',
      changedReason: 'maintenance_complete',
      changedNote: '動作確認・清掃実施。異常なし。',
      changedBy: { staffId: 'STF-001', name: '山田太郎' },
      changedAt: '2026-02-15T10:00:00+09:00',
    },
    {
      historyId: `${equipmentId}-hist-001`,
      previousStatus: null,
      newStatus: 'normal',
      changedReason: 'install',
      changedNote: null,
      changedBy: { staffId: 'STF-000', name: 'システム' },
      changedAt: `${installedOn}T10:00:00+09:00`,
    },
  ];
}

export const SEED_EQUIPMENT_HISTORY: Record<string, EquipmentStatusHistoryItem[]> = {
  'EQ-0001': [
    {
      historyId: 'EQ-0001-hist-004',
      previousStatus: 'under_maintenance',
      newStatus: 'normal',
      changedReason: 'maintenance_complete',
      changedNote: '動作確認・清掃実施。異常なし。',
      changedBy: { staffId: 'STF-001', name: '山田太郎' },
      changedAt: '2026-02-15T10:00:00+09:00',
    },
    {
      historyId: 'EQ-0001-hist-003',
      previousStatus: 'abnormal',
      newStatus: 'normal',
      changedReason: 'maintenance_complete',
      changedNote: '水漏れ修理。パッキン交換。',
      changedBy: { staffId: 'STF-002', name: '田中花子' },
      changedAt: '2025-11-20T14:30:00+09:00',
    },
    {
      historyId: 'EQ-0001-hist-002',
      previousStatus: 'normal',
      newStatus: 'abnormal',
      changedReason: 'fault_report',
      changedNote: '水漏れを発見。使用停止。',
      changedBy: { staffId: 'STF-002', name: '田中花子' },
      changedAt: '2025-11-18T09:00:00+09:00',
    },
    {
      historyId: 'EQ-0001-hist-001',
      previousStatus: null,
      newStatus: 'normal',
      changedReason: 'install',
      changedNote: null,
      changedBy: { staffId: 'STF-000', name: 'システム' },
      changedAt: '2026-01-10T10:00:00+09:00',
    },
  ],
  'EQ-0002': buildEquipmentHistorySeed('EQ-0002', '2026-01-11'),
  'EQ-0003': buildEquipmentHistorySeed('EQ-0003', '2025-06-01'),
  'EQ-0004': buildEquipmentHistorySeed('EQ-0004', '2025-06-01'),
  'EQ-0005': buildEquipmentHistorySeed('EQ-0005', '2026-03-01'),
  'EQ-0006': buildEquipmentHistorySeed('EQ-0006', '2026-03-01'),
  'EQ-0007': buildEquipmentHistorySeed('EQ-0007', '2025-12-20'),
  'EQ-0008': buildEquipmentHistorySeed('EQ-0008', '2022-01-15'),
};

// controllerNumber is a detail-only field (it is neither in FR-001 nor in the design doc), so
// it lives in the meta record rather than on the list row.
export const SEED_EQUIPMENT_META: Record<string, EquipmentMeta> = {
  'EQ-0001': {
    controllerNumber: 1,
    relayControllerId: 'CTRL-001',
    note: 'フィルター交換は3ヶ月周期（次回 2026/05）。保守窓口: アクアテック株式会社。',
    usageControlRule: {
      mainEnabled: false,
      mainContractType: null,
      serviceEnabled: true,
      serviceTypes: ['水素水'],
    },
  },
  'EQ-0002': {
    controllerNumber: 1,
    relayControllerId: 'CTRL-002',
    note: null,
    usageControlRule: {
      mainEnabled: false,
      mainContractType: null,
      serviceEnabled: true,
      serviceTypes: ['プロテイン'],
    },
  },
  'EQ-0003': {
    controllerNumber: 2,
    relayControllerId: 'CTRL-003',
    note: '2026年2月に基板交換。',
    usageControlRule: {
      mainEnabled: true,
      mainContractType: 'スタンダード',
      serviceEnabled: false,
      serviceTypes: [],
    },
  },
  'EQ-0004': {
    controllerNumber: 1,
    relayControllerId: 'CTRL-004',
    note: null,
    usageControlRule: {
      mainEnabled: false,
      mainContractType: null,
      serviceEnabled: true,
      serviceTypes: ['日焼け'],
    },
  },
  'EQ-0005': {
    controllerNumber: 1,
    relayControllerId: 'CTRL-005',
    note: null,
    usageControlRule: {
      mainEnabled: true,
      mainContractType: 'スタンダード',
      serviceEnabled: false,
      serviceTypes: [],
    },
  },
  'EQ-0006': {
    controllerNumber: 1,
    relayControllerId: 'CTRL-006',
    note: null,
    usageControlRule: {
      mainEnabled: false,
      mainContractType: null,
      serviceEnabled: true,
      serviceTypes: ['プロテイン'],
    },
  },
  'EQ-0007': {
    controllerNumber: 1,
    relayControllerId: 'CTRL-007',
    note: null,
    usageControlRule: {
      mainEnabled: false,
      mainContractType: null,
      serviceEnabled: true,
      serviceTypes: ['シャワー'],
    },
  },
  'EQ-0008': {
    controllerNumber: 1,
    relayControllerId: 'CTRL-008',
    note: null,
    usageControlRule: {
      mainEnabled: false,
      mainContractType: null,
      serviceEnabled: true,
      serviceTypes: ['プロテイン'],
    },
  },
};
