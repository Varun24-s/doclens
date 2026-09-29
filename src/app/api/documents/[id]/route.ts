import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
    }

    const doc = await getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch (error: any) {
    console.error(`Error fetching document ${req.url}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch document status.' },
      { status: 500 }
    );
  }
}
