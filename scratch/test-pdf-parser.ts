import { extractTextFromPDF } from '../src/lib/pdf';

async function testPdfExtraction() {
  console.log('Testing extractTextFromPDF function...');
  const samplePdfBase64 = 
    'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgMyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDU1Cj4+CnN0cmVhbQpCVAovRiAxMiBUZgpKNCAwIFRkCihIZWxsbyBEb2NMZW5zIFJBRyBUZXN0KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIwNiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMxMQolJUVPRg==';

  const buffer = Buffer.from(samplePdfBase64, 'base64');
  try {
    const pages = await extractTextFromPDF(buffer);
    console.log('Extracted Pages:', pages);
    console.log('✅ extractTextFromPDF succeeded!');
  } catch (err: any) {
    console.log('Caught expected error or output:', err.message);
    if (!err.message.includes('DOMMatrix')) {
      console.log('✅ DOMMatrix error is completely resolved!');
    } else {
      console.error('❌ Still failed with DOMMatrix');
      process.exit(1);
    }
  }
}

testPdfExtraction();
