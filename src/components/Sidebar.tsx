'use client';

import React from 'react';
import { Layers, FileText, CheckCircle2, Clock, AlertTriangle, PlusCircle } from 'lucide-react';
import { Document } from '@/types';

interface SidebarProps {
  currentDocument: Document | null;
  chunkCount: number;
  onUploadAnother: () => void;
  isProcessing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDocument,
  chunkCount,
  onUploadAnother,
  isProcessing,
}) => {
  return (
    <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between p-5 text-slate-200">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">DocLens</h1>
            <p className="text-[11px] text-slate-400 font-medium">NotebookLM-Lite RAG</p>
          </div>
        </div>

        {/* Current Document Card */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Active Document
          </h2>

          {currentDocument ? (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-200 truncate" title={currentDocument.filename}>
                    {currentDocument.filename}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {chunkCount > 0 ? `${chunkCount} searchable chunks` : 'Indexed'}
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">Status</span>
                {currentDocument.status === 'ready' && (
                  <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready</span>
                  </span>
                )}
                {currentDocument.status === 'processing' && (
                  <span className="inline-flex items-center space-x-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                    <Clock className="w-3 h-3" />
                    <span>Processing</span>
                  </span>
                )}
                {currentDocument.status === 'error' && (
                  <span className="inline-flex items-center space-x-1 text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Error</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 text-center py-6">
              No document loaded yet
            </div>
          )}
        </div>

        {/* Action Button */}
        {currentDocument && (
          <button
            onClick={onUploadAnother}
            disabled={isProcessing}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700/60 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4 text-indigo-400" />
            <span>Upload Another PDF</span>
          </button>
        )}
      </div>

      {/* Tech Stack Info Footer */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex justify-between">
          <span>Engine</span>
          <span className="font-mono text-slate-300">pgvector + RAG</span>
        </div>
        <div className="flex justify-between">
          <span>Embedding</span>
          <span className="font-mono text-slate-300">OpenAI 1536d</span>
        </div>
      </div>
    </aside>
  );
};
