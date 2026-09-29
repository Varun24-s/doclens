import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/lib/db';
import { generateQueryEmbedding } from '@/lib/embeddings';
import { retrieveRelevantChunks } from '@/lib/retrieval';
import { generateAnswer } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, question } = body;

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: documentId is required.' },
        { status: 400 }
      );
    }

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Invalid request: question text cannot be empty.' },
        { status: 400 }
      );
    }

    // 1. Verify document existence and ready status
    const docRecord = await getDocumentById(documentId);
    if (!docRecord) {
      return NextResponse.json(
        { error: 'Document not found. Please upload a document first.' },
        { status: 404 }
      );
    }

    if (docRecord.status !== 'ready') {
      return NextResponse.json(
        { error: `Document is not ready yet (current status: ${docRecord.status}). Please wait for processing to finish.` },
        { status: 400 }
      );
    }

    // 2. Generate vector embedding for the user's question
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateQueryEmbedding(question.trim());
    } catch (embError: any) {
      return NextResponse.json(
        { error: `Failed to embed search question: ${embError.message}` },
        { status: 500 }
      );
    }

    // 3. Perform pgvector cosine similarity search (Top K = 5)
    const contextChunks = await retrieveRelevantChunks(documentId, queryEmbedding, 5);

    // 4. Generate RAG answer with page citations via LLM
    const chatResult = await generateAnswer(question.trim(), contextChunks);

    return NextResponse.json(chatResult);
  } catch (error: any) {
    console.error('Unhandled error in /api/chat:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while processing your question.' },
      { status: 500 }
    );
  }
}
