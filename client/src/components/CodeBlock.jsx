import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const CodeBlock = ({ children, className, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = codeString;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "10px",
        overflow: "hidden",
        margin: "12px 0",
        boxShadow: "0 4px 16px rgba(200, 134, 26, 0.08)",
        border: "1px solid #e9dcc8",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fdfaf5",
          padding: "8px 14px",
          borderBottom: "1px solid #e9dcc8",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            color: "#8c6b45",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: copied ? "rgba(34,197,94,0.1)" : "rgba(200, 134, 26, 0.05)",
            border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(200, 134, 26, 0.2)",
            borderRadius: "6px",
            padding: "4px 10px",
            cursor: "pointer",
            color: copied ? "#15803d" : "#8c6b45",
            fontSize: "0.72rem",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.target.style.background = "rgba(200, 134, 26, 0.12)";
              e.target.style.color = "#7a4f0d";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.target.style.background = "rgba(200, 134, 26, 0.05)";
              e.target.style.color = "#8c6b45";
            }
          }}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code content */}
      <SyntaxHighlighter
        style={oneLight}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "16px",
          fontSize: "0.82rem",
          lineHeight: 1.65,
          background: "#ffffff",
          fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
        }}
        showLineNumbers={codeString.split("\n").length > 3}
        lineNumberStyle={{
          color: "#c2b8ab",
          fontSize: "0.72rem",
          paddingRight: "16px",
          minWidth: "2.5em",
          userSelect: "none",
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
