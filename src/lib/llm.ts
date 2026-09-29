import { RetrievedChunk, ChatResponse } from '@/types';

/**
 * Generates grounded answers with page citations using OpenAI Chat API.
 * (Full implementation added in Phase 6)
 */
export async function generateAnswer(
  userQuestion: string,
  contextChunks: RetrievedChunk[]
): Promise<ChatResponse> {
  // Stub implementation for Phase 1
  return {
    answer: "Stub response for Phase 1",
    sources: [],
  };
}
