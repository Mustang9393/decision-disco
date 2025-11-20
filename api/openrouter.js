// api/openrouter.js — resilient proxy with retries + fallback models
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

  // Models to try (first is requested model from client)
  const requestedModel = req.body.model || "deepseek/deepseek-r1:free";
  // Fallback list — replace/extend with models your OpenRouter account supports
  const fallbackModels = [
    requestedModel,
    "gpt-4o-mini",                  // example alternative (replace if not available)
    "mistral/mistral-7b-instruct",  // example alternative
    "oobabooga/ooba-mini"           // example fallback
  ];

  // Remove duplicates while preserving order
  const models = [...new Set(fallbackModels)].filter(Boolean);

  const maxAttemptsPerModel = 2;
  const baseDelayMs = 400; // exponential backoff base

  let lastError = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const body = {
          model,
          messages: req.body.messages || [],
          max_tokens: req.body.max_tokens || 500,
          temperature: typeof req.body.temperature === 'number' ? req.body.temperature : 0.7,
          stream: false
        };

        const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        const text = await apiRes.text().catch(() => null);

        // If provider returned a successful-ish status and content, pass it through
        if (apiRes.ok) {
          return res.status(apiRes.status).type('application/json').send(text);
        }

        // Try to parse provider response to inspect error codes inside choices (OpenRouter wraps provider errors)
        let parsed = null;
        try { parsed = JSON.parse(text); } catch(e){ /* ignore */ }

        // If provider returned a choice-level error (like upstream provider code)
        const choiceErr = parsed?.choices?.[0]?.error;
        if (choiceErr) {
          lastError = choiceErr;
          const code = choiceErr.code || 0;
          // treat 502/503/504/429 as transient
          if ([502,503,504,429].includes(code)) {
            console.warn(`Transient provider error for model ${model} (code ${code}). Attempt ${attempt}`);
            // if we can retry same model, backoff and retry
            if (attempt < maxAttemptsPerModel) {
              await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt-1)));
              continue;
            }
            // else break to try next model
            break;
          } else {
            // non-transient provider error — don't retry
            console.error('Provider returned non-transient error:', choiceErr);
            return res.status(502).json({ error: 'provider_error', detail: choiceErr });
          }
        }

        // Handle HTTP-level server errors (5xx)
        if (apiRes.status >= 500 && apiRes.status < 600) {
          lastError = { message: text || `HTTP ${apiRes.status}`, code: apiRes.status };
          console.warn(`HTTP ${apiRes.status} for model ${model}, attempt ${attempt}`);
          if (attempt < maxAttemptsPerModel) {
            await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt-1)));
            continue;
          }
          break; // try next model
        }

        // For 429 too-many-requests at HTTP layer
        if (apiRes.status === 429) {
          lastError = { message: text || 'Rate limited', code: 429 };
          console.warn(`Rate limited on model ${model}`);
          // try next model immediately
          break;
        }

        // For other non-2xx statuses, either try next model or return the response
        lastError = { message: text || `HTTP ${apiRes.status}`, code: apiRes.status };
        break;

      } catch (err) {
        // Network / fetch errors
        lastError = err;
        console.error(`Fetch error for model ${model} attempt ${attempt}:`, err);
        if (attempt < maxAttemptsPerModel) {
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt-1)));
          continue;
        }
        break;
      }
    } // attempts
    // try the next model in the list
  } // models

  // If we reach here, all models/attempts failed
  console.error('All provider attempts failed. Last error:', lastError);
  // Return a user-friendly message but include detail for debugging (server logs will have full info)
  return res.status(502).json({
    error: 'all_providers_failed',
    message: 'AI providers unavailable or rate limited. Please try again in a few seconds.',
    detail: String(lastError?.message ?? lastError)
  });
}

