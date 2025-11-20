// server.js — serves your current folder + proxies to OpenRouter safely
require('dotenv').config();
const express = require('express');
const path = require('path');

// If Node is 18+, fetch is built-in. If Node <18, run: npm i node-fetch
// const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Serve your existing project (index.html, script.js, style.css)
app.use(express.static(path.join(__dirname)));

const KEY = process.env.OPENROUTER_API_KEY;
console.log('OPENROUTER_API_KEY present?', !!KEY);


if (!KEY) {
  console.error("❌ ERROR: Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

// Proxy route for AI calls
app.post("/api/openrouter", async (req, res) => {
  try {
    const payload = {
      model: req.body.model || "deepseek/deepseek-r1:free",
      messages: req.body.messages,
      max_tokens: req.body.max_tokens || 500,
      temperature: req.body.temperature ?? 0.7
    };

    const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await apiRes.text();
    res.status(apiRes.status).type('application/json').send(text);

  } catch (err) {
    console.error("🔥 Proxy error:", err);
    res.status(500).json({ error: "proxy_failed", detail: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
