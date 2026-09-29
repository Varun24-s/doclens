import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDocumentProxy } from 'unpdf';

async function testUnpdfDirect() {
  console.log('Generating PDF with pdf-lib...');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const page1 = pdfDoc.addPage([600, 400]);
  page1.drawText('Pure ALOHA protocol has a vulnerable period of 2T.', {
    x: 50,
    y: 350,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });

  // Page 2
  const page2 = pdfDoc.addPage([600, 400]);
  page2.drawText('Slotted ALOHA protocol reduces vulnerable period to T.', {
    x: 50,
    y: 350,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  const buffer = new Uint8Array(pdfBytes);

  console.log('Extracting page-by-page text using unpdf getDocumentProxy...');
  const pdf = await getDocumentProxy(buffer);
  console.log('Total PDF Pages:', pdf.numPages);

  const pages: { pageNumber: number; text: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      pages.push({
        pageNumber: i,
        text: pageText,
      });
    }
  }

  console.log('Extracted Pages:', pages);

  if (pages.length === 2 && pages[0].text.includes('Pure ALOHA') && pages[1].text.includes('Slotted ALOHA')) {
    console.log('✅ PERFECT! unpdf extracted all page text 100% reliably!');
  } else {
    console.error('❌ Mismatch:', pages);
    process.exit(1);
  }
}

testUnpdfDirect().catch((err) => {
  console.error('❌ Error during direct unpdf test:', err);
  process.exit(1);
});
