import { useCallback, useMemo, useState } from "react";
import {
  scanWorkspaceDirectory,
  supportsLocalWorkspace,
} from "./workspaceInventory";
import type {
  WorkspaceDirectoryHandle,
  WorkspaceState,
} from "./workspaceTypes";

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: () => Promise<WorkspaceDirectoryHandle>;
}

const initialState: WorkspaceState = {
  mode: supportsLocalWorkspace(typeof window === "undefined" ? undefined : window)
    ? "idle"
    : "unsupported",
  files: [],
};

export function useLocalWorkspace() {
  const [state, setState] = useState<WorkspaceState>(initialState);

  const supported = useMemo(
    () => supportsLocalWorkspace(typeof window === "undefined" ? undefined : window),
    [],
  );

  const openWorkspace = useCallback(async () => {
    const pickerWindow = window as DirectoryPickerWindow;
    if (!supportsLocalWorkspace(pickerWindow)) {
      setState({ mode: "unsupported", files: [] });
      return;
    }

    setState((current) => ({
      ...current,
      mode: "opening",
      error: undefined,
    }));

    try {
      const directory = await pickerWindow.showDirectoryPicker!();
      const workspaceId = createWorkspaceSessionId();
      const files = await scanWorkspaceDirectory(directory, { workspaceId });
      setState({
        mode: files.length > 0 ? "ready" : "empty",
        workspaceId,
        directoryName: directory.name,
        files,
      });
    } catch (error) {
      const e = error as DOMException | Error;
      if (e.name === "AbortError") {
        setState((current) => ({ ...current, mode: "cancelled", error: undefined }));
        return;
      }
      setState((current) => ({
        ...current,
        mode: "error",
        error: e.message || "Workspace access failed",
      }));
    }
  }, []);

  const closeWorkspace = useCallback(() => {
    setState({
      mode: supported ? "idle" : "unsupported",
      files: [],
    });
  }, [supported]);

  return {
    ...state,
    supported,
    openWorkspace,
    closeWorkspace,
  };
}

function createWorkspaceSessionId(): string {
  const maybeCrypto = globalThis.crypto as Crypto | undefined;
  if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
  return `workspace-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
