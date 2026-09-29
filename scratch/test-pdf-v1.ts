const pdfParse = require('pdf-parse');

async function testV1() {
  console.log('Testing pdf-parse v1.1.1...');
  const samplePdfBase64 = 
    'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgMyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDU1Cj4+CnN0cmVhbQpCVAovRiAxMiBUZgpKNCAwIFRkCihIZWxsbyBEb2NMZW5zIFJBRyBUZXN0KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIwNiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMxMQolJUVPRg==';

  const buffer = Buffer.from(samplePdfBase64, 'base64');
  const data = await pdfParse(buffer);
  console.log('Number of pages:', data.numpages);
  console.log('Extracted text:', JSON.stringify(data.text));
  console.log('✅ pdf-parse v1.1.1 works flawlessly in Node.js!');
}

testV1().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
