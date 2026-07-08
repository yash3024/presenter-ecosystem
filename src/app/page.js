"use client";

import { useState, useRef, useEffect } from "react";
import { useAudio }       from "@/hooks/useAudio";
import { useWebSocket }   from "@/hooks/useWebSocket";
import { processSlideFiles } from "@/utils/slideUtils";

import Header            from "@/components/Header";
import SlideViewer       from "@/components/SlideViewer";
import PresenterDisplay  from "@/components/PresenterDisplay";
import DiagnosticsPanel  from "@/components/DiagnosticsPanel";

export default function Home() {
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [presentationState, setPresentationState] = useState("idle"); 

  const currentSlideRef = useRef(0);
  useEffect(() => {
    currentSlideRef.current = currentSlideIndex;
  }, [currentSlideIndex]);

  const lastSlideChangeTime  = useRef(0);
  const lastRemoteCommandRef = useRef(null);
  const lastSpeechEndRef     = useRef(Date.now());
  const askQuestionTimeoutRef = useRef(null);

  // ── HOOKS ──────────────────────────────────────────────────────────────────
  const {
    micStatus, isMicMuted, audioContextRef, analyserRef, playbackTimeRef,
    initializeAudio, setMicActive, stopAllAudio, playAudioChunk, startAudioWorklet, resetAudio,
  } = useAudio();

  const {
    wsStatus, wsRef, transcript, liveChunk, connectWebSocket, disconnect, sendClientText, startPresentation
  } = useWebSocket({
    audioContextRef, analyserRef, playbackTimeRef, playAudioChunk, stopAllAudio, startAudioWorklet,
    slides, setCurrentSlideIndex, currentSlideRef, lastSlideChangeTime,
  });

  const isLive = wsStatus.includes("Live");

  // ── TELEPROMPTER WATCHDOG ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive || presentationState !== "playing" || currentSlideIndex >= slides.length - 1) {
      return; 
    }

    const silenceWatcher = setInterval(() => {
      if (!audioContextRef.current) return;

      const audioRemaining = playbackTimeRef.current - audioContextRef.current.currentTime;

      if (audioRemaining > 0.5) {
        lastSpeechEndRef.current = Date.now();
      } else {
        const silenceDuration = (Date.now() - lastSpeechEndRef.current) / 1000;
        const timeSinceSlideChange = (Date.now() - lastSlideChangeTime.current) / 1000;

        // FIXED: Give the AI time to process the new image! 
        // Only nudges if totally silent for 10s AND has been on the slide for at least 20s.
        if (silenceDuration > 10 && timeSinceSlideChange > 20) {
          console.log(`[TELEPROMPTER] AI stalled for ${silenceDuration}s. Nudging AI.`);
          lastSpeechEndRef.current = Date.now(); 
          
          sendClientText(`SYSTEM COMMAND: If you have finished explaining Slide ${currentSlideIndex + 1}, call the 'next_slide' tool now. If you have NOT finished, please resume your explanation. DO NOT apologize.`);
        }
      }
    }, 1000);

    return () => clearInterval(silenceWatcher);
  }, [isLive, presentationState, currentSlideIndex, slides.length, sendClientText, audioContextRef, playbackTimeRef]);

  // ── 1. ONE-CLICK CONNECT ───────────────────────────────────────────────────
  const handleConnect = async () => {
    if (slides.length === 0) {
      alert("Please upload your slides before connecting the brain!");
      return;
    }
    await initializeAudio(); 
    connectWebSocket();      
    setPresentationState("idle");
  };

  // ── 2. PRESENTATION CONTROLS ───────────────────────────────────────────────
  const handleStart = () => {
    lastSpeechEndRef.current = Date.now(); 

    // WE NOW PASS THE CURRENT SLIDE INDEX so the AI knows exactly where it left off!
    startPresentation(slides, currentSlideIndex); 
    
    setPresentationState("playing");
  };

  const handlePause = () => {
    stopAllAudio(); 
    
    // TELL THE AI TO VERBALLY CONFIRM!
    sendClientText("SYSTEM COMMAND: The presentation has been stopped. Verbally say 'Okay, standing by' to the user right now, and then wait silently. Do not apologize.");
    
    // Immediately switch to the green Idle state while it speaks its confirmation
    setPresentationState("idle");
  };

  const handleResume = () => {
    lastSpeechEndRef.current = Date.now(); 
    sendClientText("SYSTEM: Resume the presentation smoothly from exactly where you left off. DO NOT apologize.");
    setPresentationState("playing");
  };

  const handleAskQuestion = () => {
    // Clear any existing timeout
    if (askQuestionTimeoutRef.current) {
      clearTimeout(askQuestionTimeoutRef.current);
    }
    stopAllAudio();
    sendClientText(`SYSTEM COMMAND: A user has a question. Say "Yes, please go ahead" and listen to them.`);
    setMicActive(true);
    setPresentationState("asking");

    // Set a timeout to automatically exit asking state after 30 seconds of no user action
    askQuestionTimeoutRef.current = setTimeout(() => {
      // If still in asking state, automatically finish
      if (presentationState === "asking") {
        handleFinishQuestion();
      }
    }, 30000); // 30 seconds
  };

  const handleFinishQuestion = () => {
    if (askQuestionTimeoutRef.current) {
      clearTimeout(askQuestionTimeoutRef.current);
      askQuestionTimeoutRef.current = null;
    }
    setMicActive(false);
    lastSpeechEndRef.current = Date.now();
    lastSlideChangeTime.current = Date.now();
    setPresentationState("playing");
  };

  const handleForceNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      const nextIdx = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIdx);
      lastSlideChangeTime.current = Date.now();
      lastSpeechEndRef.current = Date.now(); 
      
      stopAllAudio(); 
      
      // PROGRESSIVE LOADING UPDATE: Attach the new image when forcing the slide
      const targetSlide = slides[nextIdx];
      if (wsRef.current?.readyState === WebSocket.OPEN && targetSlide) {
        const parts = [
          { text: `SYSTEM OVERRIDE: Event Manager forced advance to Slide ${nextIdx + 1}. I have attached the image of this new slide below. Pivot immediately and explain it. DO NOT apologize.` },
          { text: `\n\n--- [Current Slide: ${nextIdx + 1} of ${slides.length}] ---` },
          { inlineData: { mimeType: targetSlide.mimeType, data: targetSlide.base64 } }
        ];

        wsRef.current.send(JSON.stringify({ 
          clientContent: { 
            turns: [{ role: "user", parts }], 
            turnComplete: true 
          } 
        }));
      }
      setPresentationState("playing");
    }
  };

  const handleDisconnect = () => {
    disconnect(resetAudio);
    setPresentationState("idle");
  };

  // ── FILE UPLOAD ────────────────────────────────────────────────────────────
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    const newSlides = await processSlideFiles(files);
    setSlides(newSlides);
    setCurrentSlideIndex(0);
  };

  // ── REMOTE COMMAND POLLING ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive || !slides.length) return;
    const check = async () => {
      try {
        const response = await fetch("/api/remote");
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.command && data.command.timestamp !== lastRemoteCommandRef.current) {
          lastRemoteCommandRef.current = data.command.timestamp;
          const idx = data.command.slideNumber - 1;
          
          if (idx >= 0 && idx < slides.length) {
            setCurrentSlideIndex(idx);
            lastSlideChangeTime.current = Date.now();
            lastSpeechEndRef.current = Date.now(); 
            
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              stopAllAudio();
              playbackTimeRef.current = 0;

              // PROGRESSIVE LOADING UPDATE
              const targetSlide = slides[idx];
              if (targetSlide) {
                const parts = [
                  { text: `SYSTEM OVERRIDE: Event Manager forced advance to Slide ${data.command.slideNumber}. I have attached the image of this new slide below. Pivot immediately. DO NOT apologize.` },
                  { text: `\n\n--- [Current Slide: ${data.command.slideNumber} of ${slides.length}] ---` },
                  { inlineData: { mimeType: targetSlide.mimeType, data: targetSlide.base64 } }
                ];
                wsRef.current.send(JSON.stringify({ 
                  clientContent: { turns: [{ role: "user", parts }], turnComplete: true } 
                }));
              }
            }
          }
        }
      } catch (_) {}
    };
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, [isLive, slides, sendClientText]); 

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    // 4K UPGRADE: Changed px-6 to px-[2vw] for dynamic wide-screen padding.
    // NOTE: No bg-black added here so your global theme stays perfectly intact!
    <main className="h-screen overflow-hidden flex flex-col items-center px-[2vw] pt-5 pb-5 font-sans">
      <Header
        wsStatus={wsStatus}
        presentationState={presentationState}
        handleConnect={handleConnect}
        disconnect={handleDisconnect}
        handleStart={handleStart}
        handlePause={handlePause}
        handleResume={handleResume}
        handleAskQuestion={handleAskQuestion}
        handleFinishQuestion={handleFinishQuestion}
        handleForceNextSlide={handleForceNextSlide}
      />

      {/* 4K UPGRADE: Replaced max-w-7xl with fluid max-w-[95vw] that scales to 2400px. Added transform-gpu. */}
      <div className="flex w-full max-w-[95vw] 2xl:max-w-[2400px] flex-1 min-h-0 flex-col lg:flex-row gap-5 2xl:gap-8 transform-gpu">
        <SlideViewer slides={slides} currentSlideIndex={currentSlideIndex} onFileUpload={handleFileUpload} />
        
        {/* 4K UPGRADE: Added 2xl:gap-6 for better spacing on large screens */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 2xl:gap-6">
          <PresenterDisplay 
            currentState={
              !isLive ? "offline" 
              : presentationState === "playing" ? "playing"
              : presentationState === "asking" ? "asking"
              : presentationState === "stopped" ? "stopped"
              : "idle" 
            } 
          />
          
          <DiagnosticsPanel micStatus={micStatus} isMicMuted={isMicMuted} isLive={isLive} transcript={transcript} liveChunk={liveChunk} />
        </div>
      </div>
    </main>
  );
}