import { z } from 'zod';

import {
  EQUIPMENT_MAIN_CONTRACT_TYPE_VALUES,
  EQUIPMENT_SERVICE_TYPE_VALUES,
  type EquipmentAuthMethod,
  type EquipmentStatus,
  type EquipmentType,
} from '../_constants/constants';

// Values mirror the API contract (API-103); the form's own field names stay snake_case. The
// `satisfies` clauses fail `tsc` if the backend enum drifts from these lists.
export const EQUIPMENT_TYPE_VALUES = [
  'entry_gate',
  'exit_gate',
  'gate_tablet',
  'area_door',
  'hydrogen_water',
  'body_composition',
  'tanning',
  'protein',
  'other',
] as const satisfies readonly EquipmentType[];

/**
 * 機器タイプ offered on 新規登録. 入退館タブレット (E-02 v3, GATE-01) needs its own fields — 用途,
 * 端末証明書ID, 連動する入退館ゲート — that neither the prototype nor this form has yet, so it can
 * be shown and edited (type locked) but not created here.
 * TODO(round3) R304: tablet registration (tabletPurpose / certificateId / linkedGateDeviceId).
 */
export const EQUIPMENT_CREATABLE_TYPE_VALUES = EQUIPMENT_TYPE_VALUES.filter(
  (type) => type !== 'gate_tablet',
);

export const EQUIPMENT_STATUS_VALUES = [
  'normal',
  'abnormal',
  'under_maintenance',
  'discarded',
] as const satisfies readonly EquipmentStatus[];

export const EQUIPMENT_AUTH_VALUES = [
  'member_scan',
  'device_scan',
  'none',
] as const satisfies readonly EquipmentAuthMethod[];

/** API-103 `CreateConnectedDeviceDto` bounds. */
export const EQUIPMENT_NAME_MAX_LENGTH = 100;
export const EQUIPMENT_SERIAL_MAX_LENGTH = 100;
export const EQUIPMENT_LOCATION_MAX_LENGTH = 200;
export const EQUIPMENT_NOTE_MAX_LENGTH = 1000;
/**
 * API-103 `ipAddress`: optional, but when given it must be a valid IPv4 or IPv6 address, the same
 * rule as relay controllers (BE-REQUESTS No.8) — `256.1.1.1`, `abc` and full-width digits fail.
 */
const ipAddressSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === '' || z.ipv4().safeParse(value).success || z.ipv6().safeParse(value).success,
    'IPアドレスの形式が正しくありません（例: 192.168.1.101）',
  );

/**
 * API-103 `outputPort` range is 1 … the controller's 制御ポート数; the API falls back to 8 when the
 * controller has none recorded.
 */
export const EQUIPMENT_OUTPUT_PORT_DEFAULT_COUNT = 8;

/**
 * 主契約判定's scope (prototype 11/7, Dev Q&A 「主契約判定の「全て」の見せ方」): 「全て」 = any active
 * main contract, 「タイプを指定」 = one of the ticked types. `''` = not chosen yet — there is no
 * default, since defaulting to 全て would let a bare checkbox open the device to anyone with a
 * contract and no option.
 */
export const MAIN_CONTRACT_SCOPE_VALUES = ['all', 'specified'] as const;
export type MainContractScope = (typeof MAIN_CONTRACT_SCOPE_VALUES)[number];

// E-02 FR-008: two judgment axes — 主契約判定 (「全て」 or several types, 11/5 データ設定会) and
// サービス種別判定 (multi-select). 課金種別 (通常/都度) is not a judgment axis: any active option of
// the same service type permits start-up, whatever its billing type (OR judgment).
const usageControlRuleSchema = z.object({
  main_enabled: z.boolean(),
  main_scope: z.enum(MAIN_CONTRACT_SCOPE_VALUES).or(z.literal('')),
  main_contract_types: z.array(z.enum(EQUIPMENT_MAIN_CONTRACT_TYPE_VALUES)),
  service_enabled: z.boolean(),
  service_types: z.array(z.enum(EQUIPMENT_SERVICE_TYPE_VALUES)),
});

type UsageControlRuleValues = z.output<typeof usageControlRuleSchema>;

