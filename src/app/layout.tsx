import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DocLens - NotebookLM-Lite RAG Document Assistant',
  description:
    'Lightweight RAG web application built with Next.js, TypeScript, PostgreSQL, and pgvector for semantic document search and citation-backed Q&A.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
