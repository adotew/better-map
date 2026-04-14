import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Menu, Submenu } from "@tauri-apps/api/menu";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { parseMindmap } from "./lib/parser";
import { layoutTree } from "./lib/layout";
import { addRecentFile, getRecentFiles, type RecentFile } from "./lib/db";
import { useTheme } from "./context/theme";
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

function minimapNodeColor(node: Node): string {
  if (node.type === "mindmapHighlight") return "var(--node-highlight-bg)";
  if (node.type === "mindmapDecision") return "var(--node-decision-border)";
  return "var(--node-default-border)";
}

async function syncRecentSubmenu(
  submenu: Submenu,
  recentFiles: RecentFile[],
  openRecent: (path: string) => Promise<void>
) {
  let currentItems = await submenu.items();
  while (currentItems.length > 0) {
    await submenu.removeAt(0);
    currentItems = await submenu.items();
  }

  if (recentFiles.length === 0) {
    await submenu.append({
      id: "file-recent-empty",
      text: "No recent files",
      enabled: false,
    });
    return;
  }

  await submenu.append(
    recentFiles.map((rf) => ({
      id: `file-recent-${rf.id ?? rf.path}`,
      text: rf.title,
      action: () => {
        void openRecent(rf.path);
      },
    }))
  );
}

function App() {
  const theme = useTheme();
  const [source, setSource] = useState(EXAMPLE);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [externalContent, setExternalContent] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showEditor, setShowEditor] = useState(
    () => localStorage.getItem("showEditor") !== "false"
  );
  const [showMinimap, setShowMinimap] = useState(
    () => localStorage.getItem("minimap") !== "false"
  );
  const dirtyRef = useRef(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const menuRecentSubmenuRef = useRef<Submenu | null>(null);
  const handleOpenRef = useRef<(() => Promise<void>) | null>(null);
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const openFilePathRef = useRef<((path: string) => Promise<void>) | null>(null);
  const toggleEditorRef = useRef<(() => void) | null>(null);

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

  const toggleMinimap = useCallback(() => {
    setShowMinimap((prev) => {
      const next = !prev;
      localStorage.setItem("minimap", String(next));
      return next;
    });
  }, []);

  const toggleEditor = useCallback(() => {
    setShowEditor((prev) => {
      const next = !prev;
      localStorage.setItem("showEditor", String(next));
      return next;
    });
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
      } else if (e.key === "e") {
        e.preventDefault();
        toggleEditor();
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMinimap();
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

  useEffect(() => {
    handleOpenRef.current = handleOpen;
    handleSaveRef.current = handleSave;
    openFilePathRef.current = openFilePath;
    toggleEditorRef.current = toggleEditor;
  }, [handleOpen, handleSave, openFilePath, toggleEditor]);

  useEffect(() => {
    let cancelled = false;
    let appMenu: Menu | null = null;
    let fileSubmenu: Submenu | null = null;
    let recentSubmenu: Submenu | null = null;
    let viewSubmenu: Submenu | null = null;

    async function setupNativeMenu() {
      recentSubmenu = await Submenu.new({
        id: "file-recent",
        text: "Recent",
      });

      fileSubmenu = await Submenu.new({
        id: "file",
        text: "File",
        items: [
          {
            id: "file-open",
            text: "Open",
            accelerator: "CmdOrCtrl+O",
            action: () => {
              void handleOpenRef.current?.();
            },
          },
          {
            id: "file-save",
            text: "Save",
            accelerator: "CmdOrCtrl+S",
            action: () => {
              void handleSaveRef.current?.();
            },
          },
          recentSubmenu,
        ],
      });

      viewSubmenu = await Submenu.new({
        id: "view",
        text: "View",
        items: [
          {
            id: "view-toggle-editor",
            text: "Toggle Editor",
            accelerator: "CmdOrCtrl+E",
            action: () => {
              toggleEditorRef.current?.();
            },
          },
        ],
      });

      appMenu = await Menu.new({
        id: "better-map-menu",
        items: [fileSubmenu, viewSubmenu],
      });
      await appMenu.setAsAppMenu();

      if (cancelled) return;

      menuRecentSubmenuRef.current = recentSubmenu;
      const openRecent = openFilePathRef.current;
      if (openRecent) {
        await syncRecentSubmenu(recentSubmenu, recentFiles, openRecent);
      }
    }

    setupNativeMenu().catch((error) => {
      console.error("Failed to create native File menu", error);
    });

    return () => {
      cancelled = true;
      menuRecentSubmenuRef.current = null;
      void appMenu?.close();
      void fileSubmenu?.close();
      void recentSubmenu?.close();
      void viewSubmenu?.close();
    };
  }, []);

  useEffect(() => {
    const recentSubmenu = menuRecentSubmenuRef.current;
    const openRecent = openFilePathRef.current;
    if (!recentSubmenu || !openRecent) return;

    syncRecentSubmenu(recentSubmenu, recentFiles, openRecent).catch((error) => {
      console.error("Failed to update Recent submenu", error);
    });
  }, [recentFiles]);

  return (
    <div
      className="flex h-screen w-screen"
      style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}
    >
      {showEditor && (
        <div className="flex w-1/2 flex-col p-4">
        {/* Toolbar */}
        <div className="mb-2 flex items-center gap-2">
          {filePath && (
            <span
              className="truncate text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {filePath}
              {isDirty && " (unsaved)"}
            </span>
          )}
        </div>

        {/* External change banner */}
        {externalContent !== null && (
          <div
            className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
            style={{
              background: theme === "dark" ? "rgba(120,53,15,0.3)" : "#fffbeb",
              color: theme === "dark" ? "#fde68a" : "#78350f",
            }}
          >
            <span className="flex-1">File changed externally — reload?</span>
            <button
              onClick={acceptExternalChange}
              className="rounded bg-amber-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              Reload
            </button>
            <button
              onClick={dismissExternalChange}
              className="rounded px-2 py-0.5 text-xs font-medium text-amber-600 hover:text-amber-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Editor */}
        <textarea
          className="min-h-0 flex-1 resize-none rounded-lg border p-4 font-mono text-sm leading-relaxed outline-none"
          style={{
            background: "var(--bg-editor)",
            color: "var(--text-primary)",
            borderColor: "var(--border)",
            tabSize: 2,
          }}
          value={source}
          onChange={(e) => updateSource(e.target.value)}
          spellCheck={false}
        />
        </div>
      )}

      {/* Canvas */}
      <div
        className={`flex-1 ${showEditor ? "border-l" : ""}`}
        style={{ borderColor: "var(--border)" }}
      >
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
          {showMinimap && (
            <MiniMap
              nodeColor={minimapNodeColor}
              position="bottom-right"
              style={{
                background: "var(--xy-minimap-background-color)",
              }}
            />
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
