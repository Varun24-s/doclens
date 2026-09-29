import { chunkDocumentPages } from '../src/lib/chunking';
import { ExtractedPage } from '../src/lib/pdf';

const samplePages: ExtractedPage[] = [
  {
    pageNumber: 1,
    text: 'Pure ALOHA is an unslotted packet transmission protocol. In Pure ALOHA, stations transmit whenever they have data. The vulnerable period for Pure ALOHA is 2T, where T is the frame transmission time. If two frames overlap even slightly, a collision occurs.'
  },
  {
    pageNumber: 2,
    text: 'Slotted ALOHA improves throughput by dividing time into discrete slots. Stations can only transmit at the beginning of a time slot. The vulnerable period for Slotted ALOHA is T.'
  }
];

const chunks = chunkDocumentPages('doc-123', samplePages, { targetChunkSize: 150, overlap: 30 });
console.log('Generated Chunks:', JSON.stringify(chunks, null, 2));

if (chunks.length >= 2 && chunks[0].pageNumber === 1 && chunks[chunks.length - 1].pageNumber === 2) {
  console.log('✅ Chunking test passed successfully!');
} else {
  console.error('❌ Chunking test failed.');
  process.exit(1);
}
