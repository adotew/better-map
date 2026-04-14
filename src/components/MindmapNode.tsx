import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { MindmapNodeData } from "../lib/layout";

// Named color overrides (apply as inline background over the default node style)
const COLOR_INLINE: Record<string, { background: string; color: string }> = {
  teal:   { background: "#14b8a6", color: "#ffffff" },
  purple: { background: "#a855f7", color: "#ffffff" },
  coral:  { background: "#f87171", color: "#ffffff" },
  amber:  { background: "#f59e0b", color: "#111827" },
};

type MindmapNodeType     = Node<MindmapNodeData, "mindmap">;
type HighlightNodeType   = Node<MindmapNodeData, "mindmapHighlight">;
type DecisionNodeType    = Node<MindmapNodeData, "mindmapDecision">;

export function MindmapDefaultNode({ data }: NodeProps<MindmapNodeType>) {
  const override = data.color ? COLOR_INLINE[data.color] : null;

  const style = override
    ? { background: override.background, color: override.color, borderColor: "transparent" }
    : {
        background: "var(--node-default-bg)",
        color: "var(--node-default-text)",
        borderColor: "var(--node-default-border)",
      };

  return (
    <div
      className="rounded-lg border px-4 py-2 text-sm shadow-sm"
      style={style}
    >
      <Handle type="target" position={Position.Left} style={{ background: "var(--node-default-border)" }} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} style={{ background: "var(--node-default-border)" }} />
    </div>
  );
}

export function MindmapHighlightNode({ data }: NodeProps<HighlightNodeType>) {
  const override = data.color ? COLOR_INLINE[data.color] : null;

  const style = override
    ? { background: override.background, color: override.color }
    : {
        background: "var(--node-highlight-bg)",
        color: "var(--node-highlight-text)",
      };

  return (
    <div
      className="rounded-lg px-4 py-2 text-sm font-bold shadow-md"
      style={style}
    >
      <Handle type="target" position={Position.Left} style={{ background: "rgba(255,255,255,0.6)" }} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} style={{ background: "rgba(255,255,255,0.6)" }} />
    </div>
  );
}

export function MindmapDecisionNode({ data }: NodeProps<DecisionNodeType>) {
  return (
    <div
      className="rounded-lg border-2 border-dashed px-4 py-2 text-sm shadow-sm"
      style={{
        background: "var(--node-decision-bg)",
        color: "var(--node-decision-text)",
        borderColor: "var(--node-decision-border)",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "var(--node-decision-border)" }} />
      <span className="mr-1 font-bold">?</span>
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} style={{ background: "var(--node-decision-border)" }} />
    </div>
  );
}
