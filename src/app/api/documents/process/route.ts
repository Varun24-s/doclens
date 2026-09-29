import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf';
import { chunkDocumentPages } from '@/lib/chunking';
import { generateEmbeddings } from '@/lib/embeddings';
import { createDocument, initDatabase, insertDocumentChunks, updateDocumentStatus } from '@/lib/db';
import { DocumentChunk } from '@/types';

// Max allowed file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Ensure database tables exist
    await initDatabase();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided. Please select a PDF file to upload.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF documents (.pdf) are supported.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of 10 MB (uploaded file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).` },
        { status: 400 }
      );
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filename = file.name;

    // 1. Create document record in PostgreSQL
    const docRecord = await createDocument(documentId, filename);

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Extract text page-by-page
    let pages;
    try {
      pages = await extractTextFromPDF(buffer);
    } catch (pdfErr: any) {
      await updateDocumentStatus(documentId, 'error');
      return NextResponse.json(
        { error: pdfErr.message || 'Failed to extract text from PDF document.' },
        { status: 422 }
      );
    }

    // 3. Chunk text into page-aware segments
    const rawChunks = chunkDocumentPages(documentId, pages);

    if (rawChunks.length === 0) {
      await updateDocumentStatus(documentId, 'error');
      return NextResponse.json(
        { error: 'Document yielded no readable text chunks after extraction.' },
        { status: 422 }
      );
    }

    // 4. Generate vector embeddings for chunks
    const chunkTexts = rawChunks.map((c) => c.content);
    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(chunkTexts);
    } catch (embErr: any) {
      await updateDocumentStatus(documentId, 'error');
      return NextResponse.json(
        { error: `Embedding generation failed: ${embErr.message}` },
        { status: 500 }
      );
    }

    // 5. Combine raw chunks with embeddings and insert into PostgreSQL pgvector
    const documentChunks: DocumentChunk[] = rawChunks.map((chunk, index) => ({
      ...chunk,
      id: `${documentId}_chunk_${index}`,
      embedding: embeddings[index],
    }));

    await insertDocumentChunks(documentChunks);

    // 6. Update document status to ready
    await updateDocumentStatus(documentId, 'ready');

    return NextResponse.json({
      success: true,
      document: {
        ...docRecord,
        status: 'ready',
      },
      chunkCount: documentChunks.length,
      pageCount: pages.length,
    });
  } catch (error: any) {
    console.error('Unhandled error in /api/documents/process:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected server error occurred during document processing.' },
      { status: 500 }
    );
  }
}
