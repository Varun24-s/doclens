import { Pool } from 'pg';
import { Document, DocumentChunk, DocumentStatus, RetrievedChunk } from '@/types';

// Maintain a single pool instance across hot reloads in development
const globalForDb = globalThis as unknown as {
  dbPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

export const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === 'production' || connectionString?.includes('supabase')
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPool = pool;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
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
 * Initializes database tables and pgvector extension if not already present.
 */
export async function initDatabase(): Promise<void> {
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
}

/**
 * Inserts a new document metadata record.
 */
export async function createDocument(id: string, filename: string): Promise<Document> {
  const rows = await query<Document>(
    `INSERT INTO documents (id, filename, status) VALUES ($1, $2, 'processing') RETURNING *;`,
    [id, filename]
  );
  return rows[0];
}

/**
 * Updates the processing status of a document.
 */
export async function updateDocumentStatus(id: string, status: DocumentStatus): Promise<void> {
  await query(`UPDATE documents SET status = $1 WHERE id = $2;`, [status, id]);
}

/**
 * Retrieves a document record by ID.
 */
export async function getDocumentById(id: string): Promise<Document | null> {
  const rows = await query<Document>(`SELECT * FROM documents WHERE id = $1;`, [id]);
  return rows[0] || null;
}

/**
 * Inserts processed text chunks with vector embeddings into PostgreSQL.
 */
export async function insertDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
  if (chunks.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const chunk of chunks) {
      if (!chunk.embedding) {
        throw new Error(`Chunk at index ${chunk.chunkIndex} is missing an embedding vector.`);
      }
      const vectorStr = `[${chunk.embedding.join(',')}]`;
      await client.query(
        `INSERT INTO document_chunks (id, document_id, page_number, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [chunk.id, chunk.documentId, chunk.pageNumber, chunk.chunkIndex, chunk.content, vectorStr]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Performs vector cosine similarity search in PostgreSQL using pgvector.
 */
export async function searchChunksByEmbedding(
  documentId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
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

  return rows.map((r) => ({
    id: r.id,
    pageNumber: Number(r.pageNumber),
    chunkIndex: Number(r.chunkIndex),
    content: r.content,
    similarity: Number(r.similarity),
  }));
}
