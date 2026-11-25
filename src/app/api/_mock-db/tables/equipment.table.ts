import type {
  Controller,
  ControllerConnectedDevice,
  ControllerDetail,
  ControllerHistoryItem,
  ControllerListItem,
  GetControllerDevicesQuery,
  GetControllerDevicesResponse,
  GetControllersQuery,
  GetControllersResponse,
  GetControllersSort,
  PatchControllerRequest,
  UpsertControllerRequest,
} from '@/app/api/_schemas/controller.schema';
import type {
  ConnectedEquipmentDetail,
  ConnectedEquipmentListItem,
  EquipmentStatusChangedReason,
  EquipmentStatusHistoryItem,
  PatchEquipmentRequest,
  UpsertEquipmentRequest,
} from '@/app/api/_schemas/equipment.schema';
import type { VisitExperienceDetail } from '@/app/api/_schemas/visit-experience.schema';

import type { DbType } from '../_db.types';
import type { EquipmentMeta } from '../seeds/equipment.seed';
import {
  SEED_CONNECTED_EQUIPMENT,
  SEED_CONTROLLERS,
  SEED_CONTROLLER_HISTORY,
  SEED_EQUIPMENT_HISTORY,
  SEED_EQUIPMENT_META,
  buildControllerDeviceSummary,
  buildEquipmentDetail,
  buildLabelsFromRule,
  resolveStoreForController,
} from '../seeds/equipment.seed';
import { SEED_VISIT_EXPERIENCES } from '../seeds/visit-experience.seed';

/**
 * Reason code recorded on a status transition, keyed by the status being moved to. The design
 * doc lets the client send one (§6.4), but the prototype dialog collects only free text, so the
 * mock derives it from the transition instead.
 */
const STATUS_CHANGE_REASONS: Record<
  ConnectedEquipmentListItem['status'],
  EquipmentStatusChangedReason
> = {
  normal: 'maintenance_complete',
  abnormal: 'fault_report',
  under_maintenance: 'maintenance_start',
  discarded: 'disposal',
};

/**
 * Operator stamped on history rows the mock writes. The screens render 操作者 from it; a real
 * backend would resolve the acting staff from the request.
 */
const MOCK_HISTORY_ACTOR = { staffId: 'STF-000', name: 'システム' };

