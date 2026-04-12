import { describe, it, expect } from "bun:test";
import { normalizeEvent } from "../../src/domain/telemetry/event-normalizer";

describe("Telemetry event normalizer", () => {
  it("accepts valid event input", () => {
    const event = normalizeEvent({
      sessionId: "session-1",
      documentId: "doc-1",
      eventType: "suggestion_created",
      blockId: "block-1",
      suggestionId: "sug-1",
      payload: { actionType: "rewrite" },
    });
    expect(event.id).toBeTruthy();
    expect(event.eventType).toBe("suggestion_created");
    expect(event.actor).toBe("user");
    expect(event.payload.actionType).toBe("rewrite");
  });

  it("throws on unknown eventType", () => {
    expect(() =>
      normalizeEvent({ sessionId: "s1", documentId: "d1", eventType: "unknown_event" })
    ).toThrow("Unknown eventType");
  });

  it("throws on empty sessionId", () => {
    expect(() =>
      normalizeEvent({ sessionId: "", documentId: "d1", eventType: "suggestion_created" })
    ).toThrow("sessionId");
  });

  it("throws on empty documentId", () => {
    expect(() =>
      normalizeEvent({ sessionId: "s1", documentId: "  ", eventType: "suggestion_created" })
    ).toThrow("documentId");
  });

  it("uses system actor when specified", () => {
    const event = normalizeEvent({
      sessionId: "s1", documentId: "d1",
      eventType: "suggestion_created", actor: "system",
    });
    expect(event.actor).toBe("system");
  });

  it("assigns unique IDs to each event", () => {
    const e1 = normalizeEvent({ sessionId: "s1", documentId: "d1", eventType: "suggestion_created" });
    const e2 = normalizeEvent({ sessionId: "s1", documentId: "d1", eventType: "suggestion_accepted" });
    expect(e1.id).not.toBe(e2.id);
  });

  it("defaults payload to empty object", () => {
    const event = normalizeEvent({ sessionId: "s1", documentId: "d1", eventType: "block_focus_started" });
    expect(event.payload).toEqual({});
  });
});
