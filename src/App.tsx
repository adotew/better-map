import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { parseMindmap } from "./lib/parser";
import { layoutTree } from "./lib/layout";
import { addRecentFile, getRecentFiles, type RecentFile } from "./lib/db";
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
  const [isDirty, setIsDirty] = useState(false);
  const [externalContent, setExternalContent] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const dirtyRef = useRef(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  const { nodes, edges } = useMemo(() => {
    const tree = parseMindmap(source);
    return layoutTree(tree);
  }, [source]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    dirtyRef.current = false;
    setIsDirty(false);
  }, []);

  const updateSource = useCallback(
    (value: string) => {
      setSource(value);
      markDirty();
    },
    [markDirty]
  );

  const refreshRecent = useCallback(async () => {
    setRecentFiles(await getRecentFiles(5));
  }, []);

  // Load recent files on mount
  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  // Close-requested guard
  useEffect(() => {
    const win = getCurrentWindow();
    const unlisten = win.onCloseRequested(async (event) => {
      if (!dirtyRef.current) return;
      const confirmed = await ask(
        "You have unsaved changes. Quit anyway?",
        { title: "Unsaved Changes", kind: "warning" }
      );
      if (!confirmed) {
        event.preventDefault();
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "s" && e.shiftKey) {
        e.preventDefault();
        handleSaveAs();
      } else if (e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "o") {
        e.preventDefault();
        handleOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // File watcher
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }

      if (!filePath) {
        await invoke("unwatch_file").catch(() => {});
        return;
      }

      await invoke("watch_file", { path: filePath });

      const unlisten = await listen<string>("file-changed", (event) => {
        if (cancelled) return;
        if (dirtyRef.current) {
          setExternalContent(event.payload);
        } else {
          setSource(event.payload);
        }
      });

      if (cancelled) {
        unlisten();
      } else {
        unlistenRef.current = unlisten;
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      invoke("unwatch_file").catch(() => {});
    };
  }, [filePath]);

  const acceptExternalChange = useCallback(() => {
    if (externalContent !== null) {
      setSource(externalContent);
      setExternalContent(null);
      markClean();
    }
  }, [externalContent, markClean]);

  const dismissExternalChange = useCallback(() => {
    setExternalContent(null);
  }, []);

  const openFilePath = useCallback(
    async (path: string) => {
      const content = await invoke<string>("open_file", { path });
      setSource(content);
      setFilePath(path);
      setExternalContent(null);
      markClean();
      const name = filenameFromPath(path);
      await getCurrentWindow().setTitle(name);
      await addRecentFile(path, name);
      await refreshRecent();
    },
    [markClean, refreshRecent]
  );

  const handleOpen = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Mindmap", extensions: ["mindmap"] }],
    });
    if (!selected) return;
    await openFilePath(selected);
  }, [openFilePath]);

  const handleSave = useCallback(async () => {
    let path = filePath;

    if (!path) {
      const selected = await save({
        filters: [{ name: "Mindmap", extensions: ["mindmap"] }],
      });
      if (!selected) return;
      path = selected;
      setFilePath(path);
      const name = filenameFromPath(path);
      await addRecentFile(path, name);
      await refreshRecent();
    }

    await invoke("save_file", { path, content: source });
    markClean();
    setExternalContent(null);
    await getCurrentWindow().setTitle(filenameFromPath(path));
  }, [filePath, source, markClean, refreshRecent]);

  const handleSaveAs = useCallback(async () => {
    const selected = await save({
      filters: [{ name: "Mindmap", extensions: ["mindmap"] }],
    });
    if (!selected) return;

    await invoke("save_file", { path: selected, content: source });
    setFilePath(selected);
    markClean();
    setExternalContent(null);
    const name = filenameFromPath(selected);
    await getCurrentWindow().setTitle(name);
    await addRecentFile(selected, name);
    await refreshRecent();
  }, [source, markClean, refreshRecent]);

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
          <div className="relative">
            <button
              onClick={() => setShowRecent((v) => !v)}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Recent
            </button>
            {showRecent && (
              <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {recentFiles.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No recent files
                  </div>
                ) : (
                  recentFiles.map((rf) => (
                    <button
                      key={rf.id}
                      onClick={async () => {
                        setShowRecent(false);
                        await openFilePath(rf.path);
                      }}
                      className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={rf.path}
                    >
                      {rf.title}
                      <span className="ml-2 text-xs text-gray-400">
                        {rf.path}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {filePath && (
            <span className="truncate text-xs text-gray-400">
              {filePath}
              {isDirty && " (unsaved)"}
            </span>
          )}
        </div>
        {externalContent !== null && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            <span className="flex-1">File changed externally — reload?</span>
            <button
              onClick={acceptExternalChange}
              className="rounded bg-amber-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              Reload
            </button>
            <button
              onClick={dismissExternalChange}
              className="rounded px-2 py-0.5 text-xs font-medium text-amber-600 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-100"
            >
              Dismiss
            </button>
          </div>
        )}
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
