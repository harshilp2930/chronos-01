"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X,
  Send,
  Bot,
  Minimize2,
  Maximize2,
  Trash2,
  Sparkles,
} from "lucide-react";
import { ARIAMessage, ARIAScrollAnchor } from "./ARIAMessage";
import {
  callARIA,
  parseMissionAction,
  stripMissionJson,
  type ARIAMessage as ARIAMessageType,
} from "@/lib/aria-engine";
import { createMissionFromARIA } from "@/lib/aria-actions";

// ── Suggested quick prompts ───────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "What is the delta-v for a lunar mission?",
  "Create a PSLV mission to Moon from SDSC",
  "Explain LWCC launch commit criteria",
  "What vehicles can reach Mars from ISRO?",
];

interface ARIAChatPanelProps {
  onClose: () => void;
}

export function ARIAChatPanel({ onClose }: ARIAChatPanelProps) {
  const [messages, setMessages] = useState<ARIAMessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [missionStatus, setMissionStatus] = useState<{
    id?: string;
    error?: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg = text.trim();
      setInput("");
      setMissionStatus(null);

      const newHistory: ARIAMessageType[] = [
        ...messages,
        { role: "user", content: userMsg },
      ];
      setMessages(newHistory);
      setLoading(true);

      try {
        const response = await callARIA(messages, userMsg);

        // Check for mission creation action
        const missionPayload = parseMissionAction(response);
        const displayText = missionPayload
          ? stripMissionJson(response)
          : response;

        setMessages([
          ...newHistory,
          { role: "model", content: displayText },
        ]);

        // Execute mission creation
        if (missionPayload) {
          const result = await createMissionFromARIA(missionPayload);
          if (result.success) {
            setMissionStatus({ id: result.missionId });
          } else {
            setMissionStatus({ error: result.error });
            // Append error note to ARIA's message
            setMessages((prev: ARIAMessageType[]) => {
              const last = prev[prev.length - 1];
              if (last.role === "model") {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content:
                      last.content +
                      `\n\n⚠️ **Backend error:** ${result.error}`,
                  },
                ];
              }
              return prev;
            });
          }
        }
      } catch {
        setMessages([
          ...newHistory,
          {
            role: "model",
            content: "⚠️ ARIA encountered an error. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setMissionStatus(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 32, scale: 0.95 }}
      transition={{ type: "spring", damping: 20, stiffness: 250 }}
      layout
      className={`fixed sm:relative inset-0 sm:inset-auto z-[9999] flex flex-col sm:rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
        expanded ? "sm:w-[640px] sm:h-[680px]" : "sm:w-[420px] sm:h-[540px]"
      }`}
      style={{
        background: "#0B1525",
        border: "1px solid rgba(0,229,255,0.18)",
        boxShadow:
          "0 0 0 1px rgba(0,229,255,0.06), 0 24px 64px rgba(0,0,0,0.7), 0 0 40px rgba(0,229,255,0.06)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(0,229,255,0.04)",
          borderBottom: "1px solid rgba(0,229,255,0.1)",
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Pulse icon */}
          <div className="relative">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(0,229,255,0.12)",
                border: "1px solid rgba(0,229,255,0.25)",
              }}
            >
              <Bot className="w-4 h-4" style={{ color: "#00E5FF" }} />
            </div>
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
              style={{ background: "#00C896" }}
            />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "#F0F4FF" }}>
              ARIA
            </p>
            <p
              className="text-[10px]"
              style={{
                color: "rgba(240,244,255,0.4)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Autonomous Response & Intelligence Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(240,244,255,0.4)" }} />
            </button>
          )}
          <button
            onClick={() => setExpanded((v: boolean) => !v)}
            className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.06)]"
            title={expanded ? "Compact" : "Expand"}
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" style={{ color: "rgba(240,244,255,0.4)" }} />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" style={{ color: "rgba(240,244,255,0.4)" }} />
            )}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(255,59,92,0.1)]"
            title="Close"
          >
            <X className="w-3.5 h-3.5" style={{ color: "rgba(240,244,255,0.4)" }} />
          </button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          /* Welcome state */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center gap-4 px-4"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(0,229,255,0.08)",
                border: "1px solid rgba(0,229,255,0.2)",
              }}
            >
              <Sparkles className="w-7 h-7" style={{ color: "#00E5FF" }} />
            </motion.div>
            <div>
              <p className="text-base font-semibold mb-1" style={{ color: "#F0F4FF" }}>
                ARIA Online
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "rgba(240,244,255,0.45)" }}
              >
                Your AI mission intelligence assistant. Ask me about ISRO, orbital
                mechanics, or create a new mission with a single command.
              </p>
            </div>
            {/* Quick prompts */}
            <div className="w-full space-y-1.5 mt-2">
              {QUICK_PROMPTS.map((q, i) => (
                <motion.button
                  key={q}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(240,244,255,0.7)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,229,255,0.06)";
                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)";
                    e.currentTarget.style.color = "#F0F4FF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "rgba(240,244,255,0.7)";
                  }}
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            {messages.map((msg: ARIAMessageType, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ARIAMessage
                  role={msg.role}
                  content={msg.content}
                  isStreaming={loading && i === messages.length - 1 && msg.role === "model"}
                />
              </motion.div>
            ))}

            {/* Loading bubble */}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <ARIAMessage
                role="model"
                content="▋"
                isStreaming
              />
            )}

            {/* Mission created banner */}
            {missionStatus?.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs shadow-lg"
                style={{
                  background: "rgba(0,200,150,0.08)",
                  border: "1px solid rgba(0,200,150,0.2)",
                  color: "#00C896",
                }}
              >
                <span className="font-bold">✓</span>
                <span>
                  Mission created successfully.{" "}
                  <a
                    href={`/dashboard/planner/missions/${missionStatus.id}`}
                    className="underline font-semibold"
                    style={{ color: "#00E5FF" }}
                  >
                    View mission →
                  </a>
                </span>
              </motion.div>
            )}

            <ARIAScrollAnchor />
          </>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 pb-4 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3.5 py-2.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ARIA anything about space or missions…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[rgba(240,244,255,0.3)] leading-relaxed"
            style={{
              color: "#F0F4FF",
              maxHeight: "120px",
              overflowY: "auto",
              fontFamily: "inherit",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40"
            style={{
              background: input.trim() && !loading
                ? "#00E5FF"
                : "rgba(0,229,255,0.15)",
              color: input.trim() && !loading ? "#080E1A" : "rgba(0,229,255,0.5)",
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p
          className="text-[10px] text-center mt-2"
          style={{
            color: "rgba(240,244,255,0.2)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ARIA · Powered by Gemini · Chronos-1
        </p>
      </div>
    </motion.div>
  );
}
