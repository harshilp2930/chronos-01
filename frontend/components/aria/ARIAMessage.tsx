"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface ARIAMessageProps {
  role: "user" | "model";
  content: string;
  isStreaming?: boolean;
}

export function ARIAMessage({ role, content, isStreaming }: ARIAMessageProps) {
  const isARIA = role === "model";

  return (
    <div
      className={`flex gap-3 ${isARIA ? "items-start" : "items-start justify-end"}`}
    >
      {/* ARIA avatar */}
      {isARIA && (
        <div
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold mt-0.5"
          style={{
            background: "rgba(0,229,255,0.12)",
            border: "1px solid rgba(0,229,255,0.25)",
            color: "#00E5FF",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          AI
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isARIA
            ? "aria-bubble"
            : "user-bubble"
        } ${isStreaming ? "streaming-pulse" : ""}`}
        style={
          isARIA
            ? {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(240,244,255,0.9)",
              }
            : {
                background: "rgba(0,229,255,0.1)",
                border: "1px solid rgba(0,229,255,0.2)",
                color: "#F0F4FF",
              }
        }
      >
        {isARIA ? (
          <div className="aria-markdown">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: "#00E5FF", fontWeight: 600 }}>
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="ml-4 mb-2 space-y-0.5 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="ml-4 mb-2 space-y-0.5 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ color: "rgba(240,244,255,0.85)" }}>{children}</li>
                ),
                code: ({ children }) => (
                  <code
                    className="px-1.5 py-0.5 rounded text-[12px]"
                    style={{
                      background: "rgba(0,229,255,0.08)",
                      color: "#00E5FF",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre
                    className="rounded-lg p-3 text-[12px] overflow-x-auto mb-2"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "rgba(240,244,255,0.8)",
                    }}
                  >
                    {children}
                  </pre>
                ),
                h3: ({ children }) => (
                  <h3
                    className="font-bold mb-1 mt-2 text-[13px]"
                    style={{ color: "#00E5FF" }}
                  >
                    {children}
                  </h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="pl-3 py-1 my-1 rounded-r"
                    style={{
                      borderLeft: "3px solid rgba(0,229,255,0.4)",
                      background: "rgba(0,229,255,0.04)",
                      color: "rgba(240,244,255,0.7)",
                    }}
                  >
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span
                className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm"
                style={{ background: "#00E5FF" }}
              />
            )}
          </div>
        ) : (
          <span>{content}</span>
        )}
      </div>

      {/* User avatar */}
      {!isARIA && (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
          style={{
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            color: "#93C5FD",
          }}
        >
          U
        </div>
      )}
    </div>
  );
}

/** Auto-scroll anchor — place at the bottom of message list */
export function ARIAScrollAnchor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  });
  return <div ref={ref} />;
}
