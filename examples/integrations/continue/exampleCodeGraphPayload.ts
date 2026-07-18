/**
 * Code Relationship Extraction Blueprint
 *
 * This file illustrates how the Rust WebAssembly layer in `cognee-rs` translates
 * abstract syntax trees (AST) and language structural components into Pydantic-equivalent
 * semantic node and edge properties inside the SQLite & LanceDB storage.
 */

export interface CodeNode {
  id: string; // Typically fully qualified name, e.g., "core::indexing::CogneeCodebaseIndex"
  name: string;
  type: "File" | "Class" | "Interface" | "Function" | "Variable" | "Import";
  contents: string;
  startLine: number;
  endLine: number;
  description?: string;
}

export interface CodeRelationship {
  sourceId: string;
  targetId: string;
  type: "DEFINES" | "IMPORTS" | "EXTENDS" | "IMPLEMENTS" | "CALLS" | "USES_TYPE";
}

/**
 * Representational blueprint of the CodeGraph data structure built and managed by Cognee WASM.
 */
export interface CodeGraphMemoryMap {
  nodes: CodeNode[];
  edges: CodeRelationship[];
  summary: string;
}

/**
 * Example payload demonstrating how a source file is mapped into a code relationship graph.
 *
 * For instance, given a file `core/indexing/CogneeCodebaseIndex.ts`:
 * - It contains a class `CogneeCodebaseIndex` that implements `CodebaseIndex`.
 * - It imports `CogneeWasmService`.
 * - Its methods invoke functions/methods on `CogneeWasmService`.
 */
export const exampleCodeGraphPayload: CodeGraphMemoryMap = {
  nodes: [
    {
      id: "core/indexing/CogneeCodebaseIndex.ts",
      name: "CogneeCodebaseIndex.ts",
      type: "File",
      contents: "/* full source code ... */",
      startLine: 1,
      endLine: 150,
      description: "Codebase Indexer adapter that integrates Cognee memory pipelines with Continue."
    },
    {
      id: "core::indexing::CogneeCodebaseIndex",
      name: "CogneeCodebaseIndex",
      type: "Class",
      contents: "export class CogneeCodebaseIndex implements CodebaseIndex { ... }",
      startLine: 20,
      endLine: 120,
      description: "Class implementing CodebaseIndex interface to update and retrieve local vector-graph index."
    },
    {
      id: "core::indexing::CodebaseIndex",
      name: "CodebaseIndex",
      type: "Interface",
      contents: "export interface CodebaseIndex { ... }",
      startLine: 1,
      endLine: 10
    },
    {
      id: "core::indexing::CogneeWasmService",
      name: "CogneeWasmService",
      type: "Class",
      contents: "export class CogneeWasmService { ... }",
      startLine: 1,
      endLine: 1
    }
  ],
  edges: [
    {
      sourceId: "core/indexing/CogneeCodebaseIndex.ts",
      targetId: "core::indexing::CogneeCodebaseIndex",
      type: "DEFINES"
    },
    {
      sourceId: "core::indexing::CogneeCodebaseIndex",
      targetId: "core::indexing::CodebaseIndex",
      type: "IMPLEMENTS"
    },
    {
      sourceId: "core/indexing/CogneeCodebaseIndex.ts",
      targetId: "core::indexing::CogneeWasmService",
      type: "IMPORTS"
    },
    {
      sourceId: "core::indexing::CogneeCodebaseIndex",
      targetId: "core::indexing::CogneeWasmService",
      type: "CALLS"
    }
  ],
  summary: "This file exports CogneeCodebaseIndex, which implements CodebaseIndex. It imports and interacts with CogneeWasmService to stream modified repository files to the WebAssembly memory layer."
};
