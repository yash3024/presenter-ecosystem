import { experimental_upgradeWebSocket } from "@vercel/functions";
import WebSocket from "ws";

export function GET() {
  return experimental_upgradeWebSocket((clientWs) => {
    // 1. Grab API key from the environment
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[VERCEL PROXY] Missing API Key");
      clientWs.close();
      return;
    }

    const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    // 2. Connect Vercel's server to Google Gemini
    const geminiWs = new WebSocket(GEMINI_WS_URL);
    let messageQueue = [];

    geminiWs.on('open', () => {
      console.log('[VERCEL PROXY] Connected to Gemini API');
      // Drain the queue if frontend sent data early
      messageQueue.forEach((msg) => {
        geminiWs.send(msg.data, { binary: msg.isBinary });
      });
      messageQueue = [];
    });

    // 3. Forward frontend (browser) messages to Gemini
    clientWs.on('message', (data, isBinary) => {
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(data, { binary: isBinary });
      } else {
        messageQueue.push({ data, isBinary });
      }
    });

    // 4. Forward Gemini AI responses back to the frontend
    geminiWs.on('message', (data, isBinary) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    // 5. Handle closures smoothly
    clientWs.on('close', () => geminiWs.close());
    geminiWs.on('close', () => clientWs.close());
  });
}