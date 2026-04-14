# Mindmap

A modern, local-first mind mapping tool. Write your ideas in a simple text format, see them rendered as a beautiful interactive mindmap. No accounts, no servers, no subscriptions — your files live on your machine.

Built with Tauri, React, and React Flow.

---

## Features

- **Plain text format** — write mindmaps in an intuitive indented syntax, save as `.mindmap` files
- **Live preview** — canvas updates as you type
- **Native file system** — open, save, and watch files like any other app
- **URL sharing** — share a mindmap as a single URL, no server required
- **Export** — render to PNG or PDF via Rust/resvg, no Chromium needed
- **Offline first** — works entirely without an internet connection
- **Tiny footprint** — Tauri binary, not Electron

---

## The `.mindmap` format

Files are plain text with a YAML frontmatter block followed by an indented tree. Any text editor can open them.

```
---
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
    CI/CD Pipeline
```

### Syntax reference

| Syntax | Meaning |
|---|---|
| indentation (2 spaces) | nesting level |
| `!` suffix | highlight node |
| `? ` prefix | open question / decision node |
| `[color: teal]` | color override (`teal`, `purple`, `coral`, `amber`) |

---

## Tech stack

```
frontend/          Vite + React + TypeScript + React Flow
src-tauri/         Rust + Tauri
  commands/
    fs.rs          save, load, list recent files
    watch.rs       file watcher (notify crate)
    export.rs      PNG/PDF export (resvg crate)
```

The Rust layer is intentionally thin — it handles the four things the browser can't do well: native file dialogs, file watching, OS integration, and headless export. Everything else lives in TypeScript.

---

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 18+
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Install

```bash
git clone https://github.com/adotew/better-map
cd mindmap
bun install
```

### Run in development

```bash
bun run tauri dev
```

### Build

```bash
bun run tauri build
```

Produces a native installer in `src-tauri/target/release/bundle/`.

---

## Project structure

```
mindmap/
├── src/                    React frontend
│   ├── components/
│   │   ├── Editor.tsx      Text editor pane
│   │   ├── Canvas.tsx      React Flow canvas
│   │   └── Toolbar.tsx     File actions, export
│   ├── lib/
│   │   ├── parser.ts       .mindmap syntax parser
│   │   ├── layout.ts       Tree layout algorithm
│   │   └── share.ts        URL encode/decode
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   └── commands/
│   │       ├── fs.rs       File I/O commands
│   │       ├── watch.rs    File watcher
│   │       └── export.rs   PNG/PDF via resvg
│   └── Cargo.toml
├── package.json
└── README.md               you are here
```

---

## Sharing a mindmap

Any mindmap can be shared as a URL — the entire content is base64-encoded into the query string. No server, no upload.

```
https://yourdomain.com/?map=eyJ0aXRsZSI6Ik15IFByb2plY3...
```

The recipient opens the link in a browser or the desktop app and sees the rendered mindmap immediately.

---

## Roadmap

- [ ] Multiple open files / tabs
- [ ] Themes (dark, light, high contrast)
- [ ] Node links (connect arbitrary nodes across branches)
- [ ] Image nodes
- [ ] Collapse / expand branches
- [ ] Search across open file
- [ ] iCloud / Dropbox sync (via file system, not a custom backend)

---

## Contributing

Issues and PRs welcome. The parser and layout algorithm (`src/lib/`) are the best place to start — they are pure TypeScript with no framework dependencies and straightforward to test.

---

## License

MIT
