import { RawChunk } from '@/types';
import { ExtractedPage } from './pdf';

/**
 * Splits extracted page texts into overlapping chunks while preserving page numbers.
 * (Full implementation added in Phase 2)
 */
export function chunkDocumentPages(
  documentId: string,
  pages: ExtractedPage[],
  targetChunkSize = 500,
  overlap = 100
): RawChunk[] {
  // Stub implementation for Phase 1
  return [];
}
