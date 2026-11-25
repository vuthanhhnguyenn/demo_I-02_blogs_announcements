import { z } from 'zod';

import { CONTROLLER_STATUS_VALUES } from '../_constants/constants';

export { CONTROLLER_STATUS_VALUES };

// Four octets, each 0-255: a plain `\d{1,3}` would let 999.999.999.999 through.
const LOCAL_IP_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/**
 * API-104 `firmwareVersion`: optional; letters, digits and `.` `_` `-` only, at most 64 chars
 * (else 422 E-DEV-012). The helper text's 「vN.N.N 形式」 is guidance only — the shape is not
 * enforced (BE-REQUESTS No.9, settled 2026-10-16; supersedes BUG-E02-F-04's vN.N.N check).
 */
/**
 * API-104 `relayId` (接点制御装置ID): the AWS IoT thing name the unlock is published to, so it is
 * typed in on 新規登録 and must match the converter's provisioned name. Letters, digits, `_`, `-`;
 * 1–128 chars; unique among live controllers (409 E-DEV-018); immutable after create (Notion
 * 接点制御装置 仮仕様 2026-11-08, BE 28b9f0cb). The prototype still shows it as 「（自動採番）」.
 */
export const RELAY_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
export const RELAY_ID_MAX_LENGTH = 128;

const FIRMWARE_VERSION_REGEX = /^[0-9A-Za-z._-]{1,64}$/;
export const FIRMWARE_VERSION_MAX_LENGTH = 64;

function isIntegerInRange(value: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

/**
 * Shared zod schema for 接点制御装置 新規登録 / 編集 (FR-007) — the prototype's form fields only:
 * 通信ポート番号 is not part of E-02's registration items, so the form has no input for it.
 */
export const controllerFormSchema = z.object({
  relayId: z
    .string()
    .trim()
    .min(1, '接点制御装置IDを入力してください')
    .max(RELAY_ID_MAX_LENGTH, `${RELAY_ID_MAX_LENGTH}文字以内で入力してください`)
    .regex(RELAY_ID_REGEX, '半角英数字と「_」「-」のみ入力できます（例: yashio-rc_01）'),
  name: z.string().trim().min(1, '装置名を入力してください'),
  storeId: z.string().trim().min(1, '店舗コードを選択してください'),
  location: z.string().trim().min(1, '設置場所を入力してください'),
  ipAddress: z
    .string()
    .trim()
    .min(1, 'IPアドレスを入力してください')
    .regex(LOCAL_IP_REGEX, 'IPアドレスの形式が正しくありません（例: 192.168.1.10）'),
  controlPortCount: z
    .string()
    .trim()
    .min(1, '制御ポート数を入力してください')
    .refine((value) => isIntegerInRange(value, 1, 64), '1〜64 の範囲で入力してください'),
  // Optional field; see FIRMWARE_VERSION_REGEX.
  firmwareVersion: z
    .string()
    .trim()
    .max(FIRMWARE_VERSION_MAX_LENGTH, `${FIRMWARE_VERSION_MAX_LENGTH}文字以内で入力してください`)
    .refine(
      (value) => value === '' || FIRMWARE_VERSION_REGEX.test(value),
      '半角英数字と「.」「_」「-」のみ入力できます（例: v2.4.1）',
    ),
  /**
   * 状態 has no default on 新規登録 — the prototype opens the select on its 状態を選択 placeholder
   * and blocks submit until one is picked, so the empty string is a valid *input* that the schema
   * rejects, and the parsed output is always a real status.
   */
  status: z
    .union([z.enum(CONTROLLER_STATUS_VALUES), z.literal('')])
    .pipe(z.enum(CONTROLLER_STATUS_VALUES, { error: '状態を選択してください' })),
});

export type ControllerFormValues = z.input<typeof controllerFormSchema>;
export type ControllerFormSubmitValues = z.output<typeof controllerFormSchema>;
