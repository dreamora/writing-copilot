import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";
import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { EventWriter } from "../../src/domain/telemetry/event-writer";
import {
  buildContextPacket,
  toSuggestionWorkspaceContext,
} from "../../web/src/features/workspace/contextPacket";
import {
  createWorkspaceDocumentSource,
} from "../../web/src/features/editor/documentSource";
import type { WorkspaceFileEntry } from "../../web/src/features/workspace/workspaceTypes";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of [
    "001_init.sql",
    "003_suggestions.sql",
    "004_telemetry.sql",
    "006_tool_for_thought.sql",
    "007_professional_mode_context.sql",
    "008_suggestion_context_provenance.sql",
  ]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
  return db;
}

function workspaceEntry(relativePath: string, content: string): WorkspaceFileEntry {
  const name = relativePath.split("/").pop()!;
  let currentContent = content;
  return {
    id: `workspace:test:${relativePath}`,
    name,
    relativePath,
    extension: name.endsWith(".markdown") ? ".markdown" : ".md",
    status: "available",
    handle: {
      kind: "file",
      name,
      getFile: async () => new File([currentContent], name),
      createWritable: async () => ({
        write: async (next: string) => {
          currentContent = next;
        },
        close: async () => {},
      }),
    },
  };
}

describe("local workspace context integration", () => {
  it("loads a workspace draft and persists selected context provenance", async () => {
    const draft = workspaceEntry("drafts/draft.md", "Original draft text.");
    const source = workspaceEntry("sources/source.md", "Source note sharpens the claim.");
    const draftSource = createWorkspaceDocumentSource(draft);
    const loaded = await draftSource.load();
    const packet = await buildContextPacket([source], { budget: 1000 });
    const db = createTestDb();
    const service = new SuggestionService(db, new StubSuggestionProvider(), new EventWriter(db));

    await draftSource.save("Updated draft text.");
    const saved = await draftSource.load();
    const suggestion = await service.createSuggestion({
      documentId: draftSource.documentId,
      blockId: "block-1",
      selection: { charStart: 0, charEnd: 8, selectedText: "Original" },
      actionType: "evidence-stress-test",
      context: { before: "", after: loaded.content },
      workspaceContext: toSuggestionWorkspaceContext(packet),
      workflowStage: "source-processing",
      activeLens: "evidence-quality",
    });

    expect(saved.content).toBe("Updated draft text.");
    expect(suggestion.documentId).toBe("workspace:test:drafts/draft.md");
    expect(suggestion.workspaceContext?.[0]?.relativePath).toBe("sources/source.md");
    expect(JSON.stringify(suggestion.workspaceContext)).not.toContain("Source note sharpens");
  });
});
