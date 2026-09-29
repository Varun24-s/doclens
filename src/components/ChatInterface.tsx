'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { ChatMessage, Document, SourceCitation } from '@/types';
import { MessageItem } from './MessageItem';

interface ChatInterfaceProps {
  document: Document;
  onSelectCitation: (citation: SourceCitation) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ document, onSelectCitation }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  const handleSend = async (queryText?: string) => {
    const question = (queryText || inputQuery).trim();
    if (!question || isAsking) return;

    setInputQuery('');
    setChatError(null);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsAsking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          question,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate answer.');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setChatError(err.message || 'An error occurred while answering your question.');
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to process question.'}`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  };

  const sampleQuestions = [
    'What are the key points in this document?',
    'Summarize the core concepts explained here.',
    'What conclusions or results are presented?',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Document Top Bar */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200 truncate max-w-md">
            {document.filename}
          </h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
          RAG Mode
        </span>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-12">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-200">
                Ask anything about your document
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                DocLens uses PostgreSQL pgvector semantic search and RAG to provide accurate answers with page citations.
              </p>
            </div>

            {/* Suggested Prompt Buttons */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Suggested Questions
              </p>
              <div className="flex flex-col space-y-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-left px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-all hover:text-indigo-300"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} onSelectCitation={onSelectCitation} />
            ))}
            {isAsking && (
              <div className="flex items-center space-x-3 my-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                  <span>Searching pgvector embeddings & generating answer...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Question Input Form */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative max-w-4xl mx-auto flex items-center"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about this document..."
            disabled={isAsking}
            className="w-full py-3.5 pl-4 pr-12 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-hidden text-slate-100 placeholder-slate-400 text-sm shadow-inner transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isAsking}
            className="absolute right-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-600/20"
            aria-label="Send question"
          >
            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
