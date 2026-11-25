import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * Y-15 organisational hierarchy (head office -> block -> area -> territory -> store).
 *
 * The backend API design (API-083) has no hierarchy concept at all — `territory` appears
 * zero times in the dev Swagger — so this whole cluster is a mock addition that the store
 * master (Y-02 FR-001) depends on for its territory column, its area-to-territory cascade
 * filter, and its bulk territory change. See `specs/026-store-list/spec.md` Appendix A.3.
 */
export const OrgLevelSchema = z
  .enum(['headquarters', 'block', 'area', 'territory'])
  .openapi({ title: 'OrgLevel', description: '組織階層のレベル' });

export const OrgTerritorySchema = z
  .object({
    id: z.string().openapi({ example: 'TRT-002', description: 'テリトリーID' }),
    name: z.string().openapi({ example: '埼玉南テリトリー', description: 'テリトリー名' }),
    /** Inactive territories stay readable (history integrity) but are not offered as a choice */
    active: z.boolean().openapi({ description: '有効フラグ（無効ノードは選択肢に出さない）' }),
    note: z.string().nullable().openapi({ description: '備考' }),
  })
  .openapi({ title: 'OrgTerritory', description: 'テリトリー（組織階層の最下層）' });

export const OrgAreaSchema = z
  .object({
    id: z.string().openapi({ example: 'AREA-01', description: 'エリアID' }),
    name: z.string().openapi({ example: '第1エリア', description: 'エリア名' }),
    block_name: z.string().openapi({ example: '関東第1運営ブロック', description: 'ブロック名' }),
    headquarters_name: z.string().openapi({ example: 'EAST運営本部', description: '運営本部名' }),
    territories: z.array(OrgTerritorySchema).openapi({ description: '配下テリトリー' }),
  })
  .openapi({
    title: 'OrgArea',
    description: 'エリアと配下テリトリー（上位のブロック・運営本部名を解決済み）',
  });

export const GetOrgAreasResponseSchema = z
  .object({
    areas: z.array(OrgAreaSchema).openapi({ description: 'エリア一覧（配下テリトリー込み）' }),
  })
  .openapi({
    title: 'GetOrgAreasResponse',
    description:
      'エリア→テリトリーの2段カスケード・変更先テリトリー選択・階層パス表示を1回で賄う組織階層レスポンス',
  });

export type OrgLevel = z.infer<typeof OrgLevelSchema>;
export type OrgTerritory = z.infer<typeof OrgTerritorySchema>;
export type OrgArea = z.infer<typeof OrgAreaSchema>;
export type GetOrgAreasResponse = z.infer<typeof GetOrgAreasResponseSchema>;
