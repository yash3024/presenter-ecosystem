const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config({ path: '.env.local' }); // Load Next.js env variables

const app = express();
app.use(cors());

// Basic health check route for Google Cloud Run
app.get('/health', (req, res) => res.status(200).send('OK'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs) => {
  console.log('[PROXY] Frontend client connected.');

  // Grab the API key securely from the server environment
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[PROXY] Missing API Key!');
    clientWs.close();
    return;
  }

  const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
  const geminiWs = new WebSocket(GEMINI_WS_URL);

  // --- THE FIX: Message Buffer Queue ---
  let messageQueue = [];

  geminiWs.on('open', () => {
    console.log('[PROXY] Successfully connected to Gemini API.');
    // Google is ready! Drain the queue and send the held setup message.
    messageQueue.forEach((msg) => {
      geminiWs.send(msg.data, { binary: msg.isBinary });
    });
    messageQueue = []; // Clear the queue after sending
  });

  // 1. Forward frontend audio/commands to Gemini
  clientWs.on('message', (data, isBinary) => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      // Send directly if connected
      geminiWs.send(data, { binary: isBinary });
    } else {
      // Hold the message if Google hasn't picked up yet
      messageQueue.push({ data, isBinary });
    }
  });

  // 2. Forward Gemini AI responses back to the frontend
  geminiWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary });
    }
  });

  // 3. Handle Disconnections smoothly
  clientWs.on('close', () => {
    console.log('[PROXY] Frontend disconnected.');
    geminiWs.close();
  });

  geminiWs.on('close', () => {
    console.log('[PROXY] Gemini API disconnected.');
    clientWs.close();
  });

  geminiWs.on('error', (err) => console.error("[PROXY] Gemini Error:", err.message));
  clientWs.on('error', (err) => console.error("[PROXY] Client Error:", err.message));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Secure AI Proxy Server running on ws://localhost:${PORT}`);
});