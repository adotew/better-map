import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { parseMindmap } from "./lib/parser";
import { layoutTree } from "./lib/layout";
import {
  MindmapDefaultNode,
  MindmapHighlightNode,
  MindmapDecisionNode,
} from "./components/MindmapNode";
import "./App.css";

const EXAMPLE = `---
title: My Project
created: 2026-04-14
theme: default
---

My Project
  Frontend
    React !
    TypeScript
    ? GraphQL or REST
  Backend [color: teal]
    Node.js
    PostgreSQL
  Deployment
    Docker
    CI/CD Pipeline`;

const nodeTypes: NodeTypes = {
  mindmap: MindmapDefaultNode,
  mindmapHighlight: MindmapHighlightNode,
  mindmapDecision: MindmapDecisionNode,
};

function App() {
  const [source, setSource] = useState(EXAMPLE);

  const { nodes, edges } = useMemo(() => {
    const tree = parseMindmap(source);
    return layoutTree(tree);
  }, [source]);

  return (
    <div className="flex h-screen w-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-1/2 p-4">
        <textarea
          className="h-full w-full resize-none rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm leading-relaxed outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-500"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          style={{ tabSize: 2 }}
        />
      </div>
      <div className="w-1/2 border-l border-gray-200 dark:border-gray-800">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
