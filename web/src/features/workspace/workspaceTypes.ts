export type WorkspaceMode =
  | "unsupported"
  | "idle"
  | "opening"
  | "ready"
  | "empty"
  | "cancelled"
  | "error";

export type WorkspaceEntryKind = "file" | "directory";

export interface WorkspaceFileHandle {
  readonly kind?: WorkspaceEntryKind;
  readonly name: string;
  getFile: () => Promise<File>;
  createWritable?: () => Promise<{
    write: (content: string) => Promise<void> | void;
    close: () => Promise<void> | void;
  }>;
}

export interface WorkspaceDirectoryHandle {
  readonly kind?: WorkspaceEntryKind;
  readonly name: string;
  entries?: () => AsyncIterableIterator<[string, WorkspaceHandle]>;
  values?: () => AsyncIterableIterator<WorkspaceHandle>;
}

export type WorkspaceHandle = WorkspaceFileHandle | WorkspaceDirectoryHandle;

export interface WorkspaceFileEntry {
  id: string;
  name: string;
  relativePath: string;
  extension: ".md" | ".markdown";
  handle: WorkspaceFileHandle;
  status: "available" | "unavailable";
}

export interface WorkspaceState {
  mode: WorkspaceMode;
  workspaceId?: string;
  directoryName?: string;
  files: WorkspaceFileEntry[];
  error?: string;
}
