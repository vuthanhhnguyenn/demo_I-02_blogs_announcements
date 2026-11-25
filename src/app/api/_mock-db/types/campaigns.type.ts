import type {
  CampaignChangeHistoryItem,
  CampaignRow,
  StoreCampaignLinkRow,
} from '@/app/api/_schemas/campaign.schema';

export type CampaignsType = {
  _rows: CampaignRow[];
  _changeHistory: Record<string, CampaignChangeHistoryItem[]>;
  _seeded: boolean;
  _seed(): void;
  getList(): CampaignRow[];
  getById(id: string): CampaignRow | undefined;
  getChangeHistory(id: string): CampaignChangeHistoryItem[];
  appendChangeHistory(id: string, entries: CampaignChangeHistoryItem[]): void;
  nextId(): string;
  isCodeTaken(code: string, exceptId?: string): boolean;
  create(row: CampaignRow): CampaignRow;
  update(id: string, patch: Partial<CampaignRow>): CampaignRow | undefined;
};

export type StoreCampaignLinksType = {
  _rows: StoreCampaignLinkRow[];
  _seeded: boolean;
  _seed(): void;
  getByCampaignId(campaignId: string): StoreCampaignLinkRow[];
  getByStoreId(storeId: string): StoreCampaignLinkRow[];
  linkMany(storeId: string, campaignIds: string[], linkedBy: string | null): StoreCampaignLinkRow[];
  unlink(storeId: string, campaignId: string): boolean;
};
