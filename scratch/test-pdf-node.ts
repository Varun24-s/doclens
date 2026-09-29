const pdfNode = require('pdf-parse/node');

console.log('pdf-parse/node keys:', Object.keys(pdfNode));

async function testNodeParser() {
  const samplePdfBase64 = 
    'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgMyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDU1Cj4+CnN0cmVhbQpCVAovRiAxMiBUZgpKNCAwIFRkCihIZWxsbyBEb2NMZW5zIFJBRyBUZXN0KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIwNiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMxMQolJUVPRg==';

  const buffer = Buffer.from(samplePdfBase64, 'base64');
  const parser = new pdfNode.PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  console.log('Text result:', textResult);
  console.log('✅ pdf-parse/node works perfectly without workers!');
}

testNodeParser().catch((err) => {
  console.error('❌ Error:', err);
});
