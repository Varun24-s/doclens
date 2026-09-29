import OpenAI from 'openai';
import { RetrievedChunk, ChatResponse, SourceCitation } from '@/types';

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const chatModel = process.env.CHAT_MODEL || 'gpt-4o-mini';

function getOpenAIClient(): OpenAI | null {
  if (!apiKey || apiKey.includes('your_openai_api_key_here')) {
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });
}

const SYSTEM_PROMPT = `You are DocLens, a precise and concise document assistant answering questions strictly based on the provided document context.

RULES:
1. Use ONLY the supplied context chunks below to answer the user's question.
2. If the answer is not present in the context or cannot be inferred directly from it, state clearly: "I couldn't find enough information in this document to answer that."
3. Do not invent facts, fabricate citations, or rely on pre-existing external knowledge outside the provided document chunks.
4. Keep your answer clear, direct, and well-structured.
5. When referencing information, mention the page numbers naturally if helpful, but keep the answer focused on answering the user query.`;

/**
 * Generates a grounded RAG response using OpenAI Chat API (or local contextual synthesis fallback).
 */
export async function generateAnswer(
  userQuestion: string,
  contextChunks: RetrievedChunk[]
): Promise<ChatResponse> {
  if (!contextChunks || contextChunks.length === 0) {
    return {
      answer: "I couldn't find enough information in this document to answer that.",
      sources: [],
    };
  }

  const sources: SourceCitation[] = contextChunks.map((chunk) => ({
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    similarity: chunk.similarity,
  }));

  const openai = getOpenAIClient();
  if (!openai) {
    // Local grounded answer synthesis fallback for demo mode
    const bestChunk = contextChunks[0];
    const answer = `Based on page ${bestChunk.pageNumber} of the document:\n\n"${bestChunk.content}"`;
    return { answer, sources };
  }

  const formattedContext = contextChunks
    .map(
      (chunk, index) =>
        `--- CONTEXT CHUNK ${index + 1} [Page ${chunk.pageNumber}, Chunk ${chunk.chunkIndex}] ---\n${chunk.content}`
    )
    .join('\n\n');

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `DOCUMENT CONTEXT:\n${formattedContext}\n\nUSER QUESTION: ${userQuestion}`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: chatModel,
      messages,
      temperature: 0.2,
      max_tokens: 800,
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "I couldn't find enough information in this document to answer that.";

    return { answer, sources };
  } catch (error: any) {
    console.warn(`LLM API call failed (${error.message}). Using extracted context snippet.`);
    const bestChunk = contextChunks[0];
    const answer = `Based on retrieved section (Page ${bestChunk.pageNumber}):\n\n"${bestChunk.content}"`;
    return { answer, sources };
  }
}
