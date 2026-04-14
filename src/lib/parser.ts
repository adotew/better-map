export interface MindmapNode {
  label: string;
  color: string | null;
  highlight: boolean;
  decision: boolean;
  children: MindmapNode[];
}

function makeNode(label: string): MindmapNode {
  return { label, color: null, highlight: false, decision: false, children: [] };
}

function stripFrontmatter(src: string): string {
  const trimmed = src.trimStart();
  if (!trimmed.startsWith("---")) return src;
  const end = trimmed.indexOf("---", 3);
  if (end === -1) return src;
  return trimmed.slice(end + 3);
}

function parseLine(raw: string): { indent: number; node: MindmapNode } | null {
  if (raw.trim() === "") return null;

  const indent = (raw.length - raw.trimStart().length) / 2;
  let text = raw.trim();

  // Decision: ? prefix
  let decision = false;
  if (text.startsWith("? ")) {
    decision = true;
    text = text.slice(2);
  }

  // Color modifier: [color: x]
  let color: string | null = null;
  const colorMatch = text.match(/\s*\[color:\s*(\w+)\]\s*$/);
  if (colorMatch) {
    color = colorMatch[1];
    text = text.slice(0, text.length - colorMatch[0].length);
  }

  // Highlight: trailing !
  let highlight = false;
  if (text.endsWith(" !") || text === "!") {
    highlight = true;
    text = text === "!" ? "" : text.slice(0, -2);
  }

  const node = makeNode(text.trim());
  node.color = color;
  node.highlight = highlight;
  node.decision = decision;

  return { indent, node };
}

export function parseMindmap(src: string): MindmapNode {
  const body = stripFrontmatter(src);
  const lines = body.split("\n");

  // stack: [indent, node] — tracks the current ancestry path
  const stack: [number, MindmapNode][] = [];
  const roots: MindmapNode[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { indent, node } = parsed;

    // Pop stack until we find the parent (last entry with indent < current)
    while (stack.length > 0 && stack[stack.length - 1][0] >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1][1].children.push(node);
    }

    stack.push([indent, node]);
  }

  if (roots.length === 0) return makeNode("");
  if (roots.length === 1) return roots[0];

  const root = makeNode("Root");
  root.children = roots;
  return root;
}

// --------------- Inline tests ---------------

function runTests() {
  // Test 1: Basic tree
  const t1 = parseMindmap("A\n  B\n  C\n    D");
  console.assert(t1.label === "A", "t1: root label");
  console.assert(t1.children.length === 2, "t1: two children");
  console.assert(t1.children[0].label === "B", "t1: first child");
  console.assert(t1.children[1].label === "C", "t1: second child");
  console.assert(t1.children[1].children[0].label === "D", "t1: nested child");

  // Test 2: Highlight
  const t2 = parseMindmap("React !");
  console.assert(t2.highlight === true, "t2: highlight");
  console.assert(t2.label === "React", "t2: label without !");

  // Test 3: Decision
  const t3 = parseMindmap("? GraphQL or REST");
  console.assert(t3.decision === true, "t3: decision");
  console.assert(t3.label === "GraphQL or REST", "t3: label without ?");

  // Test 4: Color modifier
  const t4 = parseMindmap("Backend [color: teal]");
  console.assert(t4.color === "teal", "t4: color");
  console.assert(t4.label === "Backend", "t4: label without color");

  // Test 5: Frontmatter stripping
  const t5 = parseMindmap("---\ntitle: Test\n---\nRoot\n  Child");
  console.assert(t5.label === "Root", "t5: frontmatter stripped");
  console.assert(t5.children.length === 1, "t5: child present");

  // Test 6: Deep nesting
  const t6 = parseMindmap("A\n  B\n    C\n      D\n        E");
  let node = t6;
  for (const expected of ["A", "B", "C", "D", "E"]) {
    console.assert(node.label === expected, `t6: ${expected}`);
    node = node.children[0] || makeNode("");
  }

  // Test 7: Mixed features
  const t7 = parseMindmap("? Should we use GraphQL ! [color: coral]");
  console.assert(t7.decision === true, "t7: decision");
  console.assert(t7.highlight === true, "t7: highlight");
  console.assert(t7.color === "coral", "t7: color");
  console.assert(t7.label === "Should we use GraphQL", "t7: clean label");

  // Test 8: Multiple top-level nodes
  const t8 = parseMindmap("A\nB\nC");
  console.assert(t8.label === "Root", "t8: virtual root");
  console.assert(t8.children.length === 3, "t8: three children");

  // Test 9: Empty input
  const t9 = parseMindmap("");
  console.assert(t9.label === "", "t9: empty input");

  // Test 10: README example
  const readme = `---
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
  const t10 = parseMindmap(readme);
  console.assert(t10.label === "My Project", "t10: root");
  console.assert(t10.children.length === 3, "t10: 3 branches");
  console.assert(t10.children[0].children[0].highlight === true, "t10: React highlighted");
  console.assert(t10.children[0].children[2].decision === true, "t10: GraphQL decision");
  console.assert(t10.children[1].color === "teal", "t10: Backend teal");

  console.log("All parser tests passed.");
}

runTests();
