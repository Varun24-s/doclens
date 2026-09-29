'use client';

import React, { useState } from 'react';
import { Document, SourceCitation } from '@/types';
import { Sidebar } from '@/components/Sidebar';
import { UploadPanel } from '@/components/UploadPanel';
import { ChatInterface } from '@/components/ChatInterface';
import { SourceCitationModal } from '@/components/SourceCitationModal';
import { Layers } from 'lucide-react';

export default function Home() {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null);

  const handleDocumentProcessed = (doc: Document, chunks: number) => {
    setCurrentDocument(doc);
    setChunkCount(chunks);
  };

  const handleUploadAnother = () => {
    setCurrentDocument(null);
    setChunkCount(0);
    setSelectedCitation(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentDocument={currentDocument}
        chunkCount={chunkCount}
        onUploadAnother={handleUploadAnother}
        isProcessing={isProcessing}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {!currentDocument ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-2xl mx-auto w-full">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-xl shadow-indigo-500/20 mb-2">
                <Layers className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight sm:text-4xl">
                DocLens
              </h1>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                Lightweight NotebookLM-inspired RAG assistant. Upload a PDF to generate pgvector embeddings and ask grounded questions with page citations.
              </p>
            </div>

            <UploadPanel
              onDocumentProcessed={handleDocumentProcessed}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </div>
        ) : (
          <ChatInterface
            document={currentDocument}
            onSelectCitation={(citation) => setSelectedCitation(citation)}
          />
        )}
      </main>

      {/* Citation Snippet Modal */}
      <SourceCitationModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
        filename={currentDocument?.filename}
      />
    </div>
  );
}
