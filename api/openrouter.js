// api/openrouter.js — Debugging Version

export default async function handler(req, res) {
  // CORS headers setup (unchanged)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Check for Key (We know this works now, but good to keep)
  const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_KEY) {
    console.error("CRITICAL: GOOGLE_API_KEY is missing in Vercel Environment Variables.");
    return res.status(500).json({ error: { message: "Server Misconfiguration: Missing API Key" } });
  }

  try {
    // 2. Prepare the request to Google Gemini
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_KEY}`;
    
    // Transform incoming OpenAI-style format to Gemini format
    const incomingMessages = req.body.messages || [];
    const lastUserMessage = incomingMessages[incomingMessages.length - 1]?.content || "";

    const geminiBody = {
      contents: [{
        parts: [{
          text: lastUserMessage
        }]
      }]
    };

    console.log("Attempting to contact Google API...");

    // 3. Make the call
    const response = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    // --- THE NEW DEBUGGING PART ---
    
    // If Google didn't return a 200 OK (Success)
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GOOGLE API ERROR! Status: ${response.status}`);
      console.error("Error Details:", errorText); // This will show up in Vercel logs
      throw new Error(`Google API returned status: ${response.status}`);
    }
    
    // --- END DEBUGGING PART ---

    const data = await response.json();

    // Transform Gemini response back to OpenAI format for the frontend
    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    const openAIResponse = {
      choices: [{
        message: {
          content: geminiText
        }
      }]
    };

    res.status(200).json(openAIResponse);

  } catch (error) {
    // Catch network errors or the error we threw above
    console.error("SERVER INTERNAL ERROR:", error.message);
    res.status(500).json({ error: { message: error.message || "Internal Server Error" } });
  }
}