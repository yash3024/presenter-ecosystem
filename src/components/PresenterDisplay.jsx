"use client";

import React from "react";

export default function PresenterDisplay({ currentState }) {
  const getAvatarStyles = () => {
    switch (currentState) {
      case "playing":
        return {
          glassBg: "rgba(34,211,238,0.05)",
          glassBorder: "rgba(34,211,238,0.18)",
          glassGlow: "0 0 80px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
          orb1: "bg-cyan-500",
          orb2: "bg-blue-600",
          core: "bg-gradient-to-tr from-blue-600 to-cyan-400 scale-100 shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-[pulse_2s_ease-in-out_infinite]",
          ring1: "border-cyan-400/40 animate-[ping_3s_linear_infinite]",
          ring2: "border-blue-500/20 animate-[spin_4s_linear_infinite]",
          text: "SPEAKING...",
          textColor: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]",
        };
      case "asking":
        return {
          glassBg: "rgba(217,70,239,0.06)",
          glassBorder: "rgba(217,70,239,0.2)",
          glassGlow: "0 0 100px rgba(217,70,239,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
          orb1: "bg-fuchsia-500",
          orb2: "bg-purple-700",
          core: "bg-gradient-to-tr from-purple-600 to-fuchsia-500 scale-110 shadow-[0_0_40px_rgba(217,70,239,0.7)]",
          ring1: "border-fuchsia-400/60 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]",
          ring2: "border-purple-500/30 animate-[spin_3s_linear_infinite_reverse]",
          text: "LISTENING...",
          textColor: "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]",
        };
      case "idle":
        return {
          glassBg: "rgba(16,185,129,0.04)",
          glassBorder: "rgba(16,185,129,0.14)",
          glassGlow: "0 0 50px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
          orb1: "bg-emerald-500",
          orb2: "bg-teal-600",
          core: "bg-gradient-to-tr from-emerald-600 to-teal-400 scale-90 shadow-[0_0_20px_rgba(16,185,129,0.4)] opacity-90",
          ring1: "border-emerald-400/20 animate-[pulse_4s_ease-in-out_infinite]",
          ring2: "border-teal-500/10",
          text: "SYSTEM IDLE",
          textColor: "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]",
        };
      case "stopped":
        return {
          glassBg: "rgba(239,68,68,0.05)",
          glassBorder: "rgba(239,68,68,0.16)",
          glassGlow: "0 0 60px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
          orb1: "bg-red-600",
          orb2: "bg-rose-500",
          core: "bg-gradient-to-tr from-red-700 to-rose-500 scale-95 shadow-[0_0_20px_rgba(244,63,94,0.5)]",
          ring1: "border-red-500/30",
          ring2: "border-rose-500/10",
          text: "PRESENTATION STOPPED",
          textColor: "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]",
        };
      default:
        return {
          glassBg: "rgba(255,255,255,0.02)",
          glassBorder: "rgba(255,255,255,0.06)",
          glassGlow: "none",
          orb1: "bg-gray-700",
          orb2: "bg-gray-800",
          core: "bg-gray-800 scale-90 border border-gray-600",
          ring1: "border-transparent",
          ring2: "border-transparent",
          text: "OFFLINE",
          textColor: "text-gray-500",
        };
    }
  };

  const styles = getAvatarStyles();

  return (
    <div
      className="w-full h-[25vh] min-h-[260px] max-h-[400px] 2xl:max-h-[500px] shrink-0 rounded-3xl flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-700 transform-gpu"
      style={{
        background: styles.glassBg,
        border: `1px solid ${styles.glassBorder}`,
        boxShadow: styles.glassGlow,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* ── Orb blobs ───────────────────────────── */}
      <div className={`absolute -top-10 -left-10 w-36 h-36 2xl:w-48 2xl:h-48 rounded-full opacity-30 blur-3xl transition-all duration-1000 ${styles.orb1}`} />
      <div className={`absolute -bottom-8 -right-8 w-28 h-28 2xl:w-40 2xl:h-40 rounded-full opacity-25 blur-2xl transition-all duration-1000 ${styles.orb2}`} />

      {/* ── Sheen ───────────────────────────── */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* ── Avatar ring container ───────────────────────────────────────────── */}
      {/* FIXED: Removed the bottom margin (mb-4) so the rings stay perfectly centered vertically */}
      <div className="relative w-48 h-48 2xl:w-64 2xl:h-64 flex-shrink-0 flex items-center justify-center">
        <div className={`absolute w-44 h-44 2xl:w-56 2xl:h-56 rounded-full border-[1px] transition-all duration-700 ${styles.ring2}`} />
        <div className={`absolute w-32 h-32 2xl:w-44 2xl:h-44 rounded-full border-2 transition-all duration-700 ${styles.ring1}`} />
        <div className={`relative w-16 h-16 2xl:w-24 2xl:h-24 rounded-full transition-all duration-500 ease-out z-10 flex items-center justify-center ${styles.core}`}>
          
          {currentState === "asking" && (
            <svg className="w-5 h-5 2xl:w-7 2xl:h-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}

          {currentState === "playing" && (
            <div className="flex gap-[3px] 2xl:gap-[4px] items-center justify-center">
              <div className="w-1 h-2 2xl:w-1.5 2xl:h-3 bg-white/95 rounded-full animate-[bounce_1s_infinite_0s]" />
              <div className="w-1 h-4 2xl:w-1.5 2xl:h-6 bg-white/95 rounded-full animate-[bounce_1s_infinite_0.2s]" />
              <div className="w-1 h-2 2xl:w-1.5 2xl:h-3 bg-white/95 rounded-full animate-[bounce_1s_infinite_0.4s]" />
            </div>
          )}
        </div>
      </div>

      {/* ── State label ─────────────────────────────────────────────────────── */}
      {/* FIXED: Added 'absolute bottom-6' to permanently pin the text inside the box! */}
      <div className={`absolute bottom-6 font-mono text-[11px] 2xl:text-[14px] font-bold tracking-[0.3em] uppercase transition-colors duration-500 z-10 ${styles.textColor}`}>
        {styles.text}
      </div>
    </div>
  );
}