import { PREFECTURES } from '@/constants/app.constants';

import type {
  BlacklistPrecheckDto,
  CreateApplicationAddressDto,
  CreateApplicationDto,
} from '@/lib/api-real/types.gen';

import { GENDER_TO_API, PAYMENT_METHOD_TO_API } from '../_constants/enrollment-form.constants';
import type { DirectEnrollmentFormValues } from '../_schemas/enrollment-form.schema';

/** 2-digit JIS X 0401 code ("01"–"47") — `PREFECTURES` is in JIS order. */
export function toPrefectureCode(prefecture: string): string | null {
  const index = (PREFECTURES as readonly string[]).indexOf(prefecture);
  return index < 0 ? null : String(index + 1).padStart(2, '0');
}

/** JP domestic number without hyphens, as the API expects. */
function digitsOnly(value: string): string {
  return value.replace(/-/g, '');
}

export function toAddressDto(
  address: DirectEnrollmentFormValues['applicant']['address'],
): CreateApplicationAddressDto | null {
  const prefectureCode = toPrefectureCode(address.prefecture);
  if (!prefectureCode || !address.postal_code || !address.street_address) return null;
  return {
    postalCode: digitsOnly(address.postal_code),
    prefectureCode,
    streetAddress: address.street_address.trim(),
    ...(address.building?.trim() ? { building: address.building.trim() } : {}),
  };
}

/**
 * Blacklist pre-check body, or null while a required key is still missing.
 * B14 (decided 2026-10-07): the API requires all five keys; C-01 FR-M003 matches on any one (OR).
 */
export function toPrecheckBody(
  applicant: Pick<
    DirectEnrollmentFormValues['applicant'],
    'family_name' | 'given_name' | 'birth_date' | 'phone' | 'email' | 'address'
  >,
): BlacklistPrecheckDto | null {
  const { family_name, given_name, birth_date, phone, email } = applicant;
  if (!family_name || !given_name || !birth_date || !phone || !email) return null;
  const address = toAddressDto(applicant.address);
  return {
    lastName: family_name.trim(),
    firstName: given_name.trim(),
    dateOfBirth: birth_date,
    phoneNumber: digitsOnly(phone),
    email: email.trim(),
    ...(address ? { address } : {}),
  };
}

/**
 * Admin-screen enrolment (FR-M009 / FR-M010, integration-plan.md D12). Filed as `proxy` —
 * C-01 records every admin enrolment as a proxy application — with the signed-in staff as
 * the proxy and the 合意日時 as the agreement time.
 *
 * 規約同意: one `termsConsents` row per agreed terms document, consented at the 合意日時
 * (staff-confirmed, FR-M010). Not sent: the 入会金 master selection (B12).
 */
export function toCreateApplicationBody(
  values: DirectEnrollmentFormValues,
  context: {
    staffId: string;
    promotionCodeId: string | null;
    isMinor: boolean;
    /** The terms documents shown on the form — every one is agreed before submit. */
    termsDocumentIds: string[];
  },
): CreateApplicationDto {
  const { applicant, contract, consent } = values;
  const address = toAddressDto(applicant.address);
  const paymentMethod = PAYMENT_METHOD_TO_API[contract.payment_method];

  return {
    applicationSource: 'proxy',
    member: {
      lastName: applicant.family_name.trim(),
      firstName: applicant.given_name.trim(),
      lastNameKana: applicant.family_name_kana.trim(),
      firstNameKana: applicant.given_name_kana.trim(),
      dateOfBirth: applicant.birth_date,
      gender: GENDER_TO_API[applicant.gender],
      phoneNumber: digitsOnly(applicant.phone),
      email: applicant.email.trim(),
      // The schema guarantees a complete address before submit.
      address: address ?? { postalCode: '', prefectureCode: '', streetAddress: '' },
      facePhotoS3Key: applicant.face_photo_id,
    },
    storeId: contract.store_id,
    campaignId: contract.campaign_id,
    planId: contract.plan_id,
    usageStartDate: contract.usage_start_date,
    paymentMethod,
    ...(paymentMethod === 'sbps_credit' ? { sbpsCardToken: contract.card_token.trim() } : {}),
    // TODO(round2) B20 — temporary JACCS fields, sent only when entered.
    ...(paymentMethod === 'jaccs_bank' && contract.jaccs_contractor_number.trim()
      ? { jaccsContractorNumber: contract.jaccs_contractor_number.trim() }
      : {}),
    ...(paymentMethod === 'jaccs_bank' && contract.jaccs_callback_status
      ? { jaccsCallbackStatus: contract.jaccs_callback_status }
      : {}),
    ...(context.promotionCodeId ? { promotionCodeId: context.promotionCodeId } : {}),
    ...(context.isMinor && consent.guardian_name.trim() && consent.guardian_consent_at
      ? {
          parentName: consent.guardian_name.trim(),
          parentApprovalAt: consent.guardian_consent_at,
        }
      : {}),
    proxyStaffId: context.staffId,
    proxyAgreedAt: consent.agreement_datetime,
    termsConsents: context.termsDocumentIds
      .filter((id) => consent.terms[id])
      .map((termsDocumentId) => ({
        termsDocumentId,
        consentedAt: consent.agreement_datetime,
      })),
  };
}
