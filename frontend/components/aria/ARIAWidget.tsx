"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import { ARIAChatPanel } from "./ARIAChatPanel";

export function ARIAWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Chat panel — anchored above the FAB */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-[9999] animate-in slide-in-from-bottom-4 duration-300"
          style={{ filter: "drop-shadow(0 0 24px rgba(0,229,255,0.12))" }}
        >
          <ARIAChatPanel onClose={() => setOpen(false)} />
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close ARIA" : "Open ARIA assistant"}
        className="fixed bottom-6 right-6 z-[9999] w-13 h-13 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 group aria-fab"
        style={{
          width: "52px",
          height: "52px",
          background: open
            ? "rgba(255,59,92,0.15)"
            : "linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,200,150,0.1) 100%)",
          border: open
            ? "1px solid rgba(255,59,92,0.3)"
            : "1px solid rgba(0,229,255,0.3)",
          boxShadow: open
            ? "0 0 20px rgba(255,59,92,0.2)"
            : "0 0 20px rgba(0,229,255,0.2), 0 8px 24px rgba(0,0,0,0.5)",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.boxShadow =
              "0 0 32px rgba(0,229,255,0.35), 0 8px 24px rgba(0,0,0,0.5)";
            e.currentTarget.style.transform = "scale(1.08)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = open
            ? "0 0 20px rgba(255,59,92,0.2)"
            : "0 0 20px rgba(0,229,255,0.2), 0 8px 24px rgba(0,0,0,0.5)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {open ? (
          <X className="w-5 h-5" style={{ color: "#FF3B5C" }} />
        ) : (
          <>
            <Bot className="w-5 h-5" style={{ color: "#00E5FF" }} />
            {/* Pulse ring */}
            <span
              className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: "rgba(0,229,255,0.4)" }}
            />
          </>
        )}

        {/* Tooltip */}
        {!open && (
          <span
            className="absolute right-full mr-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: "#131F2E",
              border: "1px solid rgba(0,229,255,0.2)",
              color: "#00E5FF",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            Ask ARIA
          </span>
        )}
      </button>
    </>
  );
}
