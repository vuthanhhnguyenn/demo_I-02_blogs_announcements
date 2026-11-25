import { Button } from '@/components/ui/button';

interface CampaignPickerErrorProps {
  message: string;
  onRetry: () => void;
}

/** ピッカーの取得失敗表示。自動ページ送りは止め、利用者が 再読み込み で再取得する。 */
export function CampaignPickerError({ message, onRetry }: Readonly<CampaignPickerErrorProps>) {
  return (
    <p role="alert" className="text-destructive flex items-center gap-2 text-xs">
      {message}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={onRetry}
      >
        再読み込み
      </Button>
    </p>
  );
}
