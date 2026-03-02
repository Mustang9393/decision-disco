// api/openrouter.js — Optimized for Speed (Gemini 2.5 Flash-Lite)

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_KEY) {
    return res.status(500).json({ error: { message: "Server Misconfiguration: Missing API Key" } });
  }

  try {
    // UPDATED: Points to Gemini 2.5 Flash-Lite
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_KEY}`;
    
    const incomingMessages = req.body.messages || [];
    const lastUserMessage = incomingMessages[incomingMessages.length - 1]?.content || "";

    const geminiBody = {
      contents: [{
        parts: [{ text: lastUserMessage }]
      }],
      generationConfig: {
        // Disabling thinking for maximum speed in Decision Disco
        thinking_config: { thinking_budget: 0 }
      }
    };

    const response = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Returns in OpenAI-compatible format for your frontend
    res.status(200).json({
      choices: [{
        message: { content: geminiText }
      }]
    });

  } catch (error) {
    res.status(500).json({ error: { message: error.message || "Internal Server Error" } });
  }
}