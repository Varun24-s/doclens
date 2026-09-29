import { Pool } from 'pg';

// Maintain a single pool instance across reloads in development
const globalForDb = globalThis as unknown as {
  dbPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL is not set in environment variables.');
}

export const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || connectionString?.includes('supabase')
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
 * Initializes database schema (tables and pgvector extension) if not already created.
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
