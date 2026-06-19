"use client";

import { useRef, useState } from "react";

export function useWebSocket({
  audioContextRef, analyserRef, playbackTimeRef, playAudioChunk, stopAllAudio, startAudioWorklet, 
  slides, setCurrentSlideIndex, currentSlideRef, lastSlideChangeTime,
}) {
  const [wsStatus, setWsStatus]   = useState("Disconnected");
  const [transcript, setTranscript] = useState([]);
  const [liveChunk, setLiveChunk]  = useState("");

  const wsRef        = useRef(null);
  const liveChunkRef = useRef("");
  const turnIdRef    = useRef(0);

  const sendClientText = (text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true }
      }));
    }
  };

  const connectWebSocket = () => {
    setWsStatus("Connecting...");
    const ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" + process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("Connected");
      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["audio"],
            thinkingConfig: { thinkingLevel: "minimal" },
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
              languageCode: "en-IN", 
            },
          },
          tools: [{
            functionDeclarations: [{
              name: "next_slide",
              description: `REQUIRED TOOL. Call this tool when you finish discussing the current slide to advance to the next one. It takes no parameters.`,
            }],
          }],
          systemInstruction: {
            parts: [{
              text: `You are an expert Indian Corporate AI Presenter. 
              
AUDIENCE ADAPTATION:
- Target: Indian corporate professionals and students in a large hall.
- Tone/Language: Professional, inclusive. Use Indian English with occasional Hindi words (Hinglish) where natural. Use inclusive plural phrasing.
- Script: Begin your presentation explicitly with a warm 'Namaste', and conclude with a formal thank you.

CRITICAL SLIDE SYNC PROTOCOL:
1. You are presenting exactly ${slides.length} slides.
2. WHEN YOU FINISH explaining a slide, you MUST call the 'next_slide' tool. 
3. You cannot skip slides. The 'next_slide' tool will always push the presentation forward by exactly one slide.
4. NEVER say "next slide please" out loud. The tool is the ONLY way to change the slide.
5. After calling the tool, STOP SPEAKING completely.
6. The system will flip the slide and reply with a SUCCESS message telling you the new slide number.
7. ONLY WHEN you receive that message, immediately begin explaining the new slide.

Q&A PROTOCOL (INTERRUPTIONS):
If the user interrupts to ask a question, carefully listen to their audio and answer it naturally and politely. 
Once you finish answering the question, seamlessly resume your presentation from the exact slide you are currently on. DO NOT call the 'next_slide' tool immediately after a question.

STRICT CHARACTER RULE (NO META-COMMENTARY):
NEVER apologize to the system. NEVER say "Oh", "My apologies", "Let me call the tool", or acknowledge system prompts out loud. Simply call the tool silently in the background and maintain your professional presentation persona.`
            }],
          },
        },
      }));

      startAudioWorklet(ws).catch(err => setWsStatus("Error - AudioWorklet failed"));
    };

    ws.onmessage = async (event) => {
      try {
        const text     = event.data instanceof Blob ? await event.data.text() : event.data;
        const response = JSON.parse(text);

        const getAudioDelay = () => {
          if (!audioContextRef.current) return 0;
          return Math.max(0, (playbackTimeRef.current - audioContextRef.current.currentTime) * 1000);
        };

        if (response.setupComplete) {
          setWsStatus("System Live (Ready)");
          if (slides.length > 0) {
            const parts = [{ text: "SYSTEM: Presentation images are uploaded to your memory. Do NOT start speaking yet. Await the user's command to begin the presentation." }];
            slides.forEach((s, i) => {
              parts.push({ text: `--- [Slide ${i + 1}] ---` });
              parts.push({ inlineData: { mimeType: s.mimeType, data: s.base64 } });
            });
            ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts }], turnComplete: true } }));
          }
          return;
        }

        if (response.toolCall?.functionCalls?.length) {
          const delay = getAudioDelay(); 

          setTimeout(() => {
            const call = response.toolCall.functionCalls[0];
            
            if (call.name === "next_slide") {
              const targetIdx = currentSlideRef.current + 1;
              
              if (targetIdx < slides.length) {
                setCurrentSlideIndex(targetIdx);
                if (lastSlideChangeTime) lastSlideChangeTime.current = Date.now();

                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ 
                    toolResponse: { 
                      functionResponses: [{
                        id: call.id,
                        name: call.name,
                        response: { result: `SUCCESS. Slide ${targetIdx + 1} is now visible. System Command: WAKE UP and continue presenting immediately.` }
                      }]
                    } 
                  }));
                }
              }
            }
          }, delay);
          return; 
        }

        const parts = response.serverContent?.modelTurn?.parts;
        if (parts) {
          for (const p of parts) if (p.inlineData?.data) await playAudioChunk(p.inlineData.data);
        }

        const tx = response.serverContent?.outputTranscription;
        
        if (tx?.text) {
          const turn = turnIdRef.current, delay = getAudioDelay(), word = tx.text;
          setTimeout(() => {
            if (turnIdRef.current !== turn) return;
            liveChunkRef.current += word;
            setLiveChunk(liveChunkRef.current);
          }, delay);
        }
        
        if (tx?.finished) {
          const turn = turnIdRef.current, delay = getAudioDelay();
          setTimeout(() => {
            if (turnIdRef.current !== turn) return;
            const c = liveChunkRef.current.trim();
            if (c) setTranscript((p) => [...p.slice(-9), c]);
            liveChunkRef.current = ""; setLiveChunk("");
          }, delay + 120);
        }

        if (response.serverContent?.interrupted) {
          stopAllAudio();
          turnIdRef.current += 1;
          if (liveChunkRef.current.trim()) setTranscript((p) => [...p.slice(-9), liveChunkRef.current.trim()]);
          liveChunkRef.current = ""; setLiveChunk("");
        }
      } catch (e) {
        console.error("WebSocket Message Error:", e);
      }
    };

    ws.onclose = () => setWsStatus("Disconnected");
    ws.onerror = () => setWsStatus("Error - check console");
  };

  const disconnect = (onReset) => {
    wsRef.current?.close(); wsRef.current = null;
    if (onReset) onReset();
    turnIdRef.current += 1; liveChunkRef.current = ""; setLiveChunk(""); setWsStatus("Disconnected"); setTranscript([]);
  };

  return { wsStatus, wsRef, transcript, liveChunk, connectWebSocket, disconnect, sendClientText };
}