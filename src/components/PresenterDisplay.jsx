"use client";

import React from "react";

export default function PresenterDisplay({ currentState }) {
  const getAvatarStyles = () => {
    switch (currentState) {
      case "playing":
        // SPEAKING: Active Cyan/Blue
        return {
          glow: "bg-cyan-500/10 shadow-[0_0_80px_rgba(34,211,238,0.15)]",
          core: "bg-gradient-to-tr from-blue-600 to-cyan-400 scale-100 shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-[pulse_2s_ease-in-out_infinite]",
          ring1: "border-cyan-400/40 animate-[ping_3s_linear_infinite]",
          ring2: "border-blue-500/20 animate-[spin_4s_linear_infinite]",
          text: "SPEAKING...",
          textColor: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
        };
      case "asking":
        // LISTENING: Intense Fuchsia/Purple
        return {
          glow: "bg-fuchsia-500/10 shadow-[0_0_100px_rgba(217,70,239,0.2)]",
          core: "bg-gradient-to-tr from-purple-600 to-fuchsia-500 scale-110 shadow-[0_0_40px_rgba(217,70,239,0.7)]",
          ring1: "border-fuchsia-400/60 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]",
          ring2: "border-purple-500/30 animate-[spin_3s_linear_infinite_reverse]",
          text: "LISTENING...",
          textColor: "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]"
        };
      case "idle":
        // IDLE: Professional Emerald Green waiting state
        return {
          glow: "bg-emerald-500/5 shadow-[0_0_50px_rgba(16,185,129,0.1)]",
          core: "bg-gradient-to-tr from-emerald-600 to-teal-400 scale-90 shadow-[0_0_20px_rgba(16,185,129,0.4)] opacity-90",
          ring1: "border-emerald-400/20 animate-[pulse_4s_ease-in-out_infinite]",
          ring2: "border-teal-500/10",
          text: "SYSTEM IDLE",
          textColor: "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
        };
      case "stopped":
        // STOPPED: Warning Red
        return {
          glow: "bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.15)]",
          core: "bg-gradient-to-tr from-red-700 to-rose-500 scale-95 shadow-[0_0_20px_rgba(244,63,94,0.5)]",
          ring1: "border-red-500/30",
          ring2: "border-rose-500/10",
          text: "PRESENTATION STOPPED",
          textColor: "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
        };
      default:
        // OFFLINE: Dark Gray
        return {
          glow: "bg-white/2 shadow-none",
          core: "bg-gray-800 scale-90 border border-gray-600",
          ring1: "border-transparent",
          ring2: "border-transparent",
          text: "OFFLINE",
          textColor: "text-gray-500"
        };
    }
  };

  const styles = getAvatarStyles();

  return (
    // FIXED: Removed flex-1 and added a strict h-[260px] height to prevent bulky stretching!
    <div className="w-full h-[260px] shrink-0 rounded-3xl border border-white/5 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background ambient glow */}
      <div className={`absolute inset-0 transition-all duration-1000 ease-in-out opacity-60 ${styles.glow}`} />

      {/* SCALED DOWN CONTAINER: Now w-48 (192px) to perfectly fit the new box height */}
      <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center mb-3">
        
        {/* Outer Ring (Scaled to 44) */}
        <div className={`absolute w-44 h-44 rounded-full border-[1px] transition-all duration-700 ${styles.ring2}`} />
        
        {/* Inner Ring (Scaled to 32) */}
        <div className={`absolute w-32 h-32 rounded-full border-2 transition-all duration-700 ${styles.ring1}`} />
        
        {/* Solid Core (Scaled to 16) */}
        <div className={`relative w-16 h-16 rounded-full transition-all duration-500 ease-out z-10 flex items-center justify-center ${styles.core}`}>
          
          {/* Listening Microphone Icon */}
          {currentState === "asking" && (
            <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}

          {/* Equalizer */}
          {currentState === "playing" && (
            <div className="flex gap-[3px] items-center justify-center">
              <div className="w-1 h-2 bg-white/95 rounded-full animate-[bounce_1s_infinite_0s]"></div>
              <div className="w-1 h-4 bg-white/95 rounded-full animate-[bounce_1s_infinite_0.2s]"></div>
              <div className="w-1 h-2 bg-white/95 rounded-full animate-[bounce_1s_infinite_0.4s]"></div>
            </div>
          )}

        </div>
      </div>

      {/* High-Contrast Professional Text (Slightly smaller font to match the sleek design) */}
      <div className={`font-mono text-[11px] font-bold tracking-[0.3em] uppercase transition-colors duration-500 z-10 ${styles.textColor}`}>
        {styles.text}
      </div>

    </div>
  );
}