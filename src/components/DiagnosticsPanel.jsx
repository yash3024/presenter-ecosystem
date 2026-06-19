"use client";

import { useRef, useState, useEffect } from "react";

export default function DiagnosticsPanel({ micStatus, isMicMuted, isLive, transcript, liveChunk }) {
  const scrollRef         = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Auto-scroll to bottom when new transcript arrives
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      el.scrollTop = el.scrollHeight;
    }
  }, [transcript, liveChunk]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight >= 40);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowScrollBtn(false);
    }
  };

  return (
    <div className="flex-[4] min-h-0 rounded-3xl border border-white/5 bg-white/[0.02] p-5 flex flex-col">
      <h2 className="text-xs text-teal-400/80 uppercase tracking-widest font-semibold flex items-center gap-3 mb-4">
        <span className="w-1 h-1 rounded-full bg-teal-400/80" /> System Diagnostics
      </h2>

      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Microphone</span>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              micStatus === "Live (16 kHz)"
                ? isMicMuted ? "bg-amber-400" : "bg-teal-400"
                : "bg-white/20"
            }`} />
            <span className="text-[10px] font-mono text-white/60 uppercase">
              {isMicMuted ? "Muted" : micStatus === "Live (16 kHz)" ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">AI Brain</span>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-purple-400" : "bg-white/20"}`} />
            <span className="text-[10px] font-mono text-white/60 uppercase">
              {isLive ? "Syncing" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Live transcript stream */}
      <div className="flex-1 min-h-0 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col relative">
        <h3 className="text-[10px] text-white/30 uppercase tracking-widest font-mono mb-3 pb-2 border-b border-white/5">
          Live Output Stream
        </h3>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto flex flex-col space-y-2 scrollbar-hide pr-1"
        >
          {transcript.length === 0 && !liveChunk ? (
            <p className="text-xs text-white/20 font-mono italic">Awaiting data stream...</p>
          ) : (
            <>
              {transcript.map((t, i) => (
                <p key={i} className="text-xs text-white/60 font-mono leading-relaxed">
                  <span className="text-purple-400/50 mr-2">{">"}</span>{t}
                </p>
              ))}
              {liveChunk && (
                <p className="text-xs text-white/90 font-mono leading-relaxed">
                  <span className="text-teal-400/70 mr-2">{">"}</span>
                  {liveChunk}
                  <span className="inline-block w-[6px] h-[11px] bg-teal-400/80 ml-[2px] align-middle animate-pulse" />
                </p>
              )}
            </>
          )}
        </div>

        {showScrollBtn && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/30 border border-purple-500/40 hover:bg-purple-500/50 transition-all cursor-pointer backdrop-blur-sm"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-mono text-purple-300">Latest</span>
          </button>
        )}
      </div>
    </div>
  );
}