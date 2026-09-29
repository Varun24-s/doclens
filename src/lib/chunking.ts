import { RawChunk } from '@/types';
import { ExtractedPage } from './pdf';

/**
 * Splitting strategy configuration options
 */
export interface ChunkingOptions {
  targetChunkSize?: number; // Target chunk character length (~500 chars / ~100 words)
  overlap?: number;         // Overlap between consecutive chunks (~100 chars)
}

/**
 * Splits extracted PDF pages into text chunks while preserving exact page numbers.
 * Uses a sliding window over sentences/paragraphs with overlap.
 *
 * @param documentId - Unique identifier of the target document
 * @param pages - Array of extracted page objects containing page numbers and text
 * @param options - Custom chunk size and overlap parameters
 * @returns Array of RawChunk objects with pageNumber, chunkIndex, and content
 */
export function chunkDocumentPages(
  documentId: string,
  pages: ExtractedPage[],
  options: ChunkingOptions = {}
): RawChunk[] {
  const targetChunkSize = options.targetChunkSize ?? 500;
  const overlap = options.overlap ?? 100;

  const chunks: RawChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    // Split page text into sentences / logical units
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];

    let currentChunkText = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;

      if ((currentChunkText + ' ' + sentence).length > targetChunkSize && currentChunkText.length > 0) {
        // Save current chunk
        chunks.push({
          documentId,
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex++,
          content: currentChunkText.trim(),
        });

        // Compute overlap for next chunk
        const words = currentChunkText.split(' ');
        let overlapText = '';
        for (let w = words.length - 1; w >= 0; w--) {
          if ((words[w] + ' ' + overlapText).length <= overlap) {
            overlapText = words[w] + ' ' + overlapText;
          } else {
            break;
          }
        }

        currentChunkText = overlapText.trim() + ' ' + sentence;
      } else {
        currentChunkText = currentChunkText
          ? currentChunkText + ' ' + sentence
          : sentence;
      }
    }

    // Flush any remaining text for this page
    if (currentChunkText.trim().length > 0) {
      chunks.push({
        documentId,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        content: currentChunkText.trim(),
      });
    }
  }

  return chunks;
}
