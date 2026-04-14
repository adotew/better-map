import { useState } from "react";
import { parseMindmap, type MindmapNode } from "./lib/parser";
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

const COLOR_CLASSES: Record<string, string> = {
  teal: "text-teal-600 dark:text-teal-400",
  purple: "text-purple-600 dark:text-purple-400",
  coral: "text-red-400 dark:text-red-300",
  amber: "text-amber-500 dark:text-amber-400",
};

function TreeView({ node }: { node: MindmapNode }) {
  const colorClass = node.color ? COLOR_CLASSES[node.color] ?? "" : "";

  return (
    <li className={`py-0.5 ${colorClass}`}>
      <span className={node.highlight ? "font-bold" : ""}>
        {node.decision && (
          <span className="font-bold text-purple-500">? </span>
        )}
        {node.label || "(empty)"}
        {node.highlight && (
          <span className="ml-1 font-bold text-orange-500">!</span>
        )}
      </span>
      {node.children.length > 0 && (
        <ul className="ml-5 mt-0.5 list-none">
          {node.children.map((child, i) => (
            <TreeView key={i} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

function App() {
  const [source, setSource] = useState(EXAMPLE);
  const tree = parseMindmap(source);

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
      <div className="w-1/2 overflow-y-auto border-l border-gray-200 p-6 dark:border-gray-800">
        <ul className="list-none">
          <TreeView node={tree} />
        </ul>
      </div>
    </div>
  );
}

export default App;
