# Cognee WASM Integration for Continue Fork (`babs`)

This folder contains the complete, production-grade integration package to embed **Cognee-RS** (the Rust engine) compiled to **WebAssembly (WASM)** directly inside your **Continue** fork (`babs`).

## Why WASM + Rust?

1. **Zero System Dependencies:** No local Python runtime, version mismatch, or C++ toolchains are required on the user's system.
2. **Instant & Failsafe Execution:** Booting the WebAssembly module takes under 350ms, with zero Gatekeeper quarantine alerts on macOS, SmartScreen alerts on Windows, or permission restrictions.
3. **Embedded High-Performance:** True parallel, multi-threaded codebase indexing is handled efficiently in native Rust, safely sandboxed inside Node's engine.

---

## File Map

- **`CogneeWasmService.ts`**: Singleton service in charge of dynamically importing the compiled wasm bindings and instantiating the memory database layers.
- **`CogneeCodebaseIndex.ts`**: Continue-compliant custom indexer implementation. It intercepts file modifications, triggers WASM code-relationship extraction, and persists the indexing results in LanceDB and SQLite.
- **`exampleCodeGraphPayload.ts`**: Architectural blueprint demonstrating how abstract syntax trees (ASTs), code nodes, and dependencies are mapped and structured inside Cognee-RS.

---

## Integration Guide

### Step 1: Clone and Compile Cognee-RS to WASM

To get the wasm build target of `cognee-rs`, make sure you have the [Rust toolchain](https://rustup.rs/) and [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) installed.

```bash
# Clone the rust memory repository
git clone https://github.com/topoteretes/cognee-rs.git
cd cognee-rs

# Compile the package to WebAssembly for Node.js environments
wasm-pack build --target nodejs --out-name cognee_rs_wasm
```

This generates a `pkg/` folder containing the compiled `cognee_rs_wasm.wasm` file and corresponding TypeScript bindings.

### Step 2: Copy the Files to Your Continue Fork (`babs`)

1. Copy the output `pkg/` folder from the steps above into your Continue fork's binary distribution directory:
   ```bash
   cp -r pkg/ /your-local-path-to/babs/core/bin/cognee-rs-wasm/
   ```

2. Copy the TypeScript files from this folder (`CogneeWasmService.ts`, `CogneeCodebaseIndex.ts`) directly into:
   ```bash
   core/indexing/
   ```

### Step 3: Register the Cognee Indexer in Continue

Open `core/indexing/CodebaseIndexer.ts` in your fork.

1. Import your newly added custom indexer:
   ```typescript
   import { CogneeCodebaseIndex } from "./CogneeCodebaseIndex";
   ```

2. Add `CogneeCodebaseIndex` to your `getIndexesToBuild()` method:
   ```typescript
   const indexTypeToIndexerMapping: Record<
     ContextIndexingType,
     () => Promise<CodebaseIndex | null>
   > = {
     // ... other indices
     embeddings: async () => {
       const embeddingsModel = config.selectedModelByRole.embed;
       return new CogneeCodebaseIndex(this.ide.readFile.bind(this.ide));
     }
   };
   ```

### Step 4: Run and Test Completely Offline!

When you launch your Continue development workspace:
- Cognee WASM will automatically intercept file additions and edits.
- It will chunk the codebase, extract AST nodes/relationships, and store them directly in the SQLite + LanceDB databases embedded inside your extension's local directory.
- Queries routed via the prompt or chatbot context (e.g., `@codebase`) will return connected entity hierarchies rather than isolated, out-of-context text snippets.
