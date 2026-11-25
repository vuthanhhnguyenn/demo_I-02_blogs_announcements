import { TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

import type { AppVersionPairDto } from '@/lib/api-real/types.gen';

import {
  APP_VERSION_BRANDS,
  APP_VERSION_OSES,
  APP_VERSION_SLOT_KINDS,
  type AppVersionOs,
  type AppVersionSlot,
  appVersionSlot,
} from '../_constants/app-version.constants';
import { compareAppVersionPair } from '../_utils/app-version-compare.util';

const VERSION_NAME_REGEX = /^\d+\.\d+\.\d+$/;
const BUILD_NUMBER_REGEX = /^\d+$/;
// Build numbers are stored in a PostgreSQL `integer` column (auth-svc `AppVersion`).
const BUILD_NUMBER_MAX = 2147483647;

export const LATEST_BELOW_MINIMUM_MESSAGE = '最新バージョンは最低バージョン以上にしてください。';

const versionNameField = z
  .string()
  .trim()
  .refine((value) => value === '' || VERSION_NAME_REGEX.test(value), {
    message: 'X.Y.Z 形式で入力してください（例: 1.2.3）',
  });

// The edit form is seeded with numbers while a typed value arrives as a string.
const buildNumberField = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => (value === undefined ? '' : String(value).trim()))
  .refine((value) => value === '' || BUILD_NUMBER_REGEX.test(value), {
    message: 'ビルド番号は数値で入力してください',
  })
  .refine((value) => value === '' || Number(value) >= 1, {
    message: 'ビルド番号は1以上の整数を入力してください',
  })
  .refine((value) => value === '' || Number(value) <= BUILD_NUMBER_MAX, {
    message: `ビルド番号は${BUILD_NUMBER_MAX}以下で入力してください`,
  });

export const AppVersionFormSchema = z
  .object({
    brandEnum: z.enum(APP_VERSION_BRANDS, { error: 'ブランドを選択してください' }),
    effectiveAt: z.string().min(1, '適用開始日時を選択してください'),
    iosMinVersionName: versionNameField,
    iosMinBuildNumber: buildNumberField,
    androidMinVersionName: versionNameField,
    androidMinBuildNumber: buildNumberField,
    iosLatestVersionName: versionNameField,
    iosLatestBuildNumber: buildNumberField,
    androidLatestVersionName: versionNameField,
    androidLatestBuildNumber: buildNumberField,
    remarks: z
      .string()
      .max(TEXTAREA_MAX_LENGTH, '備考は1000文字以内で入力してください。')
      .default(''),
  })
  .superRefine((values, ctx) => {
    // FR-M002: バージョン名とビルド番号は、両方入力するか、両方空欄にする.
    for (const os of APP_VERSION_OSES) {
      for (const kind of APP_VERSION_SLOT_KINDS) {
        const slot = appVersionSlot(os, kind);
        const name = values[`${slot}VersionName`];
        const build = values[`${slot}BuildNumber`];
        if (name !== '' && build === '') {
          ctx.addIssue({
            code: 'custom',
            path: [`${slot}BuildNumber`],
            message: 'バージョン名とあわせてビルド番号を入力してください',
          });
        }
        if (name === '' && build !== '') {
          ctx.addIssue({
            code: 'custom',
            path: [`${slot}VersionName`],
            message: 'ビルド番号とあわせてバージョン名を入力してください',
          });
        }
      }

      // FR-S001: 最新バージョン ≧ 最低バージョン when both are entered here. Values carried over
      // from other settings are checked by the server (E-APP-004). The rule is about both pairs,
      // so all four inputs are flagged; the form shows the message once, under the latest.
      const min = enteredPair(values, appVersionSlot(os, 'Min'));
      const latest = enteredPair(values, appVersionSlot(os, 'Latest'));
      if (min && latest && compareAppVersionPair(latest, min) < 0) {
        for (const path of appVersionOsFieldPaths(os)) {
          ctx.addIssue({ code: 'custom', path: [path], message: LATEST_BELOW_MINIMUM_MESSAGE });
        }
      }
    }
  });

export type AppVersionFormValues = z.input<typeof AppVersionFormSchema>;
export type AppVersionFormSubmitValues = z.output<typeof AppVersionFormSchema>;

type AppVersionPairFieldPath = `${AppVersionSlot}VersionName` | `${AppVersionSlot}BuildNumber`;

type AppVersionPairFields = Pick<AppVersionFormSubmitValues, AppVersionPairFieldPath>;

/** The four inputs of one OS (minimum + latest, name + build): the cross-field rules span them. */
export function appVersionOsFieldPaths(os: AppVersionOs): AppVersionPairFieldPath[] {
  return APP_VERSION_SLOT_KINDS.flatMap((kind) => {
    const slot = appVersionSlot(os, kind);
    return [`${slot}VersionName`, `${slot}BuildNumber`] as const;
  });
}

/** The complete, well-formed pair typed into a slot, or null when the slot is (partly) blank. */
export function enteredPair(
  values: AppVersionPairFields,
  slot: AppVersionSlot,
): AppVersionPairDto | null {
  const versionName = values[`${slot}VersionName`];
  const buildNumber = values[`${slot}BuildNumber`];
  if (!VERSION_NAME_REGEX.test(versionName) || !BUILD_NUMBER_REGEX.test(buildNumber)) return null;
  return { versionName, buildNumber: Number(buildNumber) };
}

export function emptyAppVersionFormValues(): AppVersionFormValues {
  return {
    brandEnum: 'Joyfit',
    // FR-M002: 適用開始日時の初期値は現在日時.
    effectiveAt: new Date().toISOString(),
    iosMinVersionName: '',
    iosMinBuildNumber: '',
    androidMinVersionName: '',
    androidMinBuildNumber: '',
    iosLatestVersionName: '',
    iosLatestBuildNumber: '',
    androidLatestVersionName: '',
    androidLatestBuildNumber: '',
    remarks: '',
  };
}
