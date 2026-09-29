import { RetrievedChunk } from '@/types';

/**
 * Retrieves top K most relevant document chunks using vector similarity in pgvector.
 * (Full implementation added in Phase 5)
 */
export async function retrieveRelevantChunks(
  documentId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  // Stub implementation for Phase 1
  return [];
}
