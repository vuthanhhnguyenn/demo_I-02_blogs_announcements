import { AlertCircle } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';

type Props = {
  /** What failed to load, e.g. 「主契約プランの取得に失敗しました」 */
  title: string;
  onRetry: () => void;
};

/**
 * A section's (or link drawer's) read failure. Queries fail silently by default (the shared
 * `QueryCache` only toasts on opt-in), so without this a 500 read as 0件 + データがありません —
 * indistinguishable from a store that genuinely links nothing (BUG-U5-01).
 */
export function SectionLoadError({ title, onRetry }: Props) {
  return (
    <Empty
      icon={AlertCircle}
      title={title}
      description="通信状況をご確認のうえ、再度お試しください。"
      actionLabel="再読み込み"
      onAction={onRetry}
    />
  );
}
