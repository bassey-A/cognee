# Cognee Unified In-Process Graph Memory Integration

This folder contains the integration code to embed **Cognee's high-performance Graph-RAG Memory** completely **in-process** inside your **Continue** fork (`babs`).

## Key Benefits of In-Process Integration

1. **Single Unified Process:** Spawns zero external binaries, subprocesses, sidecars, or Docker instances. Runs entirely within Continue's extension process.
2. **Zero Duplicate Configurations:** Does not define its own model settings or prompt the user for API keys. It directly accepts and reuses Continue's already-instantiated `ILLM` and `EmbeddingsProvider` objects.
3. **Optimized Local Storage:** Builds and preserves code relations (e.g. `IMPORTS`, `EXTENDS`, `DEFINES`, `CALLS`) inside Continue's existing SQLite database.

---

## What benefits does using Cognee's Graph Index provide over native Continue?

Native Continue relies strictly on standard chunk-level vector embeddings (`LanceDbIndex`) and keyword indexing (`FullTextSearchCodebaseIndex`). While excellent for locating exact code snippets, they possess several critical limitations:
- **Blindness to Structure:** Flat vector indices chunk code recursively by character count, often breaking class and function boundaries. They have no understanding of topological code structures—they do not know which class inherits from which, or what files import a given module.
- **Out-of-Context Search Results:** When asking high-level architectural questions (e.g. *"How does the authentication flow navigate through these modules?"*), flat vector searches return a disjointed list of snippets, missing the calling sequence and relationships.
- **The "Full-Table Scan" Bottleneck:** Attempting to query large workspaces with unoptimized in-memory arrays blocks VS Code's single-threaded JavaScript extension runtime.

### The Cognee Advantage:
- **High-Speed AST-Based Extraction:** Bypasses sequential, rate-limited, and expensive LLM extraction calls. It extracts code structures (classes, interfaces, imports, and functions) locally in sub-milliseconds.
- **Relational Graph-Traversals:** Bridges vector similarity with relational database logic inside SQLite. It allows Continue to locate a relevant candidate module, and then trace its import, extends, and call sequences directly to assemble a coherent, context-rich graph map.
- **Zero-Block Database Operations:** Fully integrates with Continue's existing non-blocking indexing schedule, performing lookups via optimized primary key joins.

---

## When is the Cognee Graph Memory Index queried?

The indexer sits inside Continue's core loop, intercepting both write and retrieval triggers:

1. **At Indexing / Modification (Write Phase):**
   - Automatically triggered during background repository walks or when files are edited and saved.
   - It parses file syntax, mapping out definitions and relationships inside SQLite, avoiding any slow subprocess or sidecar starts.

2. **During Prompt Submissions (Query Phase):**
   - Triggered when the user submits a chatbot query (e.g., using the `@codebase` provider).
   - Instead of returning raw character-chunks, the system queries the node index to find candidate starting locations, and joins related classes and imports to output structurally complete, multi-file context.

---

## File Map

- **`CogneeGraphMemoryIndex.ts`**: The main indexer adapter implementing Continue's native `CodebaseIndex` interface. It analyzes code structures inline using your active LLM and embedding providers, building a topological graph of your codebase.

---

## Integration Guide

### Step 1: Copy files to your Continue Fork

Copy `CogneeGraphMemoryIndex.ts` directly into the indexing core directory of your fork:
```bash
cp CogneeGraphMemoryIndex.ts /path-to-your-fork/babs/core/indexing/
```

### Step 2: Register the Cognee Indexer in CodebaseIndexer

Open `core/indexing/CodebaseIndexer.ts` inside your Continue fork (`babs`).

1. Import your newly added custom indexer:
   ```typescript
   import { CogneeGraphMemoryIndex } from "./CogneeGraphMemoryIndex";
   ```

2. Inside `getIndexesToBuild()`, register the indexer under your preferred role or target:
   ```typescript
   const indexTypeToIndexerMapping: Record<
     ContextIndexingType,
     () => Promise<CodebaseIndex | null>
   > = {
     // ... other indexers
     embeddings: async () => {
       const embeddingsModel = config.selectedModelByRole.embed;
       const activeLLM = config.selectedModelByRole.chat || config.selectedModelByRole.default;

       return new CogneeGraphMemoryIndex(
         activeLLM,
         embeddingsModel,
         this.ide.readFile.bind(this.ide)
       );
     }
   };
   ```

### Step 3: Run Completely Unified!

When Continue indexes a workspace:
- `CogneeGraphMemoryIndex` is loaded in the same Node execution context.
- It parses classes, methods, functions, and import structures without any subprocess overhead.
- When retrieving context for user questions, it traverses these code connections, letting the chatbot understand complex module interactions with absolute topological accuracy!
