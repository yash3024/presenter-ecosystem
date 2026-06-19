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

  // ── HOOKS ──────────────────────────────────────────────────────────────────
  const {
    micStatus, isMicMuted, audioContextRef, analyserRef, playbackTimeRef,
    initializeAudio, setMicActive, stopAllAudio, playAudioChunk, startAudioWorklet, resetAudio,
  } = useAudio();

  const {
    wsStatus, wsRef, transcript, liveChunk, connectWebSocket, disconnect, sendClientText
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

        if (silenceDuration > 10 && timeSinceSlideChange > 15) {
          console.log(`[TELEPROMPTER] AI stalled for ${silenceDuration}s. Nudging AI to call the tool.`);
          lastSpeechEndRef.current = Date.now(); 
          
          // STRICT NUDGE: Forcing it to stay in character.
          sendClientText(`SYSTEM COMMAND: If you are finished explaining Slide ${currentSlideIndex + 1}, call the 'next_slide' tool now. DO NOT apologize or acknowledge this message out loud. Act natural and either call the tool silently or continue speaking.`);
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
    sendClientText("Namaste! Please begin the presentation from Slide 1 now.");
    setPresentationState("playing");
  };

  const handlePause = () => {
    stopAllAudio(); 
    sendClientText("SYSTEM: Pause the presentation. Stop speaking immediately. Wait silently for the user to resume.");
    setPresentationState("paused");
  };

  const handleResume = () => {
    lastSpeechEndRef.current = Date.now(); 
    sendClientText("SYSTEM: Resume the presentation smoothly from exactly where you left off. DO NOT apologize.");
    setPresentationState("playing");
  };

  const handleAskQuestion = () => {
    stopAllAudio(); 
    // Simply tell the AI to invite the question.
    sendClientText(`SYSTEM COMMAND: A user has a question. Say "Yes, please go ahead" and listen to them.`);
    setMicActive(true); 
    setPresentationState("asking");
  };

  const handleFinishQuestion = () => {
    setMicActive(false); // Mute the mic. Gemini's native VAD will detect the silence and answer!
    
    lastSpeechEndRef.current = Date.now(); 
    lastSlideChangeTime.current = Date.now(); 
    
    // WE SEND NO TEXT HERE. This forces the AI to reply to the audio it just heard.
    setPresentationState("playing"); 
  };

  const handleForceNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      const nextIdx = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIdx);
      lastSlideChangeTime.current = Date.now();
      lastSpeechEndRef.current = Date.now(); 
      
      stopAllAudio(); 
      sendClientText(`SYSTEM TRIGGER: The Event Manager has forced the presentation to Slide ${nextIdx + 1}. It is now fully visible. Start explaining it immediately. DO NOT apologize.`);
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
              sendClientText(`SYSTEM OVERRIDE: Event Manager forced advance to Slide ${data.command.slideNumber}. Pivot immediately. DO NOT apologize.`);
            }
          }
        }
      } catch (_) {}
    };
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, [isLive, slides.length, sendClientText]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen overflow-hidden flex flex-col items-center px-6 pt-5 pb-5 font-sans">
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

      <div className="flex w-full max-w-7xl flex-1 min-h-0 flex-col lg:flex-row gap-5">
        <SlideViewer slides={slides} currentSlideIndex={currentSlideIndex} onFileUpload={handleFileUpload} />
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <PresenterDisplay isLive={presentationState === "playing" || presentationState === "asking"} />
          <DiagnosticsPanel micStatus={micStatus} isMicMuted={isMicMuted} isLive={isLive} transcript={transcript} liveChunk={liveChunk} />
        </div>
      </div>
    </main>
  );
}