'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, QrCode } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  adminConnectedDeviceControllerDetailQueryKey,
  adminConnectedDeviceControllerHistoryQueryKey,
  adminConnectedDeviceControllerRegenerateQrIdMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { useSubmitGuard } from '../../../_hooks/use-submit-guard.hook';
import { isDeviceNotFoundError } from '../../../_utils/device-api.util';
import {
  invalidateEquipmentRosterCaches,
  removeDeletedEquipmentQueries,
} from '../../_utils/equipment-cache.util';

type EquipmentDetail = ConnectedDeviceDetailDto;

const QR_SIZE = 200;

/** Triggers a browser download of `href` as `fileName`. */
function saveFile(href: string, fileName: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.click();
}

interface EquipmentQrDialogProps {
  equipment: EquipmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The member_scan QR sticker of the device: `<brand>://x-callback-url/unlock?major=<clubCode>&minor=<qrId>`,
 * opened from the detail header's 「QRコード」 button.
 * 発行 when the device has no `qrId` yet; 再発行 (behind a warning — the printed sticker stops
 * working) when it has one. Both call `POST …/{deviceId}/qr-id`, which draws a random free number;
 * the modal stays open and shows the new QR.
 */
export function EquipmentQrDialog({ equipment, open, onOpenChange }: EquipmentQrDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasQrId = equipment.qrId != null;
  // Built by the API (`qrPayload`); null when no number is issued or the store is unresolved.
  const payload = equipment.qrPayload;

  const qrMutation = useMutation({
    ...adminConnectedDeviceControllerRegenerateQrIdMutation(),
    onSuccess: (data) => {
      queryClient.setQueryData(
        adminConnectedDeviceControllerDetailQueryKey({ path: { deviceId: equipment.id } }),
        data,
      );
      // The list carries qrId too.
      invalidateEquipmentRosterCaches(queryClient);
      // The issue is recorded in 変更履歴 (QRコード発行 / QRコード再発行) — refetch the tab, any page.
      void queryClient.invalidateQueries({
        queryKey: adminConnectedDeviceControllerHistoryQueryKey({
          path: { deviceId: equipment.id },
        }),
      });
      toast.success(hasQrId ? 'QRコードを再発行しました' : 'QRコードを発行しました');
      setConfirmOpen(false);
    },
    // The error toast comes from the shared MutationCache (D12); only the screen reaction lives here.
    onError: (error) => {
      if (isDeviceNotFoundError(error)) {
        // Deleted elsewhere: the detail is stale — leave for the list.
        setConfirmOpen(false);
        onOpenChange(false);
        removeDeletedEquipmentQueries(queryClient, equipment.id);
        invalidateEquipmentRosterCaches(queryClient);
        router.push(navigate('/equipment'));
      }
    },
  });

  const { submitOnce, resetSubmitGuard } = useSubmitGuard(qrMutation.isPending, qrMutation.isError);

  useEffect(() => {
    if (open) resetSubmitGuard();
  }, [open, resetSubmitGuard]);

  const issue = () => {
    submitOnce(() => qrMutation.mutate({ path: { deviceId: equipment.id } }));
  };

  const handleIssueClick = () => {
    resetSubmitGuard();
    if (hasQrId) {
      setConfirmOpen(true);
      return;
    }
    issue();
  };

  const fileBase = `${equipment.name}_QR_${equipment.qrId}`;

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    saveFile(canvas.toDataURL('image/png'), `${fileBase}.png`);
  };

  // Vector copy for printing stickers at any size; rendered off-screen from the same payload.
  const handleDownloadSvg = () => {
    const svg = svgRef.current;
    if (!svg || !payload) return;
    const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    saveFile(url, `${fileBase}.svg`);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md min-w-0">
          <DialogHeader>
            <DialogTitle>QRコード</DialogTitle>
            {/* An unbroken name wraps instead of widening the dialog (BUG-E02-B-09). */}
            <DialogDescription className="wrap-anywhere">{equipment.name}</DialogDescription>
          </DialogHeader>

          <div className="flex min-w-0 flex-col items-center">
            {!hasQrId ? (
              <div className="flex flex-col items-center py-4">
                <div className="bg-muted mb-3 flex size-20 items-center justify-center rounded-full">
                  <QrCode className="text-muted-foreground size-10" />
                </div>
                <p className="text-muted-foreground text-sm">QRコード未発行</p>
              </div>
            ) : payload ? (
              <>
                <div className="rounded-md border bg-white p-2">
                  <QRCodeCanvas
                    ref={canvasRef}
                    value={payload}
                    size={QR_SIZE}
                    level="M"
                    marginSize={2}
                    title={payload}
                  />
                </div>
                <div className="hidden">
                  <QRCodeSVG
                    ref={svgRef}
                    value={payload}
                    size={QR_SIZE}
                    level="M"
                    marginSize={2}
                    bgColor="#FFFFFF"
                  />
                </div>
                <div className="mt-3 flex w-full items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Download className="size-4" />
                    ダウンロード
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="PNGでダウンロード"
                      onClick={handleDownloadPng}
                    >
                      PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="SVGでダウンロード"
                      onClick={handleDownloadSvg}
                    >
                      SVG
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <p className="text-muted-foreground text-sm">
                  店舗のクラブコードまたはブランドを取得できないため、QRコードを表示できません。
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
            <RoleGatedButton
              requiredPermission={Permission.EquipmentEdit}
              denyTooltip="QRコード発行権限がありません"
              disabled={qrMutation.isPending}
              onClick={handleIssueClick}
            >
              {hasQrId ? 'QRコードを再発行' : 'QRコードを発行'}
            </RoleGatedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="min-w-0">
          <AlertDialogHeader>
            <AlertDialogTitle>QRコードを再発行しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在のQRコードは無効になり、印刷済みのステッカーは使用できなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={qrMutation.isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={qrMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                issue();
              }}
            >
              {qrMutation.isPending ? '再発行中...' : '再発行する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
