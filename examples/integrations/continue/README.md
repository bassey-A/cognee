# Cognee Unified In-Process Graph Memory Integration

This folder contains the integration code to embed **Cognee's high-performance Graph-RAG Memory** completely **in-process** inside your **Continue** fork (`babs`).

## Key Benefits of In-Process Integration

1. **Single Unified Process:** Spawns zero external binaries, subprocesses, sidecars, or Docker instances. Runs entirely within Continue's extension process.
2. **Zero Duplicate Configurations:** Does not define its own model settings or prompt the user for API keys. It directly accepts and reuses Continue's already-instantiated `ILLM` and `EmbeddingsProvider` objects.
3. **Optimized Local Storage:** Builds and preserves code relations (e.g. `IMPORTS`, `EXTENDS`, `DEFINES`, `CALLS`) inside Continue's existing SQLite database.

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
- When retrieving context for user questions, it traverses these code connections, letting the chatbot understand complex module interactions (e.g., *"How does this class interact with the database layers?"*) with absolute topological accuracy!
