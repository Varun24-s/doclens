'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Document, ProcessingStage } from '@/types';

interface UploadPanelProps {
  onDocumentProcessed: (doc: Document, chunkCount: number) => void;
  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  onDocumentProcessed,
  isProcessing,
  setIsProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentStage, setCurrentStage] = useState<ProcessingStage>('extracting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (file: File | null) => {
    setErrorMessage(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`File exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    setSelectedFile(file);
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    // Simulated progress stages to give clear feedback during processing
    setCurrentStage('extracting');
    const stageTimer1 = setTimeout(() => setCurrentStage('chunking'), 800);
    const stageTimer2 = setTimeout(() => setCurrentStage('embedding'), 1600);
    const stageTimer3 = setTimeout(() => setCurrentStage('indexing'), 2800);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents/process', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process PDF document.');
      }

      setCurrentStage('ready');
      onDocumentProcessed(data.document, data.chunkCount);
    } catch (err: any) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setCurrentStage('error');
      setErrorMessage(err.message || 'An unexpected error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stageLabels: Record<ProcessingStage, string> = {
    extracting: 'Extracting text from PDF pages...',
    chunking: 'Creating text chunks & preserving page numbers...',
    embedding: 'Generating vector embeddings via OpenAI...',
    indexing: 'Indexing vectors in PostgreSQL pgvector...',
    ready: 'Document ready!',
    error: 'Processing failed',
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) handleFileChange(droppedFile);
        }}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-700/80 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
        } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-200">Processing Document</p>
              <p className="text-xs text-indigo-400 font-medium">
                {stageLabels[currentStage]}
              </p>
            </div>
            {selectedFile && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="font-mono truncate max-w-xs">{selectedFile.name}</span>
                <span>({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-200">
                Upload a PDF document to start asking questions
              </p>
              <p className="text-xs text-slate-400">
                Drag and drop your PDF here, or click to browse (Max 10 MB)
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20">
              Select PDF File
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Processing Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
