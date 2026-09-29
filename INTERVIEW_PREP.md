# 🎯 DocLens — Software Engineering Interview Preparation Guide

This document is a comprehensive technical cheat-sheet for interviewing with **DocLens**. It covers the architecture, RAG first-principles, vector database math, database design, scaling considerations, failure modes, and **30 likely interview questions with model answers**.

---

## ⏱️ 1. Project Overview (60-Second Elevator Pitch)

> "DocLens is a full-stack, lightweight document Q&A application inspired by NotebookLM. It allows users to upload PDF documents, processes them into page-aware text chunks, generates 1536-dimensional vector embeddings using OpenAI's `text-embedding-3-small`, and stores them in PostgreSQL with `pgvector`. When a user asks a question, DocLens performs cosine similarity search to retrieve the top 5 most relevant document chunks and passes them to `gpt-4o-mini` with a strictly grounded system prompt. The application returns factual answers accompanied by interactive `[Page X]` source citation pills that display the original text snippets upon click. I built it using Next.js 15, TypeScript, Tailwind CSS, and PostgreSQL to demonstrate clean full-stack architecture, RAG design, and vector search mechanics."

---

## 🏗️ 2. Architectural Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DocLens Frontend                               │
│        (Next.js App Router, React 19, Tailwind CSS, Lucide Icons)           │
└──────────────────────┬──────────────────────────────▲───────────────────────┘
                       │ FormData (PDF)               │ JSON (Answer + Sources)
                       ▼                              │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Server-Side API Routes                              │
│         (/api/documents/process, /api/chat, /api/documents/[id])            │
├──────────────────────┬──────────────────────────────┼───────────────────────┤
│ Text Extraction      │ Vector Embeddings            │ RAG LLM Generation    │
│ (pdf-parse)          │ (text-embedding-3-small)     │ (gpt-4o-mini)         │
└──────────────────────┴──────────────┬───────────────┴───────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL + pgvector                               │
│           (documents metadata + document_chunks with HNSW index)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Client Interface (`src/components/*`)**: Handles drag-and-drop PDF upload, stage progress indicators, chat messaging, and source citation modals.
2. **API Route Handlers (`src/app/api/*`)**: Server-side endpoints ensuring API keys and database credentials remain hidden from the browser.
3. **Extraction & Chunking (`src/lib/pdf.ts`, `src/lib/chunking.ts`)**: Parses PDF buffers page-by-page and splits text into overlapping character windows while retaining `pageNumber`.
4. **Embedding Generation (`src/lib/embeddings.ts`)**: Batched API calls converting text blocks into 1536d float arrays.
5. **Database Access Layer (`src/lib/db.ts`)**: Executes parameterized SQL queries, connection pooling via `pg.Pool`, and HNSW vector similarity search.
6. **RAG Logic (`src/lib/retrieval.ts`, `src/lib/llm.ts`)**: Orchestrates vector search, system prompt formatting, and grounded LLM generation.

---

## 🧠 3. RAG (Retrieval-Augmented Generation) from First Principles

### Why RAG?
Large Language Models (LLMs) have two major limitations:
1. **Knowledge Cutoff & Scope**: LLMs do not know the contents of private or freshly uploaded documents.
2. **Hallucinations**: When asked about specific un-trained facts, LLMs generate plausible-sounding but false answers.

### How RAG Solves This:
Instead of retraining or fine-tuning the LLM (which is slow and expensive), RAG injects relevant facts from an external vector database directly into the LLM's prompt context window dynamically at runtime.

---

## 📐 4. Embeddings Deep Dive

- **What is an Embedding?** A dense numerical vector representation of text in a high-dimensional continuous vector space (e.g., 1536 floating-point numbers).
- **How It Works**: Words and sentences with similar semantic meanings are placed close together in vector space, regardless of specific keyword matching. For example, *"How do I fix a network collision?"* and *"ALOHA protocol vulnerable period"* will produce vectors with high cosine similarity.
- **Model Selected**: `text-embedding-3-small` (1536 dimensions).

---

## 🐘 5. Vector Database & pgvector

- **Why pgvector?** Extends PostgreSQL with vector storage types and similarity search functions (`<=>` for cosine distance, `<->` for L2 distance, `<#>` for inner product).
- **Cosine Distance vs. Similarity**:
  $$\text{Cosine Distance } d = 1 - \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
  $$\text{Cosine Similarity } s = 1 - d$$
  A distance of `0.0` represents identical vector direction (100% match).
- **HNSW Index (Hierarchical Navigable Small World)**: A multi-layer graph-based index structure allowing approximate nearest neighbor (ANN) searches in logarithmic time $O(\log N)$ rather than brute-force linear scanning $O(N)$.

---

## 🧩 6. Document Chunking Strategy

