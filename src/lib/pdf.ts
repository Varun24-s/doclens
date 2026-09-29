// Polyfill browser graphics primitives required by PDF rendering engines in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length >= 6) {
        this.a = init[0]; this.b = init[1]; this.c = init[2];
        this.d = init[3]; this.e = init[4]; this.f = init[5];
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    invert() { return this; }
    transformPoint() { return { x: 0, y: 0 }; }
  };
}

if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}

if (typeof globalThis.Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {};
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extracts text page-by-page from a PDF file buffer.
 *
 * @param pdfBuffer - Raw Buffer of the uploaded PDF file
 * @returns Array of extracted pages with page numbers and text content
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<ExtractedPage[]> {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('PDF buffer is empty or invalid.');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfModule = require('pdf-parse');
  const pages: ExtractedPage[] = [];

  try {
    if (pdfModule.PDFParse) {
      // Modern PDFParse class API
      const parser = new pdfModule.PDFParse({ data: new Uint8Array(pdfBuffer) });
      const textResult = await parser.getText();

      if (textResult && Array.isArray(textResult.pages)) {
        textResult.pages.forEach((p: any, idx: number) => {
          const rawText = typeof p === 'string' ? p : p.text || '';
          const cleanedText = rawText.replace(/\s+/g, ' ').trim();
          if (cleanedText) {
            pages.push({
              pageNumber: idx + 1,
              text: cleanedText,
            });
          }
        });
      } else if (textResult && typeof textResult.text === 'string') {
        const cleanedText = textResult.text.replace(/\s+/g, ' ').trim();
        if (cleanedText) {
          pages.push({
            pageNumber: 1,
            text: cleanedText,
          });
        }
      }
    } else {
      // Legacy function API
      const renderPage = (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | undefined;
          let pageText = '';

          for (const item of textContent.items) {
            if (lastY === undefined || Math.abs(lastY - item.transform[5]) < 2) {
              pageText += item.str;
            } else {
              pageText += '\n' + item.str;
            }
            lastY = item.transform[5];
          }

          const cleanedText = pageText.replace(/\s+/g, ' ').trim();
          if (cleanedText.length > 0) {
            pages.push({
              pageNumber: pageData.pageIndex + 1,
              text: cleanedText,
            });
          }

          return pageText;
        });
      };

      const parseFn = typeof pdfModule === 'function' ? pdfModule : pdfModule.default;
      await parseFn(pdfBuffer, { pagerender: renderPage });
    }
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message || 'Corrupted or encrypted PDF'}`);
  }

  if (pages.length === 0) {
    throw new Error('No extractable text found in PDF. The document might be scanned images or empty.');
  }

  return pages;
}
