import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

function filenameFromPath(path: string): string {
  return path.split("/").pop()?.split("\\").pop() ?? path;
}

function App() {
  const [source, setSource] = useState(EXAMPLE);
  const [filePath, setFilePath] = useState<string | null>(null);
  const dirty = useRef(false);

  const { nodes, edges } = useMemo(() => {
    const tree = parseMindmap(source);
    return layoutTree(tree);
  }, [source]);

  const updateSource = useCallback((value: string) => {
    setSource(value);
    dirty.current = true;
  }, []);

  const handleOpen = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Mindmap", extensions: ["mindmap"] }],
    });
    if (!selected) return;

    const path = typeof selected === "string" ? selected : selected;
    const content = await invoke<string>("open_file", { path });
    setSource(content);
    setFilePath(path);
    dirty.current = false;
    await getCurrentWindow().setTitle(filenameFromPath(path));
  }, []);

  const handleSave = useCallback(async () => {
    let path = filePath;

    if (!path) {
      const selected = await save({
        filters: [{ name: "Mindmap", extensions: ["mindmap"] }],
      });
      if (!selected) return;
      path = selected;
      setFilePath(path);
    }

    await invoke("save_file", { path, content: source });
    dirty.current = false;
    await getCurrentWindow().setTitle(filenameFromPath(path));
  }, [filePath, source]);

  return (
    <div className="flex h-screen w-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="flex w-1/2 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={handleOpen}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Open
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Save
          </button>
          {filePath && (
            <span className="truncate text-xs text-gray-400">
              {filePath}
            </span>
          )}
        </div>
        <textarea
          className="min-h-0 flex-1 resize-none rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm leading-relaxed outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-500"
          value={source}
          onChange={(e) => updateSource(e.target.value)}
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
