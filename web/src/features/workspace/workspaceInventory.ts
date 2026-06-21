import type {
  WorkspaceDirectoryHandle,
  WorkspaceFileEntry,
  WorkspaceFileHandle,
  WorkspaceHandle,
} from "./workspaceTypes";

export const DEFAULT_WORKSPACE_SCAN_DEPTH = 4;

const MARKDOWN_EXTENSIONS = [".md", ".markdown"] as const;
const SKIPPED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "vendor",
  "archive",
  "archives",
  "generated",
  "__generated__",
  "__snapshots__",
  "__pycache__",
]);

const SKIPPED_FILE_SUFFIXES = [
  "~",
  ".bak",
  ".backup",
  ".orig",
  ".tmp",
  ".swp",
  ".generated.md",
  ".generated.markdown",
];

export interface WorkspaceSupportTarget {
  showDirectoryPicker?: unknown;
}

export function supportsLocalWorkspace(target: WorkspaceSupportTarget = globalThis): boolean {
  return typeof target.showDirectoryPicker === "function";
}

export function createWorkspaceDocumentId(workspaceName: string, relativePath: string): string {
  return `workspace:${hashString(workspaceName)}:${encodeRelativePath(relativePath)}`;
}

export function encodeRelativePath(relativePath: string): string {
  return relativePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function isMarkdownFile(name: string): name is `${string}.md` | `${string}.markdown` {
  const lower = name.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function shouldSkipWorkspacePath(parts: string[], kind: "file" | "directory"): boolean {
  const normalized = parts.map((part) => part.trim()).filter(Boolean);
  if (normalized.some((part) => part.startsWith("."))) return true;
  if (normalized.some((part) => SKIPPED_DIRS.has(part.toLowerCase()))) return true;
  const name = normalized[normalized.length - 1]?.toLowerCase() ?? "";
  if (kind === "file" && SKIPPED_FILE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  return false;
}

export async function scanWorkspaceDirectory(
  root: WorkspaceDirectoryHandle,
  options: { maxDepth?: number; workspaceId?: string } = {},
): Promise<WorkspaceFileEntry[]> {
  const maxDepth = options.maxDepth ?? DEFAULT_WORKSPACE_SCAN_DEPTH;
  const workspaceId = options.workspaceId ?? root.name;
  const files: WorkspaceFileEntry[] = [];

  async function visit(directory: WorkspaceDirectoryHandle, pathParts: string[], depth: number) {
    if (depth > maxDepth) return;
    for await (const [name, handle] of listEntries(directory)) {
      const nextParts = [...pathParts, name];
      const kind = inferKind(handle);
      if (shouldSkipWorkspacePath(nextParts, kind)) continue;

      if (kind === "directory") {
        await visit(handle as WorkspaceDirectoryHandle, nextParts, depth + 1);
        continue;
      }

      if (!isMarkdownFile(name)) continue;
      const relativePath = nextParts.join("/");
      const extension = name.toLowerCase().endsWith(".markdown") ? ".markdown" : ".md";
      files.push({
        id: createWorkspaceDocumentId(workspaceId, relativePath),
        name,
        relativePath,
        extension,
        handle: handle as WorkspaceFileHandle,
        status: "available",
      });
    }
  }

  await visit(root, [], 1);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function* listEntries(directory: WorkspaceDirectoryHandle): AsyncIterableIterator<[string, WorkspaceHandle]> {
  if (directory.entries) {
    yield* directory.entries();
    return;
  }
  if (directory.values) {
    for await (const handle of directory.values()) {
      yield [handle.name, handle];
    }
  }
}

function inferKind(handle: WorkspaceHandle): "file" | "directory" {
  if (handle.kind === "directory" || "entries" in handle || "values" in handle) return "directory";
  return "file";
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
