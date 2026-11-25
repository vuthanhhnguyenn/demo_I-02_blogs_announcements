import { client } from '@/lib/api-real/client.gen';
import type { AdminExerciseImageDto } from '@/lib/api-real/types.gen';

/**
 * The asset route of a stored media key on the real-API host (`/api/v1/media/assets/{key}`).
 * Without a signature it answers 401 to an `<img>`, so it is only the fallback for a key the API
 * did not sign. A value that is already an absolute URL is returned as is.
 */
export function exerciseMediaUrl(key: string): string {
  if (/^https?:\/\//.test(key)) return key;
  const baseUrl = (client.getConfig().baseUrl ?? '').replace(/\/+$/, '');
  const path = key.split('/').map(encodeURIComponent).join('/');
  return `${baseUrl}/api/v1/media/assets/${path}`;
}

/** A stored image's `<img>` source: the self-signed `imageUrl` (BE_REQUEST No.12). */
export function exerciseImageSrc(image: Pick<AdminExerciseImageDto, 'imageUrl' | 'imageS3Key'>) {
  return image.imageUrl || exerciseMediaUrl(image.imageS3Key);
}
