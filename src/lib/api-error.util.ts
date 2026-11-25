/**
 * Reading HTTP status off a failed API call.
 *
 * The generated client throws the *parsed response body* — not an `Error`, not the
 * `Response` — so the HTTP status is lost by the time a screen sees the rejection
 * (`src/lib/api/client/client.gen.ts`). The app's error interceptor
 * (`src/hooks/useClientRequest.ts`) puts it back under `status`; these helpers are the
 * supported way to read it, so no screen has to guess the error's shape again.
 *
 * Lives outside `src/lib/api/` on purpose: that directory is regenerated wholesale by
 * `npm run generate-api`, which would delete anything hand-written inside it.
 */

/** An error body enriched by the interceptor. */
export interface ApiErrorWithStatus {
  /** HTTP status of the failed response. */
  status: number;
  [key: string]: unknown;
}

export function isApiErrorWithStatus(error: unknown): error is ApiErrorWithStatus {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}

/** HTTP status of a failed call, or `undefined` when the rejection carries none. */
export function getApiErrorStatus(error: unknown): number | undefined {
  return isApiErrorWithStatus(error) ? error.status : undefined;
}

/**
 * The backend's `ErrorResponseDto.code` (`E-STF-010`, `E-LSB-030`, …) off a failed call,
 * or `undefined` for transport errors and bodies without one. Screens branch on this —
 * never on Japanese message substrings.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/**
 * Whether a detail fetch failed because the record does not exist: `404`, or a `400` whose
 * validation error names the path id (the real API checks the id's UUID format first, so
 * `/xxx/abc` answers `400 E-VAL-001 setId must be a UUID` rather than `404`).
 */
export function isRecordNotFoundError(error: unknown, idField: string): boolean {
  const status = getApiErrorStatus(error);
  if (status === 404) return true;
  if (status !== 400) return false;
  const details = (error as { details?: unknown }).details;
  return (
    Array.isArray(details) &&
    details.some(
      (detail) =>
        typeof detail === 'object' &&
        detail !== null &&
        (detail as { field?: unknown }).field === idField,
    )
  );
}

/** Default when the rejection carries nothing an operator could act on. */
export const API_ERROR_FALLBACK_MESSAGE = 'エラーが発生しました。後で再試行してください。';

/**
 * Attaches the response status to an error body. Only plain objects are enriched: a
 * non-JSON body arrives as a string and is left untouched, so nothing that reads the raw
 * body changes shape. Applied by the error interceptor, not called by screens.
 */
export function withApiErrorStatus(error: unknown, status: number): unknown {
  if (typeof error !== 'object' || error === null || Array.isArray(error)) {
    return error;
  }
  return { ...error, status };
}

/**
 * Japanese wording per HTTP status, used when the backend gave us nothing usable.
 *
 * The real API is supposed to carry `userMessage` (Japanese) on every error, but some
 * responses only carry the developer-facing English `message` (e.g. a 404's
 * "Resource not found"). Showing that verbatim put English in front of Japanese
 * operators, so it is never used as toast copy — this table stands in instead.
 */
const API_ERROR_MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'リクエストの内容が正しくありません。入力内容をご確認ください。',
  401: 'セッションの有効期限が切れました。再度ログインしてください。',
  403: 'この操作を行う権限がありません。',
  404: '対象のデータが見つかりませんでした。',
  409: '他の操作と競合したため処理できませんでした。画面を再読み込みしてお試しください。',
  422: '入力内容が処理できませんでした。内容をご確認ください。',
  429: 'リクエストが多すぎます。しばらくしてから再度お試しください。',
  500: 'システムエラーが発生しました。しばらくしてから再度お試しください。',
  502: 'システムエラーが発生しました。しばらくしてから再度お試しください。',
  503: '現在サービスをご利用いただけません。しばらくしてから再度お試しください。',
};

/**
 * The message to show the operator for a failed API call — the one way a screen words a
 * failure, so no call site carries copy of its own.
 *
 * Priority: the real API's `userMessage` → a Japanese message chosen by HTTP status →
 * the generic fallback. Nothing else in the body is read: the backend's `message` is
 * developer-facing English, and a raw throwable's `message` is a technical string.
 */
export function resolveApiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const body = error as { userMessage?: unknown };
    if (typeof body.userMessage === 'string' && body.userMessage.length > 0) {
      return body.userMessage;
    }
  }

  const status = getApiErrorStatus(error);
  return (
    (status != null ? API_ERROR_MESSAGE_BY_STATUS[status] : undefined) ?? API_ERROR_FALLBACK_MESSAGE
  );
}
