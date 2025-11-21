export default async function handler(req, res) {
  // 1. Handle CORS (Allows your frontend to talk to this backend)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle browser pre-checks
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Ensure we only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. Check for the API Key
  const KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY) {
    return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY in server environment' });
  }

  try {
    // 4. Forward the request to OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://decision-disco.vercel.app", // Helps with OpenRouter rankings
        "X-Title": "Decision Disco"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // 5. Send back the exact status code (e.g. 429 or 503) 
    // This is important so the frontend knows if it should retry with a different model
    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}