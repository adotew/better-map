import type { Node, Edge } from "@xyflow/react";
import type { MindmapNode } from "./parser";

export type MindmapNodeData = {
  label: string;
  color: string | null;
  highlight: boolean;
  decision: boolean;
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;
const H_GAP = 60;
const V_GAP = 16;

/** Measure the height (in px) a subtree needs, based on leaf count. */
function subtreeHeight(node: MindmapNode): number {
  if (node.children.length === 0) return NODE_HEIGHT;
  let total = 0;
  for (const child of node.children) {
    total += subtreeHeight(child);
  }
  // gaps between children
  total += (node.children.length - 1) * V_GAP;
  return total;
}

export function layoutTree(
  root: MindmapNode
): { nodes: Node<MindmapNodeData>[]; edges: Edge[] } {
  const nodes: Node<MindmapNodeData>[] = [];
  const edges: Edge[] = [];
  let idCounter = 0;

  function walk(
    node: MindmapNode,
    depth: number,
    top: number,
    height: number,
    parentId: string | null
  ) {
    const id = String(idCounter++);
    const x = depth * (NODE_WIDTH + H_GAP);
    const y = top + height / 2 - NODE_HEIGHT / 2;

    let nodeType = "mindmap";
    if (node.highlight) nodeType = "mindmapHighlight";
    if (node.decision) nodeType = "mindmapDecision";

    nodes.push({
      id,
      type: nodeType,
      position: { x, y },
      data: {
        label: node.label,
        color: node.color,
        highlight: node.highlight,
        decision: node.decision,
      },
    });

    if (parentId !== null) {
      edges.push({
        id: `e${parentId}-${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
      });
    }

    // Layout children
    if (node.children.length > 0) {
      const childHeights = node.children.map(subtreeHeight);
      const totalChildrenHeight =
        childHeights.reduce((a, b) => a + b, 0) +
        (node.children.length - 1) * V_GAP;
      let childTop = top + height / 2 - totalChildrenHeight / 2;

      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], depth + 1, childTop, childHeights[i], id);
        childTop += childHeights[i] + V_GAP;
      }
    }
  }

  const totalHeight = subtreeHeight(root);
  walk(root, 0, 0, totalHeight, null);
  return { nodes, edges };
}
