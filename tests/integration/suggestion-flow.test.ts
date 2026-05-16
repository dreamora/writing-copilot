// Integration tests for suggestion flow (bun:sqlite in-memory + StubSuggestionProvider)
import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";
import type { SuggestionProvider } from "../../src/adapters/ai/SuggestionProvider";
import { EventWriter } from "../../src/domain/telemetry/event-writer";
import type { SuggestionRequest, SuggestionResponse } from "../../src/domain/suggestions/suggestion-types";
import { readFileSync } from "fs";
import { join } from "path";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "003_suggestions.sql", "004_telemetry.sql", "006_tool_for_thought.sql"]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
  return db;
}

class ThoughtProvider implements SuggestionProvider {
  async suggest(): Promise<SuggestionResponse> {
    return {
      issueSummary: "The source claim needs a decision lens.",
      rationale: "A lens and provocation keep the user engaged with the material.",
      proposedText: "Use the consumer preference evidence to stage a reversible packaging test.",
      shownEdit: {
        editType: "decision-framing",
        proposedText: "Use the consumer preference evidence to stage a reversible packaging test.",
        whyThisEdit: "It shows the edit as a strategic move, not just polished prose.",
      },
      lenses: [
        {
          name: "consumer preference",
          focus: "Which findings change the packaging decision.",
          sourceSignals: ["consumers prefer sustainable packaging when convenience holds"],
          relevance: "Prevents generic summarization of the source.",
        },
      ],
      provocations: [
        {
          kind: "alternative",
          stage: "source-processing",
          prompt: "Which segment would reject this packaging change despite the aggregate trend?",
          whyItMatters: "It pushes the reader to test the source before drafting.",
          optional: true,
        },
      ],
      riskNotes: null,
      confidence: 0.77,
    };
  }
}

const BASE_REQ: SuggestionRequest = {
  documentId: "doc-test",
  blockId: "block-001",
  selection: { charStart: 5, charEnd: 25, selectedText: "this is a test sentence" },
  actionType: "rewrite",
  context: { before: "Some context before.", after: "Some context after." },
};

describe("Suggestion flow (integration)", () => {
  let db: Database;
  let service: SuggestionService;

  beforeEach(() => {
    db = createTestDb();
    const ew = new EventWriter(db);
    service = new SuggestionService(db, new StubSuggestionProvider(), ew);
  });

  it("creates a suggestion and persists it", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    expect(s.id).toBeTruthy();
    expect(s.status).toBe("open");
    expect(s.documentId).toBe("doc-test");
    expect(s.proposedText).toContain("this is a test sentence");
  });

  it("accept transitions status to accepted with decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const accepted = service.transition(s.id, "accepted");
    expect(accepted?.status).toBe("accepted");
    expect(accepted?.decidedAt).toBeTruthy();
  });

  it("reject transitions status to rejected with decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const rejected = service.transition(s.id, "rejected");
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.decidedAt).toBeTruthy();
  });

  it("edit-apply stores edited text and sets decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const applied = service.transition(s.id, "edited_applied", "my edited version");
    expect(applied?.status).toBe("edited_applied");
    expect(applied?.editedText).toBe("my edited version");
    expect(applied?.decidedAt).toBeTruthy();
  });

  it("defer keeps status deferred without decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const deferred = service.transition(s.id, "deferred");
    expect(deferred?.status).toBe("deferred");
    expect(deferred?.decidedAt).toBeFalsy();
  });

  it("getSuggestionsForDocument returns all for document", async () => {
    await service.createSuggestion(BASE_REQ);
    await service.createSuggestion({ ...BASE_REQ, blockId: "block-002" });
    const all = service.getSuggestionsForDocument("doc-test");
    expect(all.length).toBe(2);
  });

  it("getSuggestionById returns null for unknown suggestion id", () => {
    const result = service.getById("nonexistent");
    expect(result).toBeNull();
  });

  it("full lifecycle: open -> accepted", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    service.transition(s.id, "accepted");
    const fetched = service.getById(s.id);
    expect(fetched?.status).toBe("accepted");
    expect(fetched?.decidedAt).toBeTruthy();
  });

  it("persists tool-for-thought metadata with the suggestion", async () => {
    const ew = new EventWriter(db);
    const thoughtService = new SuggestionService(db, new ThoughtProvider(), ew);
    const s = await thoughtService.createSuggestion({
      ...BASE_REQ,
      workflowStage: "source-processing",
      activeLens: "consumer preference",
    });

    expect(s.workflowStage).toBe("source-processing");
    expect(s.activeLens).toBe("consumer preference");
    expect(s.shownEdit?.editType).toBe("decision-framing");
    expect(s.lenses?.[0]?.name).toBe("consumer preference");
    expect(s.provocations?.[0]?.stage).toBe("source-processing");

    const fetched = thoughtService.getById(s.id);
    expect(fetched?.shownEdit?.whyThisEdit).toContain("strategic move");
    expect(fetched?.lenses?.[0]?.sourceSignals[0]).toContain("convenience");
    expect(fetched?.provocations?.[0]?.prompt).toContain("Which segment");
  });
});
