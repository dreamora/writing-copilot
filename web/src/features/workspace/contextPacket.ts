import { hashString } from "../../../../src/domain/blocks/hash-string";
import type { WorkspaceFileEntry } from "./workspaceTypes";
import {
  detectSecretWarnings,
  type SecretWarning,
} from "./secretWarnings";
import type {
  WorkspaceContextPacket,
  WorkspaceContextItem,
} from "../../../../src/domain/suggestions/suggestion-types";

export const DEFAULT_CONTEXT_CHAR_BUDGET = 20000;

export type ContextInclusionMode = "full" | "trimmed" | "omitted" | "unavailable";

export interface ContextPacketItem {
  documentId: string;
  title: string;
  relativePath: string;
  inclusionMode: ContextInclusionMode;
  content?: string;
  charCount: number;
  includedCharCount: number;
  contentHash?: string;
  warnings: SecretWarning[];
  error?: string;
}

export interface ContextPacket {
  items: ContextPacketItem[];
  totalIncludedChars: number;
  budget: number;
  hasWarnings: boolean;
  hasOmissions: boolean;
}

export async function buildContextPacket(
  entries: WorkspaceFileEntry[],
  options: { budget?: number } = {},
): Promise<ContextPacket> {
  const budget = options.budget ?? DEFAULT_CONTEXT_CHAR_BUDGET;
  const items: ContextPacketItem[] = [];
  let totalIncludedChars = 0;

  for (const entry of entries) {
    try {
      const file = await entry.handle.getFile();
      const remaining = Math.max(0, budget - totalIncludedChars);

      if (remaining === 0) {
        items.push({
          documentId: entry.id,
          title: entry.name,
          relativePath: entry.relativePath,
          inclusionMode: "omitted",
          charCount: file.size,
          includedCharCount: 0,
          warnings: [],
        });
        continue;
      }

      const content = file.size > remaining
        ? await file.slice(0, remaining).text()
        : await file.text();
      const warnings = detectSecretWarnings(content);
      const contentHash = hashString(content);

      if (file.size <= remaining) {
        totalIncludedChars += content.length;
        items.push({
          documentId: entry.id,
          title: entry.name,
          relativePath: entry.relativePath,
          inclusionMode: "full",
          content,
          charCount: content.length,
          includedCharCount: content.length,
          contentHash,
          warnings,
        });
        continue;
      }

      totalIncludedChars += content.length;
      items.push({
        documentId: entry.id,
        title: entry.name,
        relativePath: entry.relativePath,
        inclusionMode: "trimmed",
        content,
        charCount: file.size,
        includedCharCount: content.length,
        contentHash,
        warnings,
      });
    } catch (error) {
      items.push({
        documentId: entry.id,
        title: entry.name,
        relativePath: entry.relativePath,
        inclusionMode: "unavailable",
        charCount: 0,
        includedCharCount: 0,
        warnings: [],
        error: (error as Error).message || "Unable to read context file",
      });
    }
  }

  return {
    items,
    totalIncludedChars,
    budget,
    hasWarnings: items.some((item) => item.warnings.length > 0),
    hasOmissions: items.some((item) => item.inclusionMode !== "full"),
  };
}

export function toContextProvenance(items: ContextPacketItem[]) {
  return items.map((item): WorkspaceContextItem => ({
    documentId: item.documentId,
    title: item.title,
    relativePath: item.relativePath,
    inclusionMode: item.inclusionMode,
    charCount: item.charCount,
    includedCharCount: item.includedCharCount,
    contentHash: item.contentHash,
    warningKinds: item.warnings.map((warning) => warning.kind),
    error: item.error,
  }));
}

export function toSuggestionWorkspaceContext(packet: ContextPacket): WorkspaceContextPacket {
  return {
    budget: packet.budget,
    totalIncludedChars: packet.totalIncludedChars,
    items: packet.items.map((item) => ({
      documentId: item.documentId,
      title: item.title,
      relativePath: item.relativePath,
      inclusionMode: item.inclusionMode,
      content: item.content,
      charCount: item.charCount,
      includedCharCount: item.includedCharCount,
      contentHash: item.contentHash,
      warningKinds: item.warnings.map((warning) => warning.kind),
      error: item.error,
    })),
  };
}
