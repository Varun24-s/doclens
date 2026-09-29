'use client';

import React from 'react';
import { User, Bot, BookOpen } from 'lucide-react';
import { ChatMessage, SourceCitation } from '@/types';

interface MessageItemProps {
  message: ChatMessage;
  onSelectCitation: (citation: SourceCitation) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onSelectCitation }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start space-x-3.5 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/10 flex-shrink-0">
          <Bot className="w-5 h-5" />
        </div>
      )}

      <div
        className={`max-w-2xl rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-xs'
            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Source Citations for Assistant Responses */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/90 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sources & Page Citations:</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {message.sources.map((source, idx) => (
                <button
                  key={`${source.pageNumber}_${source.chunkIndex}_${idx}`}
                  onClick={() => onSelectCitation(source)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-mono font-medium transition-all transform hover:scale-105"
                  title="Click to view extracted chunk text"
                >
                  <span>Page {source.pageNumber}</span>
                  {source.similarity !== undefined && (
                    <span className="text-[10px] text-indigo-400 opacity-80">
                      ({(source.similarity * 100).toFixed(0)}%)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="p-2 rounded-xl bg-slate-800 text-slate-300 flex-shrink-0 border border-slate-700">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};