- **Target Chunk Size**: ~500 characters (~100 words).
- **Overlap**: ~100 characters.
- **Page Retention**: Chunking occurs per page so every chunk maintains a strict `pageNumber` tag.
- **Trade-Offs**:
  - *Too Large*: Dilutes semantic focus and wastes prompt token context.
  - *Too Small*: Lacks sufficient context for LLM to understand complete ideas.
  - *Overlap Benefit*: Prevents information loss when key phrases fall on chunk boundaries.

---

## 🗄️ 7. Database Schema

### `documents`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique document identifier (`doc_<timestamp>_<rand>`) |
| `filename` | TEXT | NOT NULL | Original PDF filename |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Ingestion timestamp |
| `status` | TEXT | DEFAULT 'processing' | Processing status ('processing', 'ready', 'error') |

### `document_chunks`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Chunk ID (`<docId>_chunk_<index>`) |
| `document_id` | TEXT | REFERENCES documents(id) ON DELETE CASCADE | Foreign Key |
| `page_number` | INTEGER | NOT NULL | Source PDF page number (1-indexed) |
| `chunk_index` | INTEGER | NOT NULL | Sequential chunk index |
| `content` | TEXT | NOT NULL | Raw text snippet |
| `embedding` | vector(1536) | NOT NULL | pgvector embedding vector |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Insertion timestamp |

---

## 🌐 8. API Architecture & Security

- `POST /api/documents/process`: Receives PDF via `FormData`, validates size (< 10MB) & extension, extracts text, chunks document, generates embeddings, stores in pgvector.
- `POST /api/chat`: Receives `{ documentId, question }`, generates query vector, queries pgvector for Top-K=5 chunks, triggers grounded LLM generation, returns answer and page citations.
- `GET /api/documents/[id]`: Returns document processing status.

### Security Highlights
1. **Zero Client Secret Exposure**: OpenAI API keys and DB strings are strictly read from server environment variables.
2. **Input Validation**: Rejects non-PDF mime types, oversized files (> 10MB), and empty search strings.
3. **Prepared Statements**: Parameterized SQL queries prevent SQL injection attacks.

---

## 📈 9. System Scaling Considerations

### Small Scale (1–10 Users, 10 Documents)
- Current single-node Next.js + PostgreSQL setup handles this effortlessly.

### Medium Scale (1,000 Users, 10,000 Documents)
- Move PDF processing to an asynchronous job queue (e.g., BullMQ / Redis or AWS SQS) to avoid HTTP request timeouts.
- Implement Redis caching for query embeddings and frequent questions.
- Add database connection pooling via PgBouncer.

### High Scale (1 Million Documents)
- Partition `document_chunks` table by `document_id` or hash key.
- Move vector storage to dedicated distributed vector indices or read-replicas.
- Store extracted raw text in object storage (AWS S3) and keep index light.

---

## ❓ 10. 30 Technical Interview Questions & Model Answers

### Category A: RAG & AI Engineering

1. **What is Retrieval-Augmented Generation (RAG)?**
   *Answer*: RAG is an architectural pattern that retrieves relevant factual context from an external database for a given user query and supplies that context inside the prompt to an LLM, ensuring accurate, up-to-date, and grounded answers without retraining the model.

2. **Why use RAG instead of fine-tuning an LLM?**
   *Answer*: Fine-tuning teaches a model style, tone, or specific formatting, but is poor at dynamic factual recall and requires expensive retraining whenever data changes. RAG allows instant updates by simply adding new vectors to a database.

3. **What is a vector embedding?**
   *Answer*: A vector embedding is a high-dimensional array of numbers generated by a neural network that encodes the semantic meaning of text into geometric space, allowing mathematical comparisons of conceptual similarity.

4. **Why do we use Cosine Distance for text similarity instead of Euclidean Distance (L2)?**
   *Answer*: Cosine distance measures the angle between two vectors regardless of vector magnitude. Because text length variations can scale vector magnitude without changing core topic meaning, angle-based similarity is superior for text retrieval.

5. **What is the difference between cosine distance and cosine similarity?**
   *Answer*: Cosine similarity ranges from -1 to 1 (1 being identical). Cosine distance is $1 - \text{similarity}$, where 0 means identical direction. pgvector's `<=>` operator returns cosine distance.

6. **What is an HNSW vector index?**
   *Answer*: Hierarchical Navigable Small World (HNSW) is a multi-layer graph structure used for Approximate Nearest Neighbor (ANN) search. It allows vector lookup in $O(\log N)$ time by traversing coarse-to-fine graph layers.

7. **Why is chunking necessary in RAG?**
   *Answer*: Full documents exceed LLM context window limits or dilute attention mechanism accuracy ("lost in the middle" effect). Chunking isolates granular semantic ideas into manageable units.

8. **Why add an overlap between chunks?**
   *Answer*: Overlap ensures that key sentences or ideas occurring near chunk boundaries are not split in half, preserving semantic context across chunk edges.

9. **What happens if a user asks a question about information not in the document?**
   *Answer*: The system prompt explicitly instructs the LLM to reply: *"I couldn't find enough information in this document to answer that."* This prevents hallucinations.

