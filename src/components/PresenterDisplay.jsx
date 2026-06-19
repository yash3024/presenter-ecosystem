"use client";

import styles from "./PresenterDisplay.module.css";

export default function PresenterDisplay({ isLive }) {
  return (
    <div className="flex-[5] min-h-0 rounded-3xl border border-white/5 bg-white/[0.02] p-5 flex flex-col gap-3">
      <h2 className="text-xs text-white/50 uppercase tracking-widest font-semibold flex items-center gap-3">
        <span className="w-1 h-1 rounded-full bg-white/50" /> Virtual Presenter
      </h2>

      <div className="flex-1 min-h-0 rounded-2xl bg-black flex flex-col items-center justify-center border border-white/5 relative overflow-hidden">
        {/* Animated AI orb */}
        <div className={styles.orbContainer} data-live={String(isLive)}>
          <div className={styles.ring} style={{ "--delay": "0s", "--size": "140px" }} />
          <div className={styles.ring} style={{ "--delay": "0.5s", "--size": "100px" }} />
          <div className={styles.ring} style={{ "--delay": "1s", "--size": "68px" }} />
          <div className={styles.core}>
            <span className={styles.label}>AI</span>
          </div>
        </div>

        <p className={`mt-5 text-xs font-mono uppercase tracking-widest ${isLive ? "text-teal-400/70" : "text-white/20"}`}>
          {isLive ? "● Presenting" : "○ Standby"}
        </p>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>
    </div>
  );
}