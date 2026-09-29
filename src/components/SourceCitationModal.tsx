'use client';

import React from 'react';
import { X, FileText, CheckCircle } from 'lucide-react';
import { SourceCitation } from '@/types';

interface SourceCitationModalProps {
  citation: SourceCitation | null;
  onClose: () => void;
  filename?: string;
}

export const SourceCitationModal: React.FC<SourceCitationModalProps> = ({
  citation,
  onClose,
  filename = 'Document',
}) => {
  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100 p-6 transition-transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{filename}</h3>
              <p className="text-xs text-slate-400">
                Page {citation.pageNumber} • Chunk #{citation.chunkIndex + 1}
                {citation.similarity !== undefined && (
                  <span className="ml-2 text-indigo-400">
                    • Match Score: {(citation.similarity * 100).toFixed(0)}%
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close citation modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snippet Content */}
        <div className="mt-4 max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap font-sans">
          {citation.content}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>Grounded Document Context</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
