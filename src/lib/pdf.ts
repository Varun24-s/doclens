export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extracts text page-by-page from a PDF file buffer using custom page rendering.
 *
 * @param pdfBuffer - Raw Buffer of the uploaded PDF file
 * @returns Array of extracted pages with page numbers and text content
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<ExtractedPage[]> {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('PDF buffer is empty or invalid.');
  }

  // Require pdf-parse dynamically inside the function execution block
  // to avoid build-time module evaluation issues in Next.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');

  const pages: ExtractedPage[] = [];

  // Custom page render callback to preserve page numbers
  const renderPage = (pageData: any) => {
    return pageData.getTextContent().then((textContent: any) => {
      let lastY: number | undefined;
      let pageText = '';

      for (const item of textContent.items) {
        // Add newline when vertical Y position changes significantly (line break)
        if (lastY === undefined || Math.abs(lastY - item.transform[5]) < 2) {
          pageText += item.str;
        } else {
          pageText += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      const cleanedText = pageText
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanedText.length > 0) {
        pages.push({
          pageNumber: pageData.pageIndex + 1,
          text: cleanedText,
        });
      }

      return pageText;
    });
  };

  try {
    await pdfParse(pdfBuffer, { pagerender: renderPage });
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message || 'Corrupted or encrypted PDF'}`);
  }

  if (pages.length === 0) {
    throw new Error('No extractable text found in PDF. The document might be scanned images or empty.');
  }

  return pages;
}
