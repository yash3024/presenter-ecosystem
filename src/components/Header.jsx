"use client";

export default function Header({
  wsStatus,
  presentationState,
  handleConnect,
  disconnect,
  handleStart,
  handlePause,
  handleResume,
  handleAskQuestion,
  handleFinishQuestion
}) {
  const isLive = wsStatus.includes("Live");

  return (
    <div className="w-full max-w-7xl flex items-center justify-between mb-4 border-b border-white/5 pb-4 flex-none">
      <div>
        <h1 className="text-2xl font-bold tracking-widest text-white/90">
          AI PRESENTER <span className="text-teal-400">OS</span>
        </h1>
        <p className="mt-1 text-xs text-white/40 font-mono">STATE: {presentationState.toUpperCase()}</p>
      </div>

      <div className="flex gap-4 items-center">
        {/* If Not Connected */}
        {!isLive ? (
          <button
            type="button"
            onClick={handleConnect}
            className="px-6 py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all cursor-pointer"
          >
            <p className="text-xs font-mono text-purple-300">CONNECT AI BRAIN</p>
          </button>
        ) : (
          /* If Connected: Show Presenter Controls */
          <>
            {presentationState === "idle" && (
              <button onClick={handleStart} className="px-5 py-2 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-xs font-mono text-teal-300 transition-all">
                START PRESENTATION
              </button>
            )}

            {presentationState === "playing" && (
              <>
                <button onClick={handlePause} className="px-5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono text-amber-300 transition-all">
                  STOP PRESENTATION
                </button>
                <button onClick={handleAskQuestion} className="px-5 py-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-mono text-blue-300 transition-all">
                  ASK QUESTION
                </button>
              </>
            )}

            {presentationState === "paused" && (
              <button onClick={handleResume} className="px-5 py-2 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-xs font-mono text-teal-300 transition-all">
                RESUME PRESENTATION
              </button>
            )}

            {presentationState === "asking" && (
              <button onClick={handleFinishQuestion} className="px-5 py-2 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-xs font-mono text-red-300 transition-all animate-pulse">
                FINISH QUESTION (Mute)
              </button>
            )}

            <div className="w-px h-6 bg-white/10 mx-2" /> {/* Divider */}

            <button onClick={disconnect} className="px-5 py-2 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-xs font-mono text-red-300 transition-all">
              END SESSION
            </button>
          </>
        )}
      </div>
    </div>
  );
}