import type { StoreBrandEnum } from '../../../../_constants/constants';
import { CampaignSection } from './_components/campaign-section';
import { MainContractSection } from './_components/main-contract-section';
import { OneDayPassSection } from './_components/one-day-pass-section';
import { OptionSection } from './_components/option-section';

type Props = {
  storeId: string;
  storeBrand: StoreBrandEnum;
};

/**
 * Tab 3 — contract and pricing (Y-02 FR-003 sales settings + G-03 store-use campaign selection).
 *
 * Sections follow the prototype's order: main contract plans -> options -> campaigns ->
 * 1DayPass price setting (`store-detail.tsx` L1015-L1360).
 */
export function ContractTab({ storeId, storeBrand }: Props) {
  return (
    <div className="space-y-4">
      {/* Scope banner — the prototype uses a light info box with no icon */}
      <div className="border-info/20 bg-info/15 rounded-md border px-4 py-3">
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          「商材・施策」メニューで作成されたマスタから、この店舗で取り扱う商材・施策を紐づけます。料金・条件の変更は商材・施策メニューで行ってください。
        </p>
      </div>

      <MainContractSection storeId={storeId} />
      <OptionSection storeId={storeId} />
      <CampaignSection storeId={storeId} storeBrand={storeBrand} />
      <OneDayPassSection storeId={storeId} />
    </div>
  );
}
