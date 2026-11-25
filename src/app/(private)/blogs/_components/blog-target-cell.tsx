import { BrandBadge } from '@/components/common/brand-badge';

import { BLOG_TARGET_ALL_LABEL } from '../_constants/blog.constants';
import type { BlogRow } from '../_types/blog.type';
import { getTargetBrandCodes } from '../_utils/blog-row.util';

interface BlogTargetCellProps {
  row: BlogRow;
}

/** 対象 cell (prototype L681-L693): 全社 text / brand badge / brand badge + store names below. */
export function BlogTargetCell({ row }: Readonly<BlogTargetCellProps>) {
  if (row.brandScope === 'company') {
    return <span className="text-muted-foreground text-xs">{BLOG_TARGET_ALL_LABEL}</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {getTargetBrandCodes(row).map((code) => (
          <BrandBadge key={code} brand={code} className="text-[10px]" />
        ))}
      </div>
      {/* 店舗指定はブランドの下に店舗名をサブテキスト表示 */}
      {row.brandScope === 'store' && row.targetStores.length > 0 && (
        <span className="text-muted-foreground text-xs">
          {row.targetStores.map((store) => store.name).join('・')}
        </span>
      )}
    </div>
  );
}
