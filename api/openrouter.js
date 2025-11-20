/**
 * api/openrouter.js — Vercel serverless proxy to OpenRouter
 * Expects OPENROUTER_API_KEY in Vercel env vars.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  const KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY) return res.status(500).json({ error:'server_missing_config' });

  const body = {
    model: req.body.model || 'deepseek/deepseek-r1:free',
    messages: req.body.messages || [],
    max_tokens: req.body.max_tokens || 500,
    temperature: typeof req.body.temperature === 'number' ? req.body.temperature : 0.7,
    stream: false
  };

  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    const text = await r.text().catch(()=>null);
    return res.status(r.status).type('application/json').send(text);
  } catch (err) {
    console.error('proxy error', err);
    return res.status(502).json({ error:'proxy_error', detail: String(err) });
  }
}
