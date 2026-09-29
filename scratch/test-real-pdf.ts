import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import pdfParse from 'pdf-parse';

async function testRealPdf() {
  console.log('Generating valid uncompressed 2-page PDF with pdf-lib...');
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

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const buffer = Buffer.from(pdfBytes);

  console.log('Extracting text using pdf-parse v1.1.1...');
  const pages: { pageNumber: number; text: string }[] = [];

  const renderPage = (pageData: any) => {
    return pageData.getTextContent().then((textContent: any) => {
      let lastY: number | undefined;
      let text = '';
      for (const item of textContent.items) {
        if (lastY === undefined || Math.abs(lastY - item.transform[5]) < 2) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (cleaned) {
        pages.push({
          pageNumber: pageData.pageIndex + 1,
          text: cleaned,
        });
      }
      return text;
    });
  };

  const parsed = await pdfParse(buffer, { pagerender: renderPage });
  console.log('Total PDF Pages:', parsed.numpages);
  console.log('Extracted Pages Data:', pages);

  if (pages.length === 2 && pages[0].text.includes('Pure ALOHA') && pages[1].text.includes('Slotted ALOHA')) {
    console.log('✅ Real PDF Text Extraction Succeeded Flawlessly!');
  } else {
    console.error('❌ Extraction mismatch:', pages);
    process.exit(1);
  }
}

testRealPdf().catch((err) => {
  console.error('❌ Error during extraction test:', err);
  process.exit(1);
});
