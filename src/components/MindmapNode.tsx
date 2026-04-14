import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { MindmapNodeData } from "../lib/layout";

const COLOR_BG: Record<string, string> = {
  teal: "bg-teal-500 text-white",
  purple: "bg-purple-500 text-white",
  coral: "bg-red-400 text-white",
  amber: "bg-amber-400 text-gray-900",
};

type MindmapNodeType = Node<MindmapNodeData, "mindmap">;
type HighlightNodeType = Node<MindmapNodeData, "mindmapHighlight">;
type DecisionNodeType = Node<MindmapNodeData, "mindmapDecision">;

export function MindmapDefaultNode({ data }: NodeProps<MindmapNodeType>) {
  const colorClass = data.color
    ? COLOR_BG[data.color] ?? "bg-white dark:bg-gray-800"
    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";

  return (
    <div
      className={`rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm dark:border-gray-600 ${colorClass}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
}

export function MindmapHighlightNode({ data }: NodeProps<HighlightNodeType>) {
  const colorClass = data.color
    ? COLOR_BG[data.color] ?? "bg-blue-500 text-white"
    : "bg-blue-500 text-white";

  return (
    <div
      className={`rounded-lg px-4 py-2 text-sm font-bold shadow-md ${colorClass}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-white" />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} className="!bg-white" />
    </div>
  );
}

export function MindmapDecisionNode({ data }: NodeProps<DecisionNodeType>) {
  return (
    <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-sm dark:bg-amber-900/30 dark:text-amber-200">
      <Handle type="target" position={Position.Left} className="!bg-amber-400" />
      <span className="mr-1 font-bold">?</span>
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} className="!bg-amber-400" />
    </div>
  );
}
