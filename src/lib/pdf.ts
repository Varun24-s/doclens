/**
 * Interface representing extracted text per page from a PDF file.
 */
export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extracts text content page-by-page from a PDF Buffer.
 * (Full implementation added in Phase 2)
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<ExtractedPage[]> {
  // Stub implementation for Phase 1
  return [];
}
