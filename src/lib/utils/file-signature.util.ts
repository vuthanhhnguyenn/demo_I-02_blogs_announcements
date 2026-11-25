export type SignedMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export type FileProblem = 'empty' | 'size' | 'type';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46]; // "RIFF" at 0, "WEBP" at 8
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

const HEAD_LENGTH = 12;

const hasBytesAt = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

function sniffFileType(head: Uint8Array): SignedMimeType | null {
  if (hasBytesAt(head, PNG_SIGNATURE)) return 'image/png';
  if (hasBytesAt(head, JPEG_SIGNATURE)) return 'image/jpeg';
  if (hasBytesAt(head, RIFF_SIGNATURE) && hasBytesAt(head, WEBP_SIGNATURE, 8)) return 'image/webp';
  if (hasBytesAt(head, PDF_SIGNATURE)) return 'application/pdf';
  return null;
}

interface FileRules {
  readonly acceptedTypes: readonly SignedMimeType[];
  readonly maxSizeMB: number;
}

/**
 * Shared gate for every file picker (images, PDF). Returns what is wrong with the file, or null
 * when it is fine.
 *
 * `File.type` is derived from the extension by the browser, so a renamed file still reports
 * `image/png` / `application/pdf`. The type is therefore also checked against the file's leading
 * bytes (magic number), which renaming cannot fake. A content/declared-type mismatch is a `'type'`
 * problem.
 */
export async function findFileProblem(
  file: File,
  { acceptedTypes, maxSizeMB }: FileRules,
): Promise<FileProblem | null> {
  if (!(acceptedTypes as readonly string[]).includes(file.type)) return 'type';
  if (file.size === 0) return 'empty';
  if (file.size > maxSizeMB * 1024 * 1024) return 'size';

  const head = new Uint8Array(await file.slice(0, HEAD_LENGTH).arrayBuffer());
  const actual = sniffFileType(head);
  return actual !== null && actual === file.type ? null : 'type';
}