export function createEquipmentTables(getDb: () => DbType) {
  return {
    equipment: {
      _rows: [] as ConnectedEquipmentListItem[],
      _historyByEquipmentId: {} as Record<string, EquipmentStatusHistoryItem[]>,
      _metaById: {} as Record<string, EquipmentMeta>,
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        this._rows = [...SEED_CONNECTED_EQUIPMENT];
        this._metaById = Object.fromEntries(
          Object.entries(SEED_EQUIPMENT_META).map(([id, meta]) => [id, { ...meta }]),
        );
        this._historyByEquipmentId = Object.fromEntries(
          Object.entries(SEED_EQUIPMENT_HISTORY).map(([id, history]) => [
            id,
            history.map((item) => ({ ...item })),
          ]),
        );
      },
      getAll(): ConnectedEquipmentListItem[] {
        this._seed();
        return [...this._rows];
      },
      getById(id: string): ConnectedEquipmentListItem | undefined {
        this._seed();
        return this._rows.find((equipment) => equipment.id === id);
      },
      getDetailById(id: string): ConnectedEquipmentDetail | undefined {
        this._seed();
        const item = this._rows.find((equipment) => equipment.id === id);
        if (!item) return undefined;
        return buildEquipmentDetail(item, this._metaById[id]);
      },
      /**
       * 接点制御先番号 is assigned here, not collected: the design doc has no field for it and
       * the prototype form never asks. The device takes the next free contact port on its
       * controller.
       */
      _nextControllerNumber(relayControllerId: string): number {
        const used = Object.entries(this._metaById)
          .filter(([, meta]) => meta.relayControllerId === relayControllerId)
          .map(([, meta]) => meta.controllerNumber);
        return used.reduce((max, port) => Math.max(max, port), 0) + 1;
      },
      create(input: UpsertEquipmentRequest): ConnectedEquipmentDetail {
        this._seed();
        const nextNumber =
          this._rows.reduce((max, row) => {
            const parsed = Number.parseInt(row.id.replace(/^EQ-/, ''), 10);
            return Number.isNaN(parsed) ? max : Math.max(max, parsed);
          }, 0) + 1;
        const id = `EQ-${String(nextNumber).padStart(4, '0')}`;
        const now = new Date().toISOString();
        // Design doc §6.1: the store follows the chosen relay controller, keeping device and
        // controller in the same store by construction.
        const store = resolveStoreForController(input.relayControllerId) ?? {
          storeId: 'store-002',
          storeName: 'Fit365新宿店',
        };
        const row: ConnectedEquipmentListItem = {
          id,
          name: input.name,
          storeId: store.storeId,
          storeName: store.storeName,
          deviceType: input.deviceType,
          serialNumber: input.serialNumber,
          ipAddress: input.ipAddress ?? null,
          macAddress: input.macAddress ?? null,
          location: input.location,
          installedOn: input.installedOn,
          status: input.status,
          authMethod: input.authMethod,
          linkedContractLabels: buildLabelsFromRule(input.usageControlRule),
          updatedAt: now,
        };
        this._rows.push(row);
        this._metaById[id] = {
          controllerNumber: this._nextControllerNumber(input.relayControllerId),
          relayControllerId: input.relayControllerId,
          note: input.note ?? null,
          usageControlRule: input.usageControlRule ?? null,
        };
        // The install row of the status history is written in the same operation (design doc §6.1).
        this._historyByEquipmentId[id] = [
          {
            historyId: `${id}-hist-001`,
            previousStatus: null,
            newStatus: row.status,
            changedReason: 'install',
            changedNote: null,
            changedBy: { staffId: 'STF-000', name: 'システム' },
            changedAt: now,
          },
        ];
        return buildEquipmentDetail(row, this._metaById[id]);
      },
      update(id: string, input: PatchEquipmentRequest): ConnectedEquipmentDetail | undefined {
        this._seed();
        const index = this._rows.findIndex((equipment) => equipment.id === id);
        if (index === -1) return undefined;
        const existing = this._rows[index];
        const nextRow: ConnectedEquipmentListItem = { ...existing };
        if (input.name !== undefined) nextRow.name = input.name;
        if (input.deviceType !== undefined) nextRow.deviceType = input.deviceType;
        if (input.serialNumber !== undefined) nextRow.serialNumber = input.serialNumber;
        if (input.location !== undefined) nextRow.location = input.location;
        if (input.installedOn !== undefined) nextRow.installedOn = input.installedOn;
        if (input.status !== undefined) nextRow.status = input.status;
        if (input.authMethod !== undefined) nextRow.authMethod = input.authMethod;
        if (input.ipAddress !== undefined) nextRow.ipAddress = input.ipAddress ?? null;
        if (input.macAddress !== undefined) nextRow.macAddress = input.macAddress ?? null;
        if (input.usageControlRule !== undefined)
          nextRow.linkedContractLabels = buildLabelsFromRule(input.usageControlRule);
        const now = new Date().toISOString();
        nextRow.updatedAt = now;
        const existingMeta = this._metaById[id] ?? {
          controllerNumber: 0,
          relayControllerId: '',
          note: null,
          usageControlRule: null,
        };
        const nextMeta = { ...existingMeta };
        // Design doc §6.2: re-pointing the controller is a hardware swap, and the device moves
        // to that controller's store with it — a cross-store move is delete + re-register.
        if (
          input.relayControllerId !== undefined &&
          input.relayControllerId !== existingMeta.relayControllerId
        ) {
          nextMeta.relayControllerId = input.relayControllerId;
          nextMeta.controllerNumber = this._nextControllerNumber(input.relayControllerId);
          const store = resolveStoreForController(input.relayControllerId);
          if (store) {
            nextRow.storeId = store.storeId;
            nextRow.storeName = store.storeName;
          }
        }
        this._rows[index] = nextRow;
        if (input.note !== undefined) nextMeta.note = input.note ?? null;
        if (input.usageControlRule !== undefined)
          nextMeta.usageControlRule = input.usageControlRule ?? null;
        this._metaById[id] = nextMeta;
        // Design doc §6.2: a status change appends a history row; an edit that leaves the
        // status alone does not.
        if (input.status !== undefined && input.status !== existing.status) {
          this._appendHistory(id, existing.status, input.status, input.changedNote ?? null);
        }
        return buildEquipmentDetail(this._rows[index], this._metaById[id]);
      },
      _appendHistory(
        id: string,
        previousStatus: ConnectedEquipmentListItem['status'],
        newStatus: ConnectedEquipmentListItem['status'],
        changedNote: string | null,
      ): void {
        const history = this._historyByEquipmentId[id] ?? [];
        history.unshift({
          historyId: `${id}-hist-${String(history.length + 1).padStart(3, '0')}`,
          previousStatus,
          newStatus,
          changedReason: STATUS_CHANGE_REASONS[newStatus],
          changedNote,
          changedBy: { staffId: 'STF-000', name: 'システム' },
          changedAt: new Date().toISOString(),
        });
        this._historyByEquipmentId[id] = history;
      },
      getHistory(id: string): EquipmentStatusHistoryItem[] {
        this._seed();
        if (!this._rows.some((equipment) => equipment.id === id)) return [];
        return [...(this._historyByEquipmentId[id] ?? [])];
      },
      delete(id: string): boolean {
        this._seed();
        const index = this._rows.findIndex((equipment) => equipment.id === id);
        if (index === -1) return false;
        this._rows.splice(index, 1);
        delete this._historyByEquipmentId[id];
        delete this._metaById[id];
        return true;
      },
      /**
       * All-or-nothing, mirroring the design doc (§6.4): an unknown id **or** a device already
       * holding the target status rejects the whole batch rather than applying a partial sweep.
       * Each written device gets its own history row.
       */
      bulkUpdateStatus(
        ids: string[],
        status: ConnectedEquipmentListItem['status'],
        changedNote: string | null = null,
      ):
        | { ok: true; updated: number }
        | { ok: false; reason: 'not_found'; missingIds: string[] }
        | { ok: false; reason: 'no_op'; noOpIds: string[] } {
        this._seed();
        const uniqueIds = [...new Set(ids)];
        const missingIds = uniqueIds.filter(
          (id) => !this._rows.some((equipment) => equipment.id === id),
        );
        if (missingIds.length > 0) return { ok: false, reason: 'not_found', missingIds };

        const noOpIds = uniqueIds.filter(
          (id) => this._rows.find((equipment) => equipment.id === id)?.status === status,
        );
        if (noOpIds.length > 0) return { ok: false, reason: 'no_op', noOpIds };

        const now = new Date().toISOString();
        for (const id of uniqueIds) {
          const index = this._rows.findIndex((equipment) => equipment.id === id);
          const previousStatus = this._rows[index].status;
          this._rows[index] = { ...this._rows[index], status, updatedAt: now };
          this._appendHistory(id, previousStatus, status, changedNote);
        }
        return { ok: true, updated: uniqueIds.length };
      },
    },

    controllers: {
      _rows: [] as Controller[],
      _historyByControllerId: {} as Record<string, ControllerHistoryItem[]>,
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        this._rows = SEED_CONTROLLERS.map((controller) => ({ ...controller }));
        this._historyByControllerId = Object.fromEntries(
          Object.entries(SEED_CONTROLLER_HISTORY).map(([id, history]) => [
            id,
            history.map((item) => ({ ...item })),
          ]),
        );
      },
      getAll(): Controller[] {
        this._seed();
        return [...this._rows];
      },
      getById(controllerId: string): Controller | undefined {
        this._seed();
        return this._rows.find((controller) => controller.id === controllerId);
      },
      /** Every connected device wired to this controller, in 接点番号 order. */
      getConnectedDevices(controllerId: string): ControllerConnectedDevice[] {
        this._seed();
        const equipmentTable = getDb().equipment;
        equipmentTable._seed();
        if (!this._rows.some((row) => row.id === controllerId)) return [];
        return equipmentTable._rows
          .filter(
            (equipment) =>
              equipmentTable._metaById[equipment.id]?.relayControllerId === controllerId,
          )
          .map((equipment) => ({
            id: equipment.id,
            name: equipment.name,
            controllerNumber: equipmentTable._metaById[equipment.id]?.controllerNumber ?? 0,
            status: equipment.status,
          }))
          .sort((left, right) => left.controllerNumber - right.controllerNumber);
      },
      listConnectedDevices(
        controllerId: string,
        query: GetControllerDevicesQuery,
      ): GetControllerDevicesResponse {
        const devices = this.getConnectedDevices(controllerId);
        const { limit, page } = query;
        const startIndex = (page - 1) * limit;
        return {
          items: devices.slice(startIndex, startIndex + limit),
          pagination: {
            page,
            limit,
            totalItems: devices.length,
            totalPages: devices.length === 0 ? 0 : Math.ceil(devices.length / limit),
          },
        };
      },
      list(query: GetControllersQuery): GetControllersResponse {
        this._seed();
        const { limit, order, page, q, sort, status, storeId } = query;
        let rows = [...this._rows];

        // FR-007 検索: the prototype's placeholder promises 装置名 / IPアドレス; device id and
        // 設置場所 are matched too, mirroring the connected-equipment keyword search.
        if (q) {
          const normalized = q.toLowerCase();
          rows = rows.filter((row) =>
            [row.name ?? '', row.ipAddress, row.id, row.location].some((value) =>
              value.toLowerCase().includes(normalized),
            ),
          );
        }
        if (storeId && storeId !== 'all') rows = rows.filter((row) => row.storeId === storeId);
        if (status) rows = rows.filter((row) => row.status === status);

        const withCounts: ControllerListItem[] = rows.map((row) => ({
          ...row,
          connectedDeviceCount: this.getConnectedDevices(row.id).length,
        }));

        const sorters: Record<
          GetControllersSort,
          (left: ControllerListItem, right: ControllerListItem) => number
        > = {
          id: (left, right) => left.id.localeCompare(right.id),
          name: (left, right) => (left.name ?? '').localeCompare(right.name ?? '', 'ja'),
          storeCode: (left, right) => left.storeCode.localeCompare(right.storeCode),
          location: (left, right) => left.location.localeCompare(right.location, 'ja'),
          ipAddress: (left, right) => left.ipAddress.localeCompare(right.ipAddress),
          firmwareVersion: (left, right) =>
            (left.firmwareVersion ?? '').localeCompare(right.firmwareVersion ?? ''),
          controlPortCount: (left, right) => left.controlPortCount - right.controlPortCount,
          connectedDeviceCount: (left, right) =>
            left.connectedDeviceCount - right.connectedDeviceCount,
          status: (left, right) => left.status.localeCompare(right.status),
        };
        withCounts.sort((left, right) => {
          const comparison = sorters[sort](left, right);
          return order === 'desc' ? -comparison : comparison;
        });

        const totalItems = withCounts.length;
        const startIndex = (page - 1) * limit;
        return {
          items: withCounts.slice(startIndex, startIndex + limit),
          pagination: {
            page,
            limit,
            totalItems,
            totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
          },
        };
      },
      getDetailById(controllerId: string): ControllerDetail | undefined {
        this._seed();
        const controller = this._rows.find((row) => row.id === controllerId);
        if (!controller) return undefined;
        const devices = this.getConnectedDevices(controllerId);
        return {
          ...controller,
          connectedDeviceCount: devices.length,
          deviceSummary: buildControllerDeviceSummary(devices),
        };
      },
      getHistory(controllerId: string): ControllerHistoryItem[] {
        this._seed();
        if (!this._rows.some((row) => row.id === controllerId)) return [];
        return [...(this._historyByControllerId[controllerId] ?? [])];
      },
      /**
       * Resolves the store triple the screens display (店舗コード / 店舗名) from the `storeId` the
       * client sends — the design doc only carries the id, so the labels are looked up here.
       */
      _resolveStore(storeId: string): { storeId: string; storeCode: string; storeName: string } {
        const store = getDb().stores.getById(storeId);
        return {
          storeId,
          storeCode: store?.store_id ?? storeId,
          storeName: store?.name ?? '',
        };
      },
      _appendHistory(controllerId: string, entry: Omit<ControllerHistoryItem, 'historyId'>): void {
        const history = this._historyByControllerId[controllerId] ?? [];
        this._historyByControllerId[controllerId] = [
          {
            ...entry,
            historyId: `${controllerId}-H${String(history.length + 1).padStart(3, '0')}`,
          },
          ...history,
        ];
      },
      create(input: UpsertControllerRequest): ControllerDetail {
        this._seed();
        const nextNumber =
          this._rows.reduce((max, row) => {
            const parsed = Number.parseInt(row.id.replace(/^CTRL-/, ''), 10);
            return Number.isNaN(parsed) ? max : Math.max(max, parsed);
          }, 0) + 1;
        const controllerId = `CTRL-${String(nextNumber).padStart(3, '0')}`;
        const now = new Date().toISOString();
        const row: Controller = {
          id: controllerId,
          ...this._resolveStore(input.storeId),
          name: input.name,
          location: input.location,
          ipAddress: input.ipAddress,
          // Not a form field (see controller.schema.ts): new units get the administrative default.
          port: 80,
          firmwareVersion: input.firmwareVersion ?? null,
          controlPortCount: input.controlPortCount,
          status: input.status,
          createdAt: now,
          updatedAt: now,
        };
        this._rows.push(row);
        this._historyByControllerId[controllerId] = [];
        this._appendHistory(controllerId, {
          changedAt: now,
          changedBy: MOCK_HISTORY_ACTOR,
          previousStatus: null,
          newStatus: row.status,
          changedNote: null,
        });
        return {
          ...row,
          connectedDeviceCount: 0,
          deviceSummary: buildControllerDeviceSummary([]),
        };
      },
      update(controllerId: string, input: PatchControllerRequest): ControllerDetail | undefined {
        this._seed();
        const index = this._rows.findIndex((row) => row.id === controllerId);
        if (index === -1) return undefined;
        const existing = this._rows[index];
        const nextRow: Controller = { ...existing };
        if (input.name !== undefined) nextRow.name = input.name;
        if (input.storeId !== undefined) Object.assign(nextRow, this._resolveStore(input.storeId));
        if (input.location !== undefined) nextRow.location = input.location;
        if (input.ipAddress !== undefined) nextRow.ipAddress = input.ipAddress;
        if (input.firmwareVersion !== undefined)
          nextRow.firmwareVersion = input.firmwareVersion ?? null;
        if (input.controlPortCount !== undefined) nextRow.controlPortCount = input.controlPortCount;
        if (input.status !== undefined) nextRow.status = input.status;
        nextRow.updatedAt = new Date().toISOString();
        this._rows[index] = nextRow;

        // A status move is what the ステータス変更 dialog sends, and it is the only edit that
        // leaves a 変更履歴 row — field edits from the form do not.
        if (input.status !== undefined && input.status !== existing.status) {
          this._appendHistory(controllerId, {
            changedAt: nextRow.updatedAt,
            changedBy: MOCK_HISTORY_ACTOR,
            previousStatus: existing.status,
            newStatus: input.status,
            changedNote: input.changedNote?.trim() ? input.changedNote.trim() : null,
          });
        }

        const devices = this.getConnectedDevices(controllerId);
        return {
          ...nextRow,
          connectedDeviceCount: devices.length,
          deviceSummary: buildControllerDeviceSummary(devices),
        };
      },
      delete(
        controllerId: string,
      ): { ok: true } | { ok: false; reason: 'has_connected_devices'; deviceCount: number } {
        this._seed();
        const index = this._rows.findIndex((row) => row.id === controllerId);
        if (index === -1) return { ok: true };
        const devices = this.getConnectedDevices(controllerId);
        if (devices.length > 0)
          return { ok: false, reason: 'has_connected_devices', deviceCount: devices.length };
        this._rows.splice(index, 1);
        delete this._historyByControllerId[controllerId];
        return { ok: true };
      },
    },

    visitExperiences: {
      _rows: [] as VisitExperienceDetail[],
      _seeded: false,
      _seed(): void {
        if (this._seeded) return;
        this._seeded = true;
        this._rows = [...SEED_VISIT_EXPERIENCES];
      },
      getAll(): VisitExperienceDetail[] {
        this._seed();
        return [...this._rows];
      },
      getById(id: string): VisitExperienceDetail | undefined {
        this._seed();
        return this._rows.find((ve) => ve.id === id);
      },
      update(id: string, record: VisitExperienceDetail): void {
        this._seed();
        const idx = this._rows.findIndex((ve) => ve.id === id);
        if (idx !== -1) this._rows[idx] = record;
      },
    },
  };
}
