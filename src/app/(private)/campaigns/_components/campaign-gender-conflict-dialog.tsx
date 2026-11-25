'use client';

import Link from 'next/link';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { navigate } from '@/lib/routes/routes.util';

import type { CampaignGenderConflict } from '../_utils/campaign-gender-conflict';

const optionLabel = (name: string | null) => name ?? '（名称不明のオプション）';

interface CampaignGenderConflictDialogProps {
  /** The conflict to show; null keeps the dialog closed. */
  conflict: CampaignGenderConflict | null;
  onClose: () => void;
}

/**
 * The dialog for an auto-grant gender conflict (E-02 FR-016): which campaign blocks a plan / option
 * / area edit, or which auto-grant option keeps a campaign from reopening. Driven by
 * `useCampaignGenderConflict` on the screen that saves.
 */
export function CampaignGenderConflictDialog({
  conflict,
  onClose,
}: Readonly<CampaignGenderConflictDialogProps>) {
  return (
    <AlertDialog open={conflict !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-lg">
        {conflict?.kind === 'master-edit' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>この変更は保存できません</AlertDialogTitle>
              <AlertDialogDescription>{conflict.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="max-h-64 space-y-2 overflow-auto text-sm">
              {conflict.campaigns.map((campaign) => (
                <li key={campaign.campaignId} className="rounded-md border p-2">
                  {/* A new tab: the form behind keeps its unsaved edits, to be saved again once the
                      campaign is stopped. */}
                  <Link
                    href={navigate('/campaigns/[id]', campaign.campaignId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    {campaign.campaignNumber} {campaign.name}
                  </Link>
                  <p className="text-muted-foreground mt-1 text-xs">
                    自動付与：
                    {campaign.autoOptions
                      .map((option) => optionLabel(option.optionName))
                      .join('、')}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              キャンペーンの内容は編集できません。上記キャンペーンの受付を停止してから、もう一度保存してください。
            </p>
          </>
        )}
        {conflict?.kind === 'auto-grant' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>自動付与オプションの性別条件が合いません</AlertDialogTitle>
              <AlertDialogDescription>{conflict.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {conflict.options.map((option) => (
                <li key={option.optionId}>{optionLabel(option.optionName)}</li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              オプションまたはエリアの設定を見直すか、付与対象を合わせた新しいキャンペーンを作成してください。
            </p>
          </>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>閉じる</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
