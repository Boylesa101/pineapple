import 'server-only';
import type { FileItem } from '@/components/file-manager';
import { isPreviewable, signedFileUrl, type MediaRow } from '@/lib/onboarding';

// Signed links for a list of files: an inline preview for checked JPEG/PNG/WebP images, and a
// download link (always Content-Disposition: attachment) for every checked file.
export async function withFileUrls(media: MediaRow[]): Promise<FileItem[]> {
  return Promise.all(
    media.map(async (m) => ({
      id: m.id,
      kind: m.kind,
      original_name: m.original_name,
      size_bytes: m.size_bytes,
      label: m.label,
      alt_text: m.alt_text,
      status: m.status,
      previewUrl: isPreviewable(m) ? await signedFileUrl(m.storage_path) : null,
      downloadUrl: m.status === 'clean' ? await signedFileUrl(m.storage_path, { download: m.original_name }) : null,
    })),
  );
}
