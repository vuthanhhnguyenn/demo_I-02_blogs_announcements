import { memberTypeLabel } from '@/app/(private)/members/_constants/constants';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { BrandBadge } from '@/components/common/brand-badge';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';

import type { QuestionnaireResponseListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  SURVEY_RESPONSE_CATEGORY_LABELS,
  SURVEY_RESPONSE_ROW_STATUS_BADGE_CLASSES,
  SURVEY_RESPONSE_ROW_STATUS_LABELS,
  formatSurveyMemberName,
  getSurveyResponseRowStatus,
  toSurveyBrandEnum,
} from '../../_constants/constants';

type SurveyResponseRow = QuestionnaireResponseListItemDto;

export function SurveyResponsesTableColumns(): ColumnDef<SurveyResponseRow>[] {
  return [
    {
      id: 'response_date',
      enableSorting: false,
      header: '回答日時',
      meta: { className: 'w-[140px]' },
      cell: ({ row }) => (
        <span className="text-xs">{formatDateYYYYMMDD_HHMM(row.original.submittedAt, '—')}</span>
      ),
    },
    {
      id: 'member_number',
      enableSorting: false,
      header: '会員番号',
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.member.memberNumber ?? '—'}
        </span>
      ),
    },
    {
      id: 'member_name',
      enableSorting: false,
      header: '会員名',
      meta: { className: 'min-w-[150px]' },
      cell: ({ row }) => (
        <TextWithTooltip
          text={formatSurveyMemberName(row.original.member)}
          className="text-sm font-medium"
          wrapperClassName="max-w-[200px]"
        />
      ),
    },
    {
      id: 'survey_name',
      enableSorting: false,
      header: 'アンケート名',
      meta: { className: 'min-w-[220px]' },
      cell: ({ row }) => (
        <TextWithTooltip
          text={row.original.questionnaire.name}
          className="text-xs"
          wrapperClassName="max-w-[260px]"
        />
      ),
    },
    {
      id: 'template_type',
      enableSorting: false,
      header: '種別',
      meta: { className: 'w-[112px]' },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            row.original.questionnaire.category === 'lifecycle' &&
              'bg-info/15 text-info border-info/20',
          )}
        >
          {SURVEY_RESPONSE_CATEGORY_LABELS[row.original.questionnaire.category]}
        </Badge>
      ),
    },
    {
      id: 'brand',
      enableSorting: false,
      header: 'ブランド',
      meta: { className: 'w-[104px]' },
      cell: ({ row }) => {
        const brand = toSurveyBrandEnum(row.original.store?.brandEnum);
        return brand ? (
          <BrandBadge brand={brand} />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      id: 'store_name',
      enableSorting: false,
      header: '店舗',
      meta: { className: 'min-w-[140px]' },
      cell: ({ row }) => (
        <TextWithTooltip
          text={row.original.store?.name ?? '—'}
          className="text-xs"
          wrapperClassName="max-w-[180px]"
        />
      ),
    },
    {
      id: 'member_type',
      enableSorting: false,
      header: '区分',
      meta: { className: 'w-[132px]' },
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-normal">
          {memberTypeLabel(row.original.member.memberType) ?? '—'}
        </Badge>
      ),
    },
    {
      id: 'answered_count',
      enableSorting: false,
      header: '回答数',
      meta: { className: 'w-[88px] text-right' },
      cell: ({ row }) => (
        <span className="inline-block w-full text-right text-xs">
          {row.original.answeredQuestionCount}/{row.original.totalQuestionCount}問
        </span>
      ),
    },
    {
      id: 'status',
      enableSorting: false,
      header: '状態',
      meta: { className: 'w-[84px]' },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-normal',
            SURVEY_RESPONSE_ROW_STATUS_BADGE_CLASSES[getSurveyResponseRowStatus(row.original)],
          )}
        >
          {SURVEY_RESPONSE_ROW_STATUS_LABELS[getSurveyResponseRowStatus(row.original)]}
        </Badge>
      ),
    },
  ];
}
