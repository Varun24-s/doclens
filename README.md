# DocLens 🔍

> A lightweight NotebookLM-inspired RAG application for asking grounded questions about PDF documents with exact page citations.

![DocLens Architecture](https://img.shields.io/badge/Stack-Next.js%20%7C%20TypeScript%20%7C%20PostgreSQL%20%7C%20pgvector-blueviolet)

---

## 🌟 Existing Features

- **PDF Text Extraction**: Page-by-page text parsing with preserved page boundaries using `unpdf`.
- **Page-Aware Chunking**: Sliding-window chunking (~500 characters target size with ~100 character overlap) retaining exact `pageNumber` metadata.
- **Vector Embeddings**: 1536-dimensional vector embedding generation via OpenAI / OpenRouter `text-embedding-3-small` (with local deterministic vector fallback for testing without API keys).
- **PostgreSQL + pgvector**: Vector storage with native HNSW indexing and cosine similarity search (`1 - (embedding <=> queryVector)`) with an in-memory vector similarity fallback.
- **Semantic Retrieval**: Top-K nearest chunk retrieval based on vector similarity scoring.
- **Grounded LLM RAG**: System-prompt constrained answer generation via `gpt-4o-mini` (OpenAI / OpenRouter) preventing hallucinations.
- **Interactive Source Citations**: Clickable `[Page X]` citation pills that open a modal displaying the exact retrieved context snippet.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    A["📄 PDF Document Upload"] --> B["🔤 Page-Aware Text Extraction (unpdf)"]
    B --> C["🧩 Sliding Window Chunking (~500 chars, 100 char overlap)"]
    C --> D["🧠 Vector Embeddings (text-embedding-3-small)"]
    D --> E[("🐘 PostgreSQL + pgvector Storage")]
    
    F["❓ User Question"] --> G["🔍 Query Embedding Generation"]
    G --> H["⚡ Cosine Similarity Search (1 - (embedding <=> queryVector))"]
    E --> H
    H --> I["📝 Context Assembly & System Prompt"]
    I --> J["🤖 Chat Completion LLM (gpt-4o-mini)"]
    J --> K["💬 Grounded Answer + Clickable [Page X] Citations"]
```

---

## 🛠️ Tech Stack

| Technology | Purpose | Rationale |
| :--- | :--- | :--- |
| **Next.js (App Router)** | Full-Stack Framework | Server-side Route Handlers eliminate separate backend microservices. |
| **TypeScript** | Static Typing | Strict type safety across document, chunk, vector, and API surfaces. |
| **PostgreSQL + pgvector** | Database & Vector Store | Combines relational metadata and high-performance vector indexing in one engine. |
| **OpenAI / OpenRouter API** | Embeddings & LLM Generation | `text-embedding-3-small` for semantic search + `gpt-4o-mini` for grounded answers. |
| **Tailwind CSS** | User Interface | Modern dark-mode UI inspired by Linear and NotebookLM. |

---

## 🔄 How RAG Works in DocLens

1. **Document Ingestion**: User uploads a PDF file (up to 10 MB).
2. **Page-Aware Text Extraction**: `unpdf` extracts raw text page-by-page while tracking `pageNumber`.
3. **Sliding Window Chunking**: Text is split into overlapping chunks (~500 chars target size, 100 char overlap) so semantic concepts spanning chunk boundaries are preserved.
4. **Vector Embedding**: Each text chunk is converted into a 1536-dimensional vector embedding.
5. **pgvector Storage**: Chunks and vectors are stored in PostgreSQL with an HNSW vector index using `vector_cosine_ops`.
6. **Query Embedding**: User's question is converted into a 1536d query vector.
7. **Semantic Search**: pgvector executes a cosine similarity search (`1 - (embedding <=> queryVector)`), retrieving the top 5 nearest chunks.
8. **Grounded Generation**: Retrieved chunks and page numbers are passed to `gpt-4o-mini` with strict system instructions to answer strictly using provided context and cite page numbers.

---

## 🚀 Local Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- OpenAI or OpenRouter API Key
- (Optional) PostgreSQL database with `pgvector` extension enabled (DocLens falls back to in-memory mode if `DATABASE_URL` is omitted)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Varun24-s/doclens.git
cd doclens
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# Optional PostgreSQL URL
# DATABASE_URL=postgresql://user:password@localhost:5432/doclens

# OpenAI or OpenRouter API Key
OPENAI_API_KEY=your-api-key-here

# (Optional if using OpenRouter)
# OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Models
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📐 Key Design Decisions

- **Why Chunking?** LLM context windows are expensive and limited. Chunking breaks large documents into discrete semantic units, allowing precise retrieval of relevant sections rather than flooding the prompt.
- **Why Overlap?** Overlapping chunks prevents key facts or sentences spanning chunk boundaries from being truncated or lost during similarity search.
- **Why PostgreSQL + pgvector?** Using pgvector avoids introducing separate third-party vector databases, keeping relational metadata and vector embeddings in a single database engine.
- **Why RAG vs. Sending Entire Document?** RAG reduces token consumption costs, improves response latencies, scales to multi-hundred page documents, and significantly mitigates hallucination risks by anchoring LLM responses to retrieved context.
- **Why Page Citations?** Citations provide explainability and trust, enabling users to click `[Page X]` pills to view the exact retrieved text snippet from the document.

---

## ⚠️ Limitations & Scope

- **Single-User / Portfolio Scope**: Intentionally lightweight without authentication or multi-tenant user account isolation.
- **10 MB File Limit**: Processing optimized for single documents up to 10 MB.
- **No OCR**: Relies on extractable text in PDFs (scanned image-only PDFs require pre-OCR processing).
- **No Persistent PDF Storage**: Original PDF binaries are discarded after extraction to save storage; only extracted text chunks and embeddings are stored.
