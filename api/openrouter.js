export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 2. AGGRESSIVE KEY CLEANING
  const rawKey = process.env.GOOGLE_API_KEY;
  
  // Debug log (Check Vercel Function Logs to see this)
  console.log("Raw Key exists?", !!rawKey);
  if (rawKey) {
     console.log("Raw Key length:", rawKey.length);
  }

  // Remove ALL spaces, newlines, and tabs using Regex
  const KEY = rawKey ? rawKey.replace(/\s/g, '') : null;

  if (!KEY) {
    console.error("Key is missing after cleaning");
    return res.status(500).json({ error: 'Missing GOOGLE_API_KEY configuration' });
  }

  try {
    // 3. Request to Google
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        // The error happens here if KEY has spaces. We fixed it above.
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash", 
        messages: req.body.messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Google Provider Error:", JSON.stringify(data.error));
      return res.status(400).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("CRITICAL PROXY ERROR:", error);
    // Send the actual error text to the frontend so we can read it
    return res.status(500).json({ error: "Server Error", details: error.message });
  }
}