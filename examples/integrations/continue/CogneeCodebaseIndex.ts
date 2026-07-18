import { CogneeWasmService } from "./CogneeWasmService";

// Standard type representations mimicking Continue's core indexing interfaces
export interface IndexTag {
  directory: string;
  branch: string;
  artifactId: string;
}

export interface PathAndCacheKey {
  path: string;
  cacheKey: string;
}

export interface RefreshIndexResults {
  compute: PathAndCacheKey[];
  del: PathAndCacheKey[];
  addTag: PathAndCacheKey[];
  removeTag: PathAndCacheKey[];
}

export interface IndexingProgressUpdate {
  progress: number;
  desc: string;
  status: "loading" | "indexing" | "done" | "paused" | "failed" | "disabled" | "waiting";
}

export type MarkCompleteCallback = (
  items: PathAndCacheKey[],
  resultType: "compute" | "delete" | "addTag" | "removeTag"
) => Promise<void>;

/**
 * Custom CodebaseIndex implementation matching Continue's indexing pipeline system.
 * Offloads heavy AST extraction, chunking, and relationship building directly to the
 * Cognee WASM memory service.
 */
export class CogneeCodebaseIndex {
  public readonly artifactId: string = "cognee::code_graph_memory";
  public readonly relativeExpectedTime: number = 10; // Relates to progress reporting heuristic

  constructor(
    private readonly readFile: (filepath: string) => Promise<string>
  ) {}

  /**
   * Main pipeline update operation triggered by Continue's indexer when workspace files
   * are added, deleted, or updated.
   */
  public async *update(
    tag: IndexTag,
    results: RefreshIndexResults,
    markComplete: MarkCompleteCallback,
    repoName: string | undefined
  ): AsyncGenerator<IndexingProgressUpdate> {
    const cognee = CogneeWasmService.getInstance();

    // 1. Process files that need to be computed / indexed
    const totalItems = results.compute.length;
    let completed = 0;

    if (totalItems > 0) {
      yield {
        progress: 0,
        desc: `Initializing Cognee indexing for ${totalItems} modified files...`,
        status: "indexing",
      };

      for (const item of results.compute) {
        try {
          // Read the content of the file using Continue's IDE adapter
          const fileContent = await this.readFile(item.path);

          // Invoke the high-speed code relation extractor inside the Rust WASM layer
          const graphMap = await cognee.extractCodeGraph(item.path, fileContent);

          // Pass structural details to the vector & graph storage engine inside WASM
          await cognee.remember(
            JSON.stringify({
              filePath: item.path,
              cacheKey: item.cacheKey,
              repoName,
              branchName: tag.branch,
              ...graphMap,
            }),
            `dataset::${repoName || "workspace"}`
          );

          completed++;
          yield {
            progress: completed / totalItems,
            desc: `Cognee indexing: ${pathBasename(item.path)}`,
            status: "indexing",
          };

          // Mark this file as complete so Continue's SQLite catalog persists state
          await markComplete([item], "compute");
        } catch (error) {
          console.error(`Cognee Indexer failed on file ${item.path}:`, error);
        }
      }
    }

    // 2. Process tagged file additions (when a file matches an already computed hash on another branch)
    for (const item of results.addTag) {
      await cognee.remember(
        JSON.stringify({
          filePath: item.path,
          cacheKey: item.cacheKey,
          branchName: tag.branch,
          action: "LINK_BRANCH",
        })
      );
      await markComplete([item], "addTag");
    }

    // 3. Process deleted files
    for (const item of results.del) {
      await cognee.forget(item.path);
      await markComplete([item], "delete");
    }

    // 4. Process removed tags
    for (const item of results.removeTag) {
      await markComplete([item], "removeTag");
    }

    yield {
      progress: 1.0,
      desc: "Cognee Knowledge Graph memory indexing complete",
      status: "done",
    };
  }

  /**
   * Retrieval method hooked into Continue's ContextProvider system to fetch highly relevant,
   * structurally-connected code chunks.
   */
  public async retrieve(
    query: string,
    limit: number,
    tags: IndexTag[]
  ): Promise<any[]> {
    const cognee = CogneeWasmService.getInstance();

    // Query our Cognee memory engine using our intelligent Graph+Vector query strategy.
    // This auto-routes to best-fit retrieval (e.g., GRAPH_COMPLETION or EXTENDED_CONTEXT)
    const memories = await cognee.recall(query, `dataset::${tags[0]?.directory || "workspace"}`);

    return memories.slice(0, limit).map((memory) => {
      // Parse the returned memory structure (which includes AST attributes and connectivity data)
      try {
        const parsed = JSON.parse(memory);
        return {
          digest: parsed.cacheKey,
          filepath: parsed.filePath,
          startLine: parsed.startLine || 1,
          endLine: parsed.endLine || 1,
          content: parsed.contents || memory,
        };
      } catch {
        return {
          digest: "unknown",
          filepath: "workspace",
          startLine: 1,
          endLine: 1,
          content: memory,
        };
      }
    });
  }
}

function pathBasename(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}
