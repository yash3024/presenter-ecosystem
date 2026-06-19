"use client";

import { useRef, useState } from "react";

let workletModuleLoaded = false;

export function useAudio() {
  const [micStatus, setMicStatus] = useState("Offline");
  const [isMicMuted, setIsMicMuted] = useState(true); // START MUTED BY DEFAULT

  const audioContextRef  = useRef(null);
  const streamRef        = useRef(null);
  const workletNodeRef   = useRef(null);
  const playbackTimeRef  = useRef(0);
  const analyserRef      = useRef(null);
  const activeSourcesRef = useRef([]);

  // ── INIT MIC (Auto-Muted) ──────────────────────────────────────────────────
  const initializeAudio = async () => {
    if (audioContextRef.current) return; // Already initialized

    try {
      setMicStatus("Connecting...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Force mute the track immediately so it doesn't listen to background noise
      const track = stream.getAudioTracks()[0];
      if (track) track.enabled = false;
      setIsMicMuted(true);

      const AC = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AC({ sampleRate: 16000 });

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.6;

      setMicStatus("Live (16 kHz)");
    } catch (err) {
      console.error("Mic error:", err);
      setMicStatus("Access Denied");
    }
  };

  // ── MUTE CONTROLS ─────────────────────────────────────────────────────────
  const setMicActive = (active) => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = active;
      setIsMicMuted(!active);
    }
  };

  // ── STOP ALL QUEUED AUDIO (For interruptions) ─────────────────────────────
  const stopAllAudio = () => {
    activeSourcesRef.current.forEach((s) => { try { s.stop(); } catch (_) {} });
    activeSourcesRef.current = [];
    if (audioContextRef.current) {
      playbackTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  // ── PLAY A BASE64 PCM CHUNK ───────────────────────────────────────────────
  const playAudioChunk = async (base64Audio) => {
    try {
      if (!audioContextRef.current) return;
      if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();

      const binary = atob(base64Audio);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const int16   = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

      const buf = audioContextRef.current.createBuffer(1, float32.length, 24000);
      buf.getChannelData(0).set(float32);

      const src = audioContextRef.current.createBufferSource();
      src.buffer = buf;
      src.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      const now = audioContextRef.current.currentTime;
      if (playbackTimeRef.current < now) playbackTimeRef.current = now;
      src.start(playbackTimeRef.current);
      playbackTimeRef.current += buf.duration;

      activeSourcesRef.current.push(src);
      src.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== src); };
    } catch (e) {}
  };

  // ── START PCM AUDIO WORKLET ─────────────────────────────────────────────
  const startAudioWorklet = async (ws) => {
    const ctx = audioContextRef.current;
    if (!workletModuleLoaded) {
      const code = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const ch = inputs[0]?.[0];
            if (ch) this.port.postMessage(ch);
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      const blob = new Blob([code], { type: "application/javascript" });
      const url  = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      workletModuleLoaded = true;
    }

    const source = ctx.createMediaStreamSource(streamRef.current);
    const node   = new AudioWorkletNode(ctx, "pcm-processor");
    let pcmBuffer = [];

    node.port.onmessage = (e) => {
      const f32   = e.data;
      const pcm16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) {
        const s = Math.max(-1, Math.min(1, f32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      pcmBuffer.push(...new Uint8Array(pcm16.buffer));

      if (pcmBuffer.length >= 4096) {
        let bin = "";
        for (const b of pcmBuffer) bin += String.fromCharCode(b);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ realtimeInput: { audio: { data: btoa(bin), mimeType: "audio/pcm;rate=16000" } } }));
        }
        pcmBuffer = [];
      }
    };

    source.connect(node);
    workletNodeRef.current = node;
  };

  const resetAudio = () => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    workletModuleLoaded = false;
    playbackTimeRef.current = 0;
    setMicStatus("Offline");
    setIsMicMuted(true);
  };

  return { micStatus, isMicMuted, audioContextRef, analyserRef, streamRef, playbackTimeRef, initializeAudio, setMicActive, stopAllAudio, playAudioChunk, startAudioWorklet, resetAudio };
}