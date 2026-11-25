'use client';

import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { StatusCard } from '@/components/common/status-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  adminCampaignControllerDetailQueryKey,
  adminCampaignControllerHistoryQueryKey,
  adminCampaignControllerListQueryKey,
  adminCampaignControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { CampaignDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { CampaignGenderConflictDialog } from '../../_components/campaign-gender-conflict-dialog';
import {
  CAMPAIGN_ACCEPTING_STATUS_LABELS,
  CAMPAIGN_ACCEPTING_STATUS_TONES,
} from '../../_constants/constants';
import { useCampaignGenderConflict } from '../../_hooks/use-campaign-gender-conflict';

type CampaignAcceptancePanelProps = {
  campaign: CampaignDetailDto;
};

export function CampaignAcceptancePanel({ campaign }: Readonly<CampaignAcceptancePanelProps>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  // ボタンの disabled は再描画後に効くため、同一 tick の連打は ref で弾く
  const isUpdateInFlight = useRef(false);

  const capReached = campaign.acceptingStatus === 'capacity_reached';
  const isAccepting = campaign.isAccepting;
  const remaining = campaign.remainingCount;
  const genderConflict = useCampaignGenderConflict();

  const updateMutation = useMutation({
    ...adminCampaignControllerUpdateMutation(),
    // E-CMP-024: reopening is refused while an auto-grant no longer fits its option's areas, and
    // the error names those options in a dialog instead of a toast.
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success(isAccepting ? '受付を停止しました' : '受付を再開しました', {
        description: isAccepting
          ? '入会フローでこのキャンペーンが表示されなくなりました'
          : '入会フローで再びこのキャンペーンが表示されます',
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: adminCampaignControllerListQueryKey() });
      queryClient.invalidateQueries({
        queryKey: adminCampaignControllerDetailQueryKey({
          path: { campaignId: campaign.campaignId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: adminCampaignControllerHistoryQueryKey({
          path: { campaignId: campaign.campaignId },
        }),
      });
    },
    onError: (error) => {
      // The conflict dialog replaces this confirm rather than open on top of it.
      if (genderConflict.handleError(error)) setOpen(false);
    },
  });

  const meta = [
    campaign.capacityLimit === null
      ? '先着件数上限: 未設定'
      : `先着件数上限: ${campaign.capacityLimit}件（申請 ${campaign.appliedCount}件 / 残り ${remaining ?? 0}件）`,
    `募集期間: ${campaign.recruitmentStart} 〜 ${campaign.recruitmentEnd}`,
    capReached
      ? '上限到達のためシステムが自動で受付可否フラグをOFFにしました'
      : 'OFFで入会フローから非表示',
  ];

  return (
    <>
      <StatusCard
        tone={CAMPAIGN_ACCEPTING_STATUS_TONES[campaign.acceptingStatus]}
        icon={Megaphone}
        label={CAMPAIGN_ACCEPTING_STATUS_LABELS[campaign.acceptingStatus]}
        meta={meta}
        action={
          capReached ? undefined : (
            <AlertDialog open={open} onOpenChange={setOpen}>
              {/* G-03 L236: 受付フラグ制御は System / Headquarter のみ */}
              <AlertDialogTrigger
                render={
                  <RoleGatedButton
                    requiredPermission={Permission.CampaignsEdit}
                    variant="outline"
                    size="sm"
                    fullWidth
                  >
                    {isAccepting ? '受付を停止する' : '受付を再開する'}
                  </RoleGatedButton>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isAccepting
                      ? 'このキャンペーンの受付を停止しますか？'
                      : 'このキャンペーンの受付を再開しますか？'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isAccepting
                      ? '受付停止中は入会フローでこのキャンペーンが表示されなくなります。既存の適用会員への影響はありません。'
                      : '受付再開すると入会フローで再びこのキャンペーンが表示されます。'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={updateMutation.isPending}>
                    キャンセル
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (isUpdateInFlight.current) return;
                      isUpdateInFlight.current = true;
                      updateMutation.mutate(
                        {
                          path: { campaignId: campaign.campaignId },
                          body: { isAccepting: !isAccepting },
                        },
                        { onSettled: () => (isUpdateInFlight.current = false) },
                      );
                    }}
                    disabled={updateMutation.isPending}
                  >
                    {isAccepting ? '停止する' : '再開する'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }
      />
      <CampaignGenderConflictDialog
        conflict={genderConflict.conflict}
        onClose={genderConflict.close}
      />
    </>
  );
}
