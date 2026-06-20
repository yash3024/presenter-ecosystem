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

  // PROGRESSIVE LOADING: Only load the specific slide requested
  const startPresentation = (slidesArray, startIndex = 0) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      
      const systemInstruction = startIndex === 0 
        ? "SYSTEM COMMAND: The presentation is starting now. Please explicitly say 'Namaste' to welcome the audience, and then begin explaining the provided slide image."
        : `SYSTEM COMMAND: We are resuming the presentation. Please seamlessly continue the presentation by explaining the provided slide image. Do not say Namaste again.`;

      const parts = [
        { text: systemInstruction }
      ];
      
      // ONLY send the slide that corresponds to the startIndex
      if (slidesArray && slidesArray.length > startIndex) {
          const currentSlide = slidesArray[startIndex];
          parts.push({ text: `\n\n--- [Current Slide: ${startIndex + 1} of ${slidesArray.length}] ---` });
          parts.push({ 
            inlineData: { 
              mimeType: currentSlide.mimeType, 
              data: currentSlide.base64        
            } 
          });
      } else {
         parts.push({ text: "SYSTEM WARNING: No slide image is available. Please ask the user to upload their slides." });
      }
      
      wsRef.current.send(JSON.stringify({ 
        clientContent: { 
          turns: [{ role: "user", parts }], 
          turnComplete: true 
        } 
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

CRITICAL SLIDE SYNC PROTOCOL:
1. You are presenting a slide deck. The system will provide you with the slide images one at a time.
2. WHEN YOU FINISH explaining the current slide, you MUST call the 'next_slide' tool. 
3. NEVER call the 'next_slide' tool twice in a row. You MUST verbally explain the newly provided slide image to the audience before calling the tool again.
4. You cannot skip slides. The 'next_slide' tool will always push the presentation forward by exactly one slide.
5. NEVER say "next slide please" out loud. The tool is the ONLY way to change the slide.
6. After calling the tool, STOP SPEAKING completely.
7. The system will reply to the tool call by providing the actual image of the NEW slide.
8. ONLY WHEN you receive that new slide image, immediately begin explaining it.

Q&A PROTOCOL (INTERRUPTIONS):
If the user interrupts to ask a question, you are in Q&A Mode. 
1. Listen carefully to their audio.
2. IMPORTANT: Before answering, you MUST repeat or summarize their question out loud so the entire hall can hear it.
3. Provide your answer naturally and politely.
4. Once you finish answering, seamlessly transition back into Presentation Mode and resume explaining the exact slide you are currently on. DO NOT call the 'next_slide' tool immediately after a question unless you were already finished with that slide.

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
          return;
        }

        if (response.toolCall?.functionCalls?.length) {
          const delay = getAudioDelay(); 

          setTimeout(() => {
            const call = response.toolCall.functionCalls[0];
            
            if (call.name === "next_slide") {

              // --- STRICT ANTI-SKIP LOCK ADDED HERE ---
              const now = Date.now();
              const timeSinceLastSlide = lastSlideChangeTime?.current ? (now - lastSlideChangeTime.current) : 20000;

              if (timeSinceLastSlide < 15000 && currentSlideRef.current !== 0) {
                  console.log("BLOCKED AI FROM SKIPPING SLIDE!");
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ 
                      toolResponse: { 
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { result: `ERROR: Action Blocked. You just arrived at this slide. You CANNOT skip it. You MUST verbally explain the contents of Slide ${currentSlideRef.current + 1} to the audience before calling this tool again.` }
                        }]
                      } 
                    }));
                  }
                  return; // Completely stops the UI from skipping!
              }
              // --- END ANTI-SKIP LOCK ---

              const targetIdx = currentSlideRef.current + 1;
              
              if (targetIdx < slides.length) {
                setCurrentSlideIndex(targetIdx);
                if (lastSlideChangeTime) lastSlideChangeTime.current = Date.now();

                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  // PROGRESSIVE LOADING: Attach the NEW slide image directly into the tool response!
                  const targetSlide = slides[targetIdx];
                  const parts = [
                    { text: `SUCCESS. Slide ${targetIdx + 1} is now visible. I have attached the image of this new slide below. System Command: WAKE UP and continue presenting immediately.` },
                    { text: `\n\n--- [Current Slide: ${targetIdx + 1} of ${slides.length}] ---` },
                    { inlineData: { mimeType: targetSlide.mimeType, data: targetSlide.base64 } }
                  ];

                  wsRef.current.send(JSON.stringify({ 
                    clientContent: { 
                      turns: [{ role: "user", parts }], 
                      turnComplete: true 
                    } 
                  }));
                }
              } else {
                 // End of presentation logic
                 if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ 
                      clientContent: { 
                        turns: [{ role: "user", parts: [{ text: "SYSTEM: You have reached the end of the slide deck. Please formally thank the audience and conclude the presentation." }] }], 
                        turnComplete: true 
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
            // FIXED: Expanded the memory buffer to 100 chunks so it stops deleting!
            if (c.length > 0) {
              setTranscript((p) => [...p.slice(-100), c]);
            }
            liveChunkRef.current = ""; setLiveChunk("");
          }, delay + 120);
        }

        if (response.serverContent?.interrupted) {
          stopAllAudio();
          turnIdRef.current += 1;
          const c = liveChunkRef.current.trim();
          // FIXED: Expanded memory buffer here too!
          if (c.length > 0) {
            setTranscript((p) => [...p.slice(-100), c]);
          }
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

  return { wsStatus, wsRef, transcript, liveChunk, connectWebSocket, disconnect, sendClientText, startPresentation };
}