/** E-02 FR-003 / FR-008: an area door opens by its area alone — it has no usage-control rule. */
export function isAreaDoor(equipmentType: string | undefined): boolean {
  return equipmentType === 'area_door';
}

/**
 * The FR-008 rule checks. Run at the form level (with `when`, so they still surface while other
 * fields are invalid — the prototype shows them on the first submit), because whether they apply
 * depends on the device type: an area door is judged by its area, not by a rule.
 */
function addUsageRuleIssues(rule: UsageControlRuleValues | undefined, ctx: z.RefinementCtx): void {
  if (!rule) return;
  // FR-008 異常系: 契約種別が未選択の場合はバリデーションエラー — at least one axis must be on.
  if (!rule.main_enabled && !rule.service_enabled) {
    ctx.addIssue({
      code: 'custom',
      message:
        '主契約判定かサービス種別判定のどちらかを設定してください。設定がないと、この機器は誰も起動できません',
      path: ['usage_control_rule'],
    });
  }
  if (rule.main_enabled && rule.main_scope === '') {
    ctx.addIssue({
      code: 'custom',
      message: '「全て」か「タイプを指定」を選択してください',
      path: ['usage_control_rule', 'main_scope'],
    });
  }
  if (
    rule.main_enabled &&
    rule.main_scope === 'specified' &&
    rule.main_contract_types.length === 0
  ) {
    ctx.addIssue({
      code: 'custom',
      message: '主契約タイプを1つ以上選択してください',
      path: ['usage_control_rule', 'main_contract_types'],
    });
  }
  if (rule.service_enabled && rule.service_types.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'サービス種別を1つ以上選択してください',
      path: ['usage_control_rule', 'service_types'],
    });
  }
}

/** Shared zod schema for 接続機器 新規登録 / 編集 (FR-003 / FR-005). */
export const equipmentFormSchema = z
  .object({
    name: z.string().trim().min(1, '機器名を入力してください'),
    equipment_type: z.enum(EQUIPMENT_TYPE_VALUES, { error: '機器タイプを選択してください' }),
    serial_number: z.string().trim().min(1, 'シリアルナンバーを入力してください'),
    install_location: z.string().trim().min(1, '設置場所を入力してください'),
    installed_on: z.string().min(1, '設置日を入力してください'),
    status: z.enum(EQUIPMENT_STATUS_VALUES),
    // Both required, as in the prototype form and the design doc's create contract.
    authentication_method: z.enum(EQUIPMENT_AUTH_VALUES, { error: '認証方式を選択してください' }),
    controller_id: z.string().min(1, '接続先接点制御装置を選択してください'),
    // 出力ポート (spec 007, Session 2026-10-12): the relay contact the device is wired to. The
    // Select holds the number as a string; '' = unset. Required unless 認証方式 is なし (below).
    output_port: z.string(),
    ip_address: ipAddressSchema,
    mac_address: z.string(),
    usage_control_rule: usageControlRuleSchema,
    // E-02 FR-003: エリア扉 only — the one area (E-02 FR-016) of the store's brand. '' = unset.
    area_id: z.string(),
    remarks: z.string(),
  })
  // API-103 `outputPort`: required when 認証方式 ≠ なし, null for なし. `when` keeps the check
  // running while unrelated fields are still invalid, so it surfaces on the first submit.
  .refine((values) => values.authentication_method === 'none' || values.output_port !== '', {
    message: '出力ポートを選択してください',
    path: ['output_port'],
    when: (payload) => !payload.issues.some((issue) => issue.path?.[0] === 'authentication_method'),
  })
  .superRefine(
    (values, ctx) => {
      if (isAreaDoor(values.equipment_type)) {
        if (!values.area_id)
          ctx.addIssue({ code: 'custom', message: 'エリアを選択してください', path: ['area_id'] });
        return;
      }
      addUsageRuleIssues(values.usage_control_rule, ctx);
    },
    { when: () => true },
  );

export type EquipmentFormValues = z.input<typeof equipmentFormSchema>;
export type EquipmentFormSubmitValues = z.output<typeof equipmentFormSchema>;
export type EquipmentUsageControlRuleFormValue = z.infer<typeof usageControlRuleSchema>;
