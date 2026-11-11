import React, { useState } from "react";
import { IconCopy, IconCheck } from "./icons";
import { Badge } from "./ui";

interface MarkdownRendererProps {
  content: string;
  onNavigateObject?: (objectId: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onNavigateObject,
}) => {
  if (!content) return null;

  // Split lines and parse blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushCodeBlock = (key: string) => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <CodeBlock
          key={key}
          language={codeBlockLang}
          code={codeBlockLines.join("\n")}
        />
      );
      codeBlockLines = [];
    }
  };

  const flushTable = (key: string) => {
    if (tableHeader.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={key} className="overflow-x-auto my-4 border border-hairline rounded-lg bg-surface/40">
          <table className="w-full text-left text-sm">
            {tableHeader.length > 0 && (
              <thead className="bg-surfaceElevated border-b border-hairline text-textMain font-mono text-xs">
                <tr>
                  {tableHeader.map((th, i) => (
                    <th key={i} className="px-4 py-2.5 font-semibold">
                      {parseInlineFormatting(th, onNavigateObject)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-hairline">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-surfaceHighlight/50 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 text-textMuted">
                      {parseInlineFormatting(cell, onNavigateObject)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check Code Block Fences
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(`code-${i}`);
        inCodeBlock = false;
        continue;
      } else {
        if (inTable) {
          flushTable(`table-${i}`);
          inTable = false;
        }
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, "").trim() || "text";
        codeBlockLines = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Check Tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const rawCols = line.split("|").slice(1, -1).map((c) => c.trim());
      // Skip markdown separator row |---|---|
      if (rawCols.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = rawCols;
      } else {
        tableRows.push(rawCols);
      }
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
      inTable = false;
    }

    // Check GitHub-style Callouts (> [!NOTE], > [!WARNING], > [!TIP], > [!IMPORTANT], > [!CAUTION])
    if (line.trim().startsWith("> [!")) {
      const match = line.trim().match(/^>\s*\[!(NOTE|WARNING|IMPORTANT|TIP|CAUTION)\]/i);
      if (match) {
        const type = match[1].toUpperCase();
        const alertLines: string[] = [];
        // Gather following blockquote lines
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith(">")) {
          i++;
          alertLines.push(lines[i].replace(/^>\s?/, ""));
        }
        elements.push(
          <AlertBox
            key={`alert-${i}`}
            type={type}
            content={alertLines.join(" ")}
            onNavigateObject={onNavigateObject}
          />
        );
        continue;
      }
    }

    // Regular Blockquotes
    if (line.trim().startsWith("> ")) {
      elements.push(
        <blockquote key={`quote-${i}`} className="border-l-2 border-brass bg-brass/5 px-4 py-2 my-3 rounded-r text-textMuted italic text-sm">
          {parseInlineFormatting(line.replace(/^>\s*/, ""), onNavigateObject)}
        </blockquote>
      );
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="font-heading text-2xl font-bold text-textMain mt-6 mb-3 tracking-tight">
          {parseInlineFormatting(line.replace(/^#\s*/, ""), onNavigateObject)}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="font-heading text-lg font-semibold text-textMain mt-5 mb-2 border-b border-hairline pb-1">
          {parseInlineFormatting(line.replace(/^##\s*/, ""), onNavigateObject)}
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="font-heading text-base font-semibold text-brass mt-4 mb-1">
          {parseInlineFormatting(line.replace(/^###\s*/, ""), onNavigateObject)}
        </h3>
      );
      continue;
    }

    // Lists
    if (/^\s*[-*]\s/.test(line)) {
      elements.push(
        <li key={`li-${i}`} className="text-textMuted ml-5 list-disc my-1 text-sm">
          {parseInlineFormatting(line.replace(/^\s*[-*]\s*/, ""), onNavigateObject)}
        </li>
      );
      continue;
    }

    // Horizontal Rules
    if (/^---|\*\*\*|___$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="my-6 border-hairline" />);
      continue;
    }

    // Paragraph
    if (line.trim().length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-textMuted leading-relaxed my-2.5 text-sm">
          {parseInlineFormatting(line, onNavigateObject)}
        </p>
      );
    }
  }

  if (inCodeBlock) flushCodeBlock("code-end");
  if (inTable) flushTable("table-end");

  return <div className="md-body select-text">{elements}</div>;
};

// --- INLINE FORMATTING & WIKI-LINK PARSER ---
function parseInlineFormatting(
  text: string,
  onNavigateObject?: (objectId: string) => void
): React.ReactNode {
  if (!text) return "";

  // Tokenize regex for `code`, **bold**, *italic*, [[wiki-links]], [markdown](links)
  const regex = /(`[^`]+`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)]+)\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];

    // Inline Code: `code`
    if (fullMatch.startsWith("`") && fullMatch.endsWith("`")) {
      const codeText = fullMatch.slice(1, -1);
      // If code text looks like an object ID e.g. `tech-sqlite` or `pat-xxx`
      if (/^[a-z0-9-]+$/.test(codeText) && onNavigateObject && (codeText.startsWith("concept-") || codeText.startsWith("tech-") || codeText.startsWith("pat-") || codeText.startsWith("arch-") || codeText.startsWith("source-") || codeText.startsWith("bug-") || codeText.startsWith("test-") || codeText.startsWith("loop-"))) {
        parts.push(
          <button
            key={`code-link-${match.index}`}
            onClick={() => onNavigateObject(codeText)}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-brass/10 hover:bg-brass/25 text-brass border border-brass/30 transition-colors mx-0.5"
          >
            {codeText}
          </button>
        );
      } else {
        parts.push(
          <code key={`code-${match.index}`} className="px-1.5 py-0.5 rounded text-xs font-mono bg-surfaceElevated text-brass border border-hairline mx-0.5">
            {codeText}
          </code>
        );
      }
    }
    // Wiki-link: [[id]] or [[id|Label]]
    else if (fullMatch.startsWith("[[") && fullMatch.endsWith("]]")) {
      const raw = fullMatch.slice(2, -2);
      const [targetId, label] = raw.includes("|") ? raw.split("|") : [raw, raw];
      parts.push(
        <button
          key={`wikilink-${match.index}`}
          onClick={() => onNavigateObject && onNavigateObject(targetId.trim())}
          className="inline-flex items-center text-cyan hover:text-cyan/80 font-medium underline underline-offset-2 transition-colors cursor-pointer"
        >
          {label.trim()}
        </button>
      );
    }
    // Markdown link: [text](url)
    else if (fullMatch.startsWith("[")) {
      const label = match[5];
      const url = match[6];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-cyan hover:underline inline-flex items-center gap-0.5"
        >
          {label}
        </a>
      );
    }
    // Bold: **text**
    else if (fullMatch.startsWith("**")) {
      parts.push(
        <strong key={`bold-${match.index}`} className="text-textMain font-semibold">
          {match[2]}
        </strong>
      );
    }
    // Italic: *text*
    else if (fullMatch.startsWith("*")) {
      parts.push(
        <em key={`italic-${match.index}`} className="italic text-textMuted">
          {match[3]}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// --- CODE BLOCK COMPONENT ---
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-hairline bg-[#0a0d13]">
      <div className="flex items-center justify-between px-4 py-1.5 bg-surfaceElevated border-b border-hairline text-xs font-mono text-textDim">
        <span className="text-brass/80 font-semibold">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-textMuted hover:text-textMain transition-colors p-1 rounded hover:bg-surfaceHighlight"
        >
          {copied ? <IconCheck size={14} className="text-emerald" /> : <IconCopy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-textMain overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// --- ALERT BOX COMPONENT ---
const AlertBox: React.FC<{
  type: string;
  content: string;
  onNavigateObject?: (objectId: string) => void;
}> = ({ type, content, onNavigateObject }) => {
  const colorMap: Record<string, { border: string; bg: string; text: string; badge: "brass" | "rose" | "cyan" | "emerald" }> = {
    NOTE: { border: "border-cyan/40", bg: "bg-cyan/5", text: "text-cyan", badge: "cyan" },
    TIP: { border: "border-emerald/40", bg: "bg-emerald/5", text: "text-emerald", badge: "emerald" },
    IMPORTANT: { border: "border-brass/40", bg: "bg-brass/5", text: "text-brass", badge: "brass" },
    WARNING: { border: "border-rose/40", bg: "bg-rose/5", text: "text-rose", badge: "rose" },
    CAUTION: { border: "border-rose/60", bg: "bg-rose/10", text: "text-rose", badge: "rose" },
  };

  const style = colorMap[type] || colorMap.NOTE;

  return (
    <div className={`my-4 p-4 rounded-lg border ${style.border} ${style.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={style.badge}>{type}</Badge>
      </div>
      <div className="text-sm text-textMuted leading-relaxed">
        {parseInlineFormatting(content, onNavigateObject)}
      </div>
    </div>
  );
};
