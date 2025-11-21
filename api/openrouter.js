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

  // CLEAN THE KEY (The Fix)
  // We use .trim() to remove accidental spaces or newlines from the copy-paste
  const rawKey = process.env.GOOGLE_API_KEY;
  const KEY = rawKey ? rawKey.trim() : null;

  if (!KEY) return res.status(500).json({ error: 'Missing GOOGLE_API_KEY' });

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
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
      console.error("Google API Error:", data.error);
      return res.status(400).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    // Return the specific error message so the frontend sees it
    return res.status(500).json({ error: "Server Error", details: error.message });
  }
}