import type { DefaultValues } from 'react-hook-form';

import type {
  AppVersionDto,
  CreateAppVersionDto,
  UpdateAppVersionDto,
} from '@/lib/api-real/types.gen';

import type { AppVersionFormSubmitValues, AppVersionFormValues } from './app-version-form.schema';

export function appVersionRecordToFormValues(
  record: AppVersionDto,
): DefaultValues<AppVersionFormValues> {
  // Seed with what was entered on this setting, not the carried-over values: a blank slot
  // must stay blank so it keeps following the earlier settings.
  return {
    brandEnum: record.brandEnum,
    effectiveAt: record.effectiveAt,
    iosMinVersionName: record.iosMinVersionName ?? '',
    iosMinBuildNumber: record.iosMinBuildNumber ?? '',
    androidMinVersionName: record.androidMinVersionName ?? '',
    androidMinBuildNumber: record.androidMinBuildNumber ?? '',
    iosLatestVersionName: record.iosLatestVersionName ?? '',
    iosLatestBuildNumber: record.iosLatestBuildNumber ?? '',
    androidLatestVersionName: record.androidLatestVersionName ?? '',
    androidLatestBuildNumber: record.androidLatestBuildNumber ?? '',
    remarks: record.remarks ?? '',
  };
}

const blankToNull = (value: string) => (value === '' ? null : value);
const buildToNumber = (value: string) => (value === '' ? null : Number(value));

/** Every version slot is sent; null = blank, which carries over the earlier setting's value. */
function toVersionValues(values: AppVersionFormSubmitValues) {
  return {
    iosMinVersionName: blankToNull(values.iosMinVersionName),
    iosMinBuildNumber: buildToNumber(values.iosMinBuildNumber),
    androidMinVersionName: blankToNull(values.androidMinVersionName),
    androidMinBuildNumber: buildToNumber(values.androidMinBuildNumber),
    iosLatestVersionName: blankToNull(values.iosLatestVersionName),
    iosLatestBuildNumber: buildToNumber(values.iosLatestBuildNumber),
    androidLatestVersionName: blankToNull(values.androidLatestVersionName),
    androidLatestBuildNumber: buildToNumber(values.androidLatestBuildNumber),
    remarks: blankToNull(values.remarks),
  };
}

export function appVersionFormValuesToCreateBody(
  values: AppVersionFormSubmitValues,
): CreateAppVersionDto {
  return {
    brandEnum: values.brandEnum,
    effectiveAt: values.effectiveAt,
    ...toVersionValues(values),
  };
}

export function appVersionFormValuesToUpdateBody(
  values: AppVersionFormSubmitValues,
): UpdateAppVersionDto {
  return {
    brandEnum: values.brandEnum,
    effectiveAt: values.effectiveAt,
    ...toVersionValues(values),
  };
}
