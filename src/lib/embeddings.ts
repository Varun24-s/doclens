import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

function getOpenAIClient(): OpenAI | null {
  if (!apiKey || apiKey.includes('your_openai_api_key_here')) {
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });
}

/**
 * Deterministic fallback vector generator for local demo mode without an OpenAI API key.
 * Creates a normalized 1536-dimensional frequency vector.
 */
function createFallbackEmbedding(text: string): number[] {
  const vector = new Array(1536).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash * 31 + word.charCodeAt(c)) % 1536;
    }
    const idx = Math.abs(hash);
    vector[idx] += 1.0;
  }

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < 1536; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < 1536; i++) {
      vector[i] /= norm;
    }
  } else {
    vector[0] = 1.0;
  }

  return vector;
}

/**
 * Generates 1536-dimensional vector embeddings for an array of text chunks.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openai = getOpenAIClient();
  if (!openai) {
    console.log('ℹ️ Generating local deterministic embeddings (OPENAI_API_KEY not set).');
    return texts.map((t) => createFallbackEmbedding(t));
  }

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
      console.warn(`Embedding API call failed (${error.message}). Falling back to local embeddings.`);
      return texts.map((t) => createFallbackEmbedding(t));
    }
  }

  return allEmbeddings;
}

/**
 * Generates a vector embedding for a user search query.
 */
export async function generateQueryEmbedding(queryText: string): Promise<number[]> {
  const trimmed = queryText.trim();
  if (!trimmed) {
    throw new Error('Query text cannot be empty.');
  }

  const results = await generateEmbeddings([trimmed]);
  return results[0] || createFallbackEmbedding(trimmed);
}
