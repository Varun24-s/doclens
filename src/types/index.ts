export type DocumentStatus = 'processing' | 'ready' | 'error';

export interface Document {
  id: string;
  filename: string;
  created_at: string;
  status: DocumentStatus;
}

export interface RawChunk {
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
}

export interface DocumentChunk extends RawChunk {
  id: string;
  embedding?: number[];
  created_at?: string;
}

export interface RetrievedChunk {
  id: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface SourceCitation {
  pageNumber: number;
  chunkIndex: number;
  content: string;
  similarity?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  createdAt: Date;
}

export type ProcessingStage = 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'error';

export interface ProcessDocumentResponse {
  success: boolean;
  document: Document;
  chunkCount: number;
}

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
}
