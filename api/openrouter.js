export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Use the NEW Google Key
  const KEY = process.env.GOOGLE_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'Missing GOOGLE_API_KEY' });

  try {
    // We point to Google's OpenAI-compatible endpoint
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash", // Super fast and smart
        messages: req.body.messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();

    // Check for Google specific errors
    if (data.error) {
      console.error("Google API Error:", data.error);
      return res.status(400).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).json({ error: "Server Error", details: error.message });
  }
}