/**
 * api/openrouter.js — Vercel serverless proxy to OpenRouter
 * Expects OPENROUTER_API_KEY in Vercel env vars.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY) {
    console.error('Missing OPENROUTER_API_KEY env var');
    return res.status(500).json({ error: 'server_missing_config' });
  }

  const requestedModel = req.body.model || 'deepseek/deepseek-r1:free';
  const fallbacks = [requestedModel, 'gpt-4o-mini'].filter(Boolean);

  const tryModel = async (model) => {
    const body = {
      model,
      messages: req.body.messages || [],
      max_tokens: req.body.max_tokens || 500,
      temperature: typeof req.body.temperature === 'number' ? req.body.temperature : 0.7,
      stream: false
    };
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await r.text().catch(()=>null);
    return { ok: r.ok, status: r.status, text };
  };

  for (const model of [...new Set(fallbacks)]) {
    try {
      const resp = await tryModel(model);
      if (resp.ok) return res.status(resp.status).type('application/json').send(resp.text);
      if (resp.status === 429 || resp.status >= 500) { console.warn('Transient error for model', model, resp.status); continue; }
      return res.status(resp.status).type('application/json').send(resp.text || JSON.stringify({ error: 'provider_error' }));
    } catch (err) {
      console.error('Fetch error for model', model, err);
      continue;
    }
  }

  return res.status(502).json({ error: 'all_providers_failed', message: 'All upstream attempts failed.' });
}
