import { RetrievedChunk } from '@/types';
import { searchChunksByEmbedding } from './db';

/**
 * Retrieves the top-K most semantically relevant document chunks for a query embedding vector.
 *
 * @param documentId - Target document ID
 * @param queryEmbedding - 1536-dimensional query embedding vector
 * @param topK - Number of top chunks to retrieve (default: 5)
 * @returns Array of RetrievedChunk objects with similarity scores and page numbers
 */
export async function retrieveRelevantChunks(
  documentId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (!documentId) {
    throw new Error('documentId is required for chunk retrieval.');
  }

  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error('queryEmbedding vector cannot be empty.');
  }

  try {
    const results = await searchChunksByEmbedding(documentId, queryEmbedding, topK);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Retrieval] Found ${results.length} chunks for document ${documentId}`);
      results.forEach((r, idx) => {
        console.log(`  [${idx + 1}] Page ${r.pageNumber} (similarity: ${r.similarity.toFixed(4)}): "${r.content.slice(0, 60)}..."`);
      });
    }

    return results;
  } catch (error: any) {
    console.error('Error during semantic chunk retrieval:', error);
    throw new Error(`Semantic retrieval failed: ${error.message || 'Database query error'}`);
  }
}
