export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    console.error('Missing OPENROUTER_API_KEY env var');
    return res.status(500).json({ error: 'server_missing_config' });
  }

  try {
    const body = {
      model: req.body.model || "deepseek/deepseek-r1:free",
      messages: req.body.messages || [],
      max_tokens: req.body.max_tokens || 500,
      temperature: typeof req.body.temperature === "number" ? req.body.temperature : 0.7,
      stream: false
    };

    const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await apiRes.text();
    res.status(apiRes.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    console.error('openrouter proxy error:', err);
    res.status(500).json({ error: 'proxy_error', detail: String(err.message || err) });
  }
}
