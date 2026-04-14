import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorSelection } from "@codemirror/state";
import { keymap, EditorView } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import {
  HighlightStyle,
  type StreamParser,
  StreamLanguage,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

type MindmapParserState = {
  inFrontmatter: boolean;
};

type MindmapEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const mindmapParser: StreamParser<MindmapParserState> = {
  startState() {
    return { inFrontmatter: false };
  },
  token(stream, state) {
    if (stream.sol() && stream.match(/\s*---\s*$/)) {
      state.inFrontmatter = !state.inFrontmatter;
      return "meta";
    }

    if (stream.sol() && stream.match(/\s*#.*$/)) {
      return "comment";
    }

    if (stream.sol() && stream.match(/\s*\?.*$/)) {
      return "keyword";
    }

    if (state.inFrontmatter && stream.match(/\s*[A-Za-z_][\w-]*(?=\s*:)/)) {
      return "property";
    }

    if (stream.match(/\[color:\s*[^\]]+\]/)) {
      return "atom";
    }

    if (stream.match(/![ \t]*(?=$)/)) {
      return "emphasis";
    }

    stream.next();
    return null;
  },
};

const mindmapLanguage = StreamLanguage.define(mindmapParser);

const mindmapHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.meta, color: "var(--text-muted)" },
    { tag: tags.comment, color: "var(--text-muted)", fontStyle: "italic" },
    { tag: tags.propertyName, color: "#60a5fa" },
    { tag: tags.keyword, color: "#f59e0b", fontWeight: "600" },
    { tag: tags.atom, color: "#14b8a6" },
    { tag: tags.emphasis, color: "#a78bfa", fontWeight: "600" },
  ])
);

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
    lineHeight: "1.625",
  },
  ".cm-content": {
    padding: "1rem",
  },
  ".cm-focused": {
    outline: "none",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
  },
});

const enterWithSameIndent = keymap.of([
  {
    key: "Enter",
    run: (view) => {
      const { state } = view;
      const changes = state.changeByRange((range) => {
        const line = state.doc.lineAt(range.from);
        const beforeCursor = line.text.slice(0, range.from - line.from);
        const indent = beforeCursor.match(/^\s*/)?.[0] ?? "";
        const insert = `\n${indent}`;

        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.cursor(range.from + insert.length),
        };
      });

      view.dispatch(changes);
      return true;
    },
  },
  indentWithTab,
]);

export function MindmapEditor({ value, onChange }: MindmapEditorProps) {
  const extensions = useMemo(
    () => [
      mindmapLanguage,
      mindmapHighlight,
      editorTheme,
      indentUnit.of("  "),
      enterWithSameIndent,
    ],
    []
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      className="mindmap-editor h-full"
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
    />
  );
}
