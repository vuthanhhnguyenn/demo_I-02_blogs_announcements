import { proxyAgreedAtSchema } from '../../../_schemas/proxy-agreement.schema';

/** Field message for 合意日時 (header FR-005 window), or `undefined` when it is empty or valid. */
export function getProxyAgreedAtError(agreedAt: Date | undefined): string | undefined {
  if (!agreedAt) return undefined;
  const result = proxyAgreedAtSchema.safeParse(agreedAt.toISOString());
  return result.success ? undefined : result.error.issues[0]?.message;
}