10. **How do page citations work in DocLens?**
    *Answer*: Text extraction tracks page boundaries, tagging every chunk with a `pageNumber`. When top chunks are retrieved, their page numbers are returned as source metadata alongside the generated answer.

---

### Category B: PostgreSQL & Database Design

11. **How is pgvector enabled in PostgreSQL?**
    *Answer*: By executing `CREATE EXTENSION IF NOT EXISTS vector;` inside PostgreSQL, which registers the `vector` data type and distance operators (`<=>`, `<->`).

12. **What SQL operator does pgvector use for cosine distance?**
    *Answer*: The `<=>` operator. For example: `SELECT content FROM document_chunks ORDER BY embedding <=> $1::vector LIMIT 5;`

13. **Why use PostgreSQL with pgvector instead of a dedicated vector database like Pinecone?**
    *Answer*: It simplifies architecture by keeping metadata, relational foreign keys, and vector search in a single transactional PostgreSQL database, eliminating multi-database data syncing overhead.

14. **How does CASCADE deletion work on `document_chunks`?**
    *Answer*: The `document_id` foreign key is configured with `ON DELETE CASCADE`. Deleting a record from `documents` automatically purges all associated chunks and vectors.

15. **What is connection pooling and why do we use `pg.Pool`?**
    *Answer*: Connection pooling maintains a reusable pool of active database connections, eliminating the high latency cost of opening and closing TCP/SSL database connections for every serverless API request.

---

### Category C: TypeScript, Next.js & Full-Stack Architecture

16. **Why use Next.js Route Handlers for backend functionality?**
    *Answer*: Route Handlers run securely in a Node.js server runtime, keeping API keys, PDF parsing logic, and SQL credentials hidden from the client while serving unified REST endpoints.

17. **How do you handle PDF file uploads in Next.js?**
    *Answer*: Using HTML `FormData` and `req.formData()` in a POST route handler, parsing the file binary into a Node.js `Buffer`.

18. **Why dynamic `require('pdf-parse')` inside the handler?**
    *Answer*: Standard top-level CJS imports of `pdf-parse` attempt to evaluate DOM polyfills at Next.js build-time. Dynamic importing inside function execution defers loading to server runtime.

19. **What is the purpose of `export const runtime = 'nodejs'` in Next.js?**
    *Answer*: It explicitly tells Next.js to run the API route in the full Node.js environment (which supports native Buffer, file system, and raw TCP sockets for Postgres) rather than the restricted Edge runtime.

20. **How is state managed in the client application?**
    *Answer*: React `useState` hooks manage document selection, processing stages, chat messages, and citation modal state cleanly without external state library bloat.

---

### Category D: Performance, Reliability & Failure Modes

21. **What happens if an uploaded PDF is scanned images without text?**
    *Answer*: `pdf-parse` yields empty string pages. DocLens detects 0 extracted chunks and returns a clear 422 error informing the user that no extractable text was found.

22. **What if the OpenAI API rate limits embedding generation?**
    *Answer*: Embeddings are generated in small batches (20 texts per call). If an error occurs, processing status updates to `'error'` and a 500 error response is logged and returned.

23. **How do you prevent memory leaks when handling large files?**
    *Answer*: The API enforces a strict 10 MB file size limit and processes streams/buffers in memory without writing temporary files to disk.

24. **How do you test the RAG pipeline?**
    *Answer*: Using standalone TypeScript verification scripts (`scratch/test-e2e-pipeline.ts`) that validate chunking, page retention, vector formatting, and prompt assembly.

25. **Why low temperature (`temperature: 0.2`) for RAG chat completions?**
    *Answer*: Lower temperature reduces randomness, making model outputs more deterministic, factual, and strictly aligned with provided document context.

---

### Category E: System Design & Production Readiness

26. **How would you scale DocLens for long-running PDF processing?**
    *Answer*: Offload PDF parsing and embedding generation to a background task queue (e.g., Redis + BullMQ or AWS SQS worker) and use WebSockets/Server-Sent Events (SSE) to stream processing status.

27. **How would you add multi-tenancy and user auth?**
    *Answer*: Add a `users` table, attach `user_id` to `documents`, enforce Row Level Security (RLS) in PostgreSQL, and use NextAuth.js or Clerk for JWT authentication.

28. **How would you improve retrieval accuracy?**
    *Answer*: Implement Hybrid Search (combining PostgreSQL `tsvector` full-text keyword search with pgvector semantic search via Reciprocal Rank Fusion) and Re-ranking (using a cross-encoder model).

29. **How would you store original PDF files if required?**
    *Answer*: Store original PDFs in object storage (AWS S3 / Supabase Storage) and store only the public URL in PostgreSQL.

30. **What are the key trade-offs made in this project design?**
    *Answer*: Traded multi-tenant SaaS features, OCR, and complex microservice queues for a simple, highly maintainable, single-database architecture that demonstrates end-to-end RAG clearly.
