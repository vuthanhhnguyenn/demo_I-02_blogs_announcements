import type {
  Controller,
  ControllerConnectedDevice,
  ControllerDetail,
  ControllerHistoryItem,
  GetControllerDevicesQuery,
  GetControllerDevicesResponse,
  GetControllersQuery,
  GetControllersResponse,
  PatchControllerRequest,
  UpsertControllerRequest,
} from '@/app/api/_schemas/controller.schema';

export type ControllersType = {
  _rows: Controller[];
  _historyByControllerId: Record<string, ControllerHistoryItem[]>;
  _seeded: boolean;
  _seed(): void;
  _resolveStore(storeId: string): { storeId: string; storeCode: string; storeName: string };
  _appendHistory(controllerId: string, entry: Omit<ControllerHistoryItem, 'historyId'>): void;
  getAll(): Controller[];
  getById(controllerId: string): Controller | undefined;
  list(query: GetControllersQuery): GetControllersResponse;
  getDetailById(controllerId: string): ControllerDetail | undefined;
  getConnectedDevices(controllerId: string): ControllerConnectedDevice[];
  listConnectedDevices(
    controllerId: string,
    query: GetControllerDevicesQuery,
  ): GetControllerDevicesResponse;
  getHistory(controllerId: string): ControllerHistoryItem[];
  create(input: UpsertControllerRequest): ControllerDetail;
  update(controllerId: string, input: PatchControllerRequest): ControllerDetail | undefined;
  delete(
    controllerId: string,
  ): { ok: true } | { ok: false; reason: 'has_connected_devices'; deviceCount: number };
};
