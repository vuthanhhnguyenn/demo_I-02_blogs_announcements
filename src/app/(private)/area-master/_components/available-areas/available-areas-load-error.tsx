import { Button } from '@/components/ui/button';

import { resolveApiErrorMessage } from '@/lib/api-error.util';

/** The API's message for a failed area read, with a manual retry. */
export function AvailableAreasLoadError({
  error,
  onRetry,
}: Readonly<{ error: unknown; onRetry: () => void }>) {
  return (
    <p className="text-destructive text-xs">
      {resolveApiErrorMessage(error)}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="ml-1 h-auto p-0 text-xs"
        onClick={onRetry}
      >
        再読み込み
      </Button>
    </p>
  );
}
