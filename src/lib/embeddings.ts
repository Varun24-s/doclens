import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// Initialize OpenAI client lazily
function getOpenAIClient(): OpenAI {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }
  return new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });
}

/**
 * Generates 1536-dimensional vector embeddings for an array of text chunks.
 * Processes texts in batches of 20 to avoid payload size limits.
 *
 * @param texts - Array of string content to embed
 * @returns Array of embedding vector arrays (number[])
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openai = getOpenAIClient();
  const batchSize = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const response = await openai.embeddings.create({
        model: embeddingModel,
        input: batch,
      });

      const embeddings = response.data.map((item) => item.embedding);
      allEmbeddings.push(...embeddings);
    } catch (error: any) {
      console.error(`Error generating embeddings for batch starting at ${i}:`, error);
      throw new Error(`Embedding API failure: ${error.message || 'Failed to generate embeddings'}`);
    }
  }

  return allEmbeddings;
}

/**
 * Generates a vector embedding for a user search query.
 *
 * @param queryText - Search question from the user
 * @returns 1536-dimensional vector array
 */
export async function generateQueryEmbedding(queryText: string): Promise<number[]> {
  const trimmed = queryText.trim();
  if (!trimmed) {
    throw new Error('Query text cannot be empty.');
  }

  const results = await generateEmbeddings([trimmed]);
  if (!results[0]) {
    throw new Error('Failed to generate query embedding.');
  }

  return results[0];
}
