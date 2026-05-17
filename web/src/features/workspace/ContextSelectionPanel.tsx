import type { ContextPacket } from "./contextPacket";
import type { WorkspaceFileEntry } from "./workspaceTypes";

interface ContextSelectionPanelProps {
  entries: WorkspaceFileEntry[];
  packet?: ContextPacket | null;
  onRemoveContext: (documentId: string) => void;
}

export default function ContextSelectionPanel({
  entries,
  packet,
  onRemoveContext,
}: ContextSelectionPanelProps) {
  const packetById = new Map(packet?.items.map((item) => [item.documentId, item]));

  return (
    <section aria-label="Selected AI context">
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
        {entries.length === 0
          ? "No context selected."
          : `${entries.length} document${entries.length === 1 ? "" : "s"} selected`}
      </div>
      {entries.length > 0 && (
        <div style={{ fontSize: "11px", color: "#92400e", background: "#fef3c7", borderRadius: "4px", padding: "7px", marginBottom: "10px" }}>
          Selected draft text and selected context can be sent to AI review.
        </div>
      )}
      {packet && (
        <div style={{ fontSize: "11px", color: packet.hasOmissions || packet.hasWarnings ? "#92400e" : "#6b7280", marginBottom: "10px" }}>
          {packet.totalIncludedChars}/{packet.budget} context characters prepared
          {packet.hasOmissions && " · some context trimmed or omitted"}
          {packet.hasWarnings && " · warnings"}
        </div>
      )}
      <div style={{ display: "grid", gap: "8px" }}>
        {entries.map((entry) => {
          const packetItem = packetById.get(entry.id);
          const status = packetItem?.inclusionMode ?? "pending";
          return (
            <div
              key={entry.id}
              style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", alignItems: "start", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>
                <div style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.relativePath}</div>
                <div style={{ fontSize: "11px", color: status === "full" ? "#047857" : status === "pending" ? "#6b7280" : "#92400e" }}>
                  {status === "full" ? "Will send whole" : status === "trimmed" ? "Will send trimmed" : status === "omitted" ? "Omitted by budget" : status === "unavailable" ? "Unavailable" : "Not prepared yet"}
                  {packetItem?.error && ` · ${packetItem.error}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveContext(entry.id)}
                aria-label={`Remove ${entry.name} from context`}
                title="Remove from context"
                style={{ width: "30px", height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", background: "#fff", color: "#374151", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
