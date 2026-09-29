import { getDocumentProxy } from 'unpdf';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extracts text page-by-page from a PDF file buffer using unpdf.
 *
 * @param pdfBuffer - Raw Buffer of the uploaded PDF file
 * @returns Array of extracted pages with page numbers and text content
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<ExtractedPage[]> {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('PDF buffer is empty or invalid.');
  }

  const pages: ExtractedPage[] = [];

  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdf = await getDocumentProxy(uint8Array);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      const pageText = content.items
        .map((item: any) => item.str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText.length > 0) {
        pages.push({
          pageNumber: i,
          text: pageText,
        });
      }
    }
  } catch (error: any) {
    console.error('Error parsing PDF with unpdf:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message || 'Corrupted or encrypted PDF'}`);
  }

  if (pages.length === 0) {
    throw new Error('No extractable text found in PDF. The document might be scanned images or empty.');
  }

  return pages;
}
