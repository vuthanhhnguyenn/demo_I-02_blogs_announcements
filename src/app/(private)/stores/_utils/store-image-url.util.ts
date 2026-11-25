import { client } from '@/lib/api-real/client.gen';

/**
 * The fetchable URL of a stored store image (research R7).
 *
 * The asset route `/api/v1/media/assets/{s3Key}` only answers with a signed `exp`/`sig` query —
 * the bare path is 401. `GET /admin/stores/{id}/images` already returns that signed URL in
 * `url` (verified live 2026-10-05, and documented as the fetchable URL since the 2026-10-05 regen),
 * so it is used whenever it is absolute. The bare asset path is
 * only the fallback for a row that carries no signed URL.
 */
export function storeImageSrc({ s3Key, url }: { s3Key: string; url?: string | null }): string {
  if (url && /^https?:\/\//.test(url)) return url;
  return storeImageUrl(s3Key);
}

/**
 * The unsigned asset path — the route lives on the real-API host, not on the Next.js origin,
 * hence the client's `baseUrl` prefix (a bare `/api/v1/...` would hit this app's own mock API
 * routes). Each key segment is encoded on its own: the key is path-style
 * (`member-shared/store-image/{id}.jpg`) and its slashes must survive.
 */
function storeImageUrl(s3Key: string): string {
  const baseUrl = (client.getConfig().baseUrl ?? '').replace(/\/+$/, '');
  const path = s3Key.split('/').map(encodeURIComponent).join('/');
  return `${baseUrl}/api/v1/media/assets/${path}`;
}
