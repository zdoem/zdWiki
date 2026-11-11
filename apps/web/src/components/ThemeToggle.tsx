"use client";

import React from "react";
import { useConsole } from "@/store/consoleStore";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { theme, toggleTheme } = useConsole();
  const isSpace = theme === "space-hud";

  return (
    <button
      onClick={toggleTheme}
      title={isSpace ? "Switch to Classic Console Theme" : "Switch to Dark Space HUD Theme"}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 text-xs font-mono select-none ${
        isSpace
          ? "bg-[#10172e]/90 border-[#7fd8e8]/40 text-[#7fd8e8] shadow-[0_0_15px_rgba(127,216,232,0.15)] hover:border-[#ffb24d] hover:text-[#ffb24d]"
          : "bg-[#1e2634] border-white/10 text-[#f0b429] hover:bg-[#263244]"
      } ${className}`}
    >
      {/* Icon: Solar / Space Planet Inline SVG */}
      <span className="shrink-0 flex items-center justify-center">
        {isSpace ? (
          /* Solar / Orbit SVG */
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" fill="#ffb24d" stroke="#ffb24d" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" stroke="#7fd8e8" strokeDasharray="2 2" />
          </svg>
        ) : (
          /* Terminal Console Lightning SVG */
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#f0b429" stroke="#f0b429" />
          </svg>
        )}
      </span>

      <span className="font-semibold tracking-wider uppercase text-[10px]">
        {isSpace ? "SPACE HUD" : "CONSOLE"}
      </span>

      {/* Mini status indicator */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isSpace ? "bg-[#ffb24d] animate-pulse" : "bg-[#f0b429]"
        }`}
      />
    </button>
  );
};
