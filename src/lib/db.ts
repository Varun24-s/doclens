import { Pool } from 'pg';
import { Document, DocumentChunk, DocumentStatus, RetrievedChunk } from '@/types';

// In-memory database fallback for local demo when DATABASE_URL is not set
const inMemoryDocuments = new Map<string, Document>();
const inMemoryChunks: DocumentChunk[] = [];

const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  dbPool: Pool | undefined;
};

export const pool =
  connectionString
    ? (globalForDb.dbPool ??
       new Pool({
         connectionString,
         ssl:
           process.env.NODE_ENV === 'production' || connectionString.includes('supabase')
             ? { rejectUnauthorized: false }
             : false,
         max: 10,
         idleTimeoutMillis: 30000,
         connectionTimeoutMillis: 5000,
       }))
    : null;

if (process.env.NODE_ENV !== 'production' && pool) {
  globalForDb.dbPool = pool;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  if (!pool) {
    throw new Error('No PostgreSQL connection pool available.');
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`Executed query (${duration}ms):`, text.substring(0, 80).replace(/\s+/g, ' '));
    }
    return res.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Initializes database tables and pgvector extension if PostgreSQL is connected.
 */
export async function initDatabase(): Promise<void> {
  if (!pool) {
    console.log('ℹ️ Running DocLens in in-memory mode (DATABASE_URL not set).');
    return;
  }
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    
    await query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'processing'
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
      ON document_chunks 
      USING hnsw (embedding vector_cosine_ops);
    `);
  } catch (err) {
    console.warn('⚠️ Could not connect to PostgreSQL database. Falling back to in-memory mode.', err);
  }
}

/**
 * Inserts a new document metadata record.
 */
export async function createDocument(id: string, filename: string): Promise<Document> {
  const doc: Document = {
    id,
    filename,
    created_at: new Date().toISOString(),
    status: 'processing',
  };

  if (pool) {
    try {
      const rows = await query<Document>(
        `INSERT INTO documents (id, filename, status) VALUES ($1, $2, 'processing') RETURNING *;`,
        [id, filename]
      );
      return rows[0] || doc;
    } catch {
      // Fallback to in-memory
    }
  }

  inMemoryDocuments.set(id, doc);
  return doc;
}

/**
 * Updates the processing status of a document.
 */
export async function updateDocumentStatus(id: string, status: DocumentStatus): Promise<void> {
  if (pool) {
    try {
      await query(`UPDATE documents SET status = $1 WHERE id = $2;`, [status, id]);
      return;
    } catch {
      // Fallback
    }
  }

  const doc = inMemoryDocuments.get(id);
  if (doc) {
    doc.status = status;
    inMemoryDocuments.set(id, doc);
  }
}

/**
 * Retrieves a document record by ID.
 */
export async function getDocumentById(id: string): Promise<Document | null> {
  if (pool) {
    try {
      const rows = await query<Document>(`SELECT * FROM documents WHERE id = $1;`, [id]);
      if (rows[0]) return rows[0];
    } catch {
      // Fallback
    }
  }

  return inMemoryDocuments.get(id) || null;
}

/**
 * Inserts processed text chunks with vector embeddings into PostgreSQL (or in-memory store).
 */
export async function insertDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
  if (chunks.length === 0) return;

  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const chunk of chunks) {
          const vectorStr = `[${(chunk.embedding || []).join(',')}]`;
          await client.query(
            `INSERT INTO document_chunks (id, document_id, page_number, chunk_index, content, embedding)
             VALUES ($1, $2, $3, $4, $5, $6::vector)`,
            [chunk.id, chunk.documentId, chunk.pageNumber, chunk.chunkIndex, chunk.content, vectorStr]
          );
        }
        await client.query('COMMIT');
        return;
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('⚠️ Postgres insert failed, saving in-memory:', err);
      } finally {
        client.release();
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  inMemoryChunks.push(...chunks);
}

/**
 * Cosine similarity helper for in-memory vector search
 */
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Performs vector similarity search using PostgreSQL pgvector (or in-memory cosine calculation).
 */
export async function searchChunksByEmbedding(
  documentId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (pool) {
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const rows = await query<{
        id: string;
        pageNumber: number;
        chunkIndex: number;
        content: string;
        similarity: number;
      }>(
        `SELECT 
            id, 
            page_number AS "pageNumber", 
            chunk_index AS "chunkIndex", 
            content, 
            1 - (embedding <=> $1::vector) AS similarity
         FROM document_chunks
         WHERE document_id = $2
         ORDER BY embedding <=> $1::vector ASC
         LIMIT $3;`,
        [vectorStr, documentId, topK]
      );

      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          pageNumber: Number(r.pageNumber),
          chunkIndex: Number(r.chunkIndex),
          content: r.content,
          similarity: Number(r.similarity),
        }));
      }
    } catch {
      // Fallback
    }
  }

  // In-memory similarity search
  const docChunks = inMemoryChunks.filter((c) => c.documentId === documentId);
  const scored = docChunks.map((chunk) => {
    const similarity = chunk.embedding
      ? calculateCosineSimilarity(queryEmbedding, chunk.embedding)
      : 0;
    return {
      id: chunk.id,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      similarity,
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}
