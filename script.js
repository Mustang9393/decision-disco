// script.js — Decision Disco (full, robust, DOM-ready)
// Replace your current script.js with this file.

(function () {
  console.log("script.js loaded");

  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded");

    const questions = {
      relationship: [
        "How long have you been feeling this way about them?",
        "On a scale 1–10, how respected and safe do you feel with this person?",
        "When you imagine your life with them in 5 years — excited or anxious?",
        "If your best friend was in this exact situation, what would you tell them?"
      ],
      career: [
        "How many hours a day do you dread this job?",
        "On a scale 1–10, how much do you trust your manager/team?",
        "Are you learning or just repeating the same year?",
        "If money wasn't a factor, would you still stay?"
      ],
      financial: [
        "Can you afford this tomorrow without stress?",
        "Will you still love it in 6 months?",
        "Are you buying it to feel better about something else?",
        "What's the real monthly cost?"
      ],
      life: [
        "If failure was impossible, would you still want this?",
        "Are you running TOWARD something great or AWAY from something bad?",
        "Will 80-year-old you regret NOT doing this?",
        "Who will this hurt — have you talked to them?"
      ],
      daily: [
        "How tired are you right now (1–10)?",
        "Will future-you thank you tonight?",
        "Does this align with who you want to become?",
        "What's the worst realistic outcome if you say no?"
      ]
    };

    // State
    let answers = [], category = "", userQuestion = "";

    // DOM elements
    const startBtn = document.getElementById("startBtn");
    const newBtn = document.getElementById("newBtn");
    const startScreen = document.getElementById("startScreen");
    const quizEl = document.getElementById("quiz");
    const resultScreen = document.getElementById("resultScreen");
    const finalAdvice = document.getElementById("finalAdvice");
    const prosConsEl = document.getElementById("prosCons");

    // Sanity checks
    if (!startBtn) console.warn("startBtn not found. Ensure your button id is 'startBtn'");
    if (!quizEl) console.warn("quiz element not found (id='quiz')");
    if (!finalAdvice) console.warn("finalAdvice element not found (id='finalAdvice')");
    if (!resultScreen) console.warn("resultScreen element not found (id='resultScreen')");
    if (!startScreen) console.warn("startScreen element not found (id='startScreen')");

    // Attach listeners
    startBtn?.addEventListener("click", onStartClick);
    newBtn?.addEventListener("click", () => location.reload());

    // If the CTA appears to not respond, this helps debug from console:
    // paste: document.getElementById('startBtn').click()
    function onStartClick() {
      category = document.getElementById("category")?.value;
      userQuestion = document.getElementById("question")?.value.trim();
      if (!category || !userQuestion) {
        alert("Fill everything!");
        return;
      }
      startScreen.style.display = "none";
      quizEl.style.display = "block";
      answers = [];
      showQuestion(0);
    }

    function showQuestion(i) {
      if (i >= 4) return showResult();
      if (!questions[category] || !questions[category][i]) {
        alert("Invalid category or question index. Reloading.");
        return location.reload();
      }

      quizEl.innerHTML = `
        <h3>Question ${i+1}/4</h3>
        <p class="question-text">${escapeHtml(questions[category][i])}</p>
        <input type="text" id="ans" class="neon-input" placeholder="Be honest..."><br>
        <button class="neon-btn" id="nextBtn">Next →</button>
      `;
      setTimeout(() => document.getElementById("ans")?.focus(), 100);
      document.getElementById("nextBtn")?.addEventListener("click", () => next(i));
    }

    function next(i) {
      const el = document.getElementById("ans");
      if (!el) {
        alert("Input not found. Reloading.");
        return location.reload();
      }
      const ans = el.value.trim();
      if (!ans) return alert("Type something!");
      answers.push(ans);
      showQuestion(i + 1);
    }

    async function showResult() {
      quizEl.style.display = "none";
      resultScreen.style.display = "block";
      finalAdvice.innerHTML = `<div class="loader"></div><p>Thinking…</p>`;
      prosConsEl.innerHTML = "";

      try {
        const result = await getOpenRouterAdvice();
        finalAdvice.innerHTML = result.text;
        prosConsEl.innerHTML = result.prosCons;
      } catch (e) {
        console.error("showResult error:", e);
        // If it's a parse error with raw assistant output, show it to help debug
        const safeMsg = escapeHtml(String(e.message || e));
        finalAdvice.innerHTML = `<div class="score">Error</div><div class="advice-text">${safeMsg}</div>`;
        prosConsEl.innerHTML = "";
      }
    }

    function buildPrompt() {
      return `You are Grok, a brutally honest but kind life coach. User's dilemma: "${userQuestion}" (${category}).

Raw answers:
1. ${answers[0] || ""}
2. ${answers[1] || ""}
3. ${answers[2] || ""}
4. ${answers[3] || ""}

Analyze deeply (emotions, nuances). Respond in strict JSON only:
{
  "score": "Strong Yes — 9/10",
  "advice": "1-3 empathetic sentences.",
  "pros": ["bullet1", "bullet2"],
  "cons": ["bullet1", "bullet2"]
}

IMPORTANT: Output exactly one valid JSON object and nothing else. Use double quotes for keys and strings.`;
    }

    // Robust getOpenRouterAdvice with retries and clearer error handling
async function getOpenRouterAdvice() {
  const prompt = buildPrompt();

  const payload = {
    model: "deepseek/deepseek-r1:free",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.7
  };

  // retry policy
  const maxAttempts = 3;
  const baseDelayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // call proxy
      const res = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // non-2xx (proxy-level) status
      if (!res.ok) {
        const text = await res.text().catch(() => "<no-body>");
        // For 5xx errors, we may want to retry
        const isServerError = res.status >= 500 && res.status < 600;
        if (isServerError && attempt < maxAttempts) {
          console.warn(`Proxy HTTP ${res.status}, attempt ${attempt}/${maxAttempts}. Retrying...`);
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
          continue;
        }
        throw new Error(`Proxy error ${res.status}: ${text}`);
      }

      // parse JSON from proxy
      const data = await res.json().catch(() => null);
      if (!data) throw new Error("Proxy returned invalid JSON.");

      // If provider returned an internal error for the choice
      const choice0 = (data.choices && data.choices[0]) ? data.choices[0] : null;
      if (choice0 && choice0.error) {
        // provider-side error (like the one you saw)
        const provErr = choice0.error;
        const provMsg = provErr.message || JSON.stringify(provErr);
        const provCode = provErr.code || "unknown";
        console.warn("Provider-side error in choice:", provErr);

        // if it's a transient 5xx-ish error, retry
        const transientCodes = [502, 503, 504];
        if (transientCodes.includes(provErr.code) && attempt < maxAttempts) {
          console.warn(`Transient provider error ${provCode}, attempt ${attempt}/${maxAttempts}. Retrying...`);
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
          continue;
        }

        // not retriable (or we've exhausted attempts) — throw a helpful error containing provider info
        throw new Error(`Provider error ${provCode}: ${provMsg}`);
      }

      // normally, assistant content is in data.choices[0].message.content
      const raw = (choice0 && choice0.message && choice0.message.content) ? choice0.message.content.trim() : "";
      if (!raw) {
        // no assistant content at all — treat as transient server/provider issue
        // retry a few times for transient empty responses
        if (attempt < maxAttempts) {
          console.warn(`Empty assistant content (attempt ${attempt}/${maxAttempts}). Retrying...`);
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
          continue;
        }
        throw new Error("No assistant content. Response: " + JSON.stringify(data));
      }

      // Try to parse JSON response (robust extraction)
      let js = null;
      try {
        js = JSON.parse(raw);
      } catch (directErr) {
        const extracted = extractFirstJsonObject(raw);
        if (extracted) {
          try { js = JSON.parse(extracted); }
          catch (parseErr) {
            console.warn("Failed to parse extracted JSON:", parseErr, "extracted:", extracted);
          }
        }
      }

      if (!js) {
        // Provide raw assistant output in the thrown error (escaped in UI)
        throw new Error("Assistant didn't return JSON. Raw output: " + raw);
      }

      // Validate expected fields
      if (!js.advice || !Array.isArray(js.pros) || !Array.isArray(js.cons) || !js.score) {
        throw new Error("Assistant JSON missing expected keys. JSON: " + JSON.stringify(js));
      }

      // Success — return formatted HTML
      return {
        text: `<div class="score">${escapeHtml(js.score)}</div><div class="advice-text">${escapeHtml(js.advice)}</div><p class="disclaimer">Grok-powered advice • Not professional • Trust your gut</p>`,
        prosCons: `<div class="pros-cons"><div class="column pro"><h3>Pros</h3><ul>${js.pros.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul></div><div class="column con"><h3>Cons/Risks</h3><ul>${js.cons.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul></div></div>`
      };

    } catch (err) {
      // If last attempt, rethrow; otherwise, loop to retry if appropriate
      console.error(`Attempt ${attempt} failed:`, err);
      if (attempt >= maxAttempts) {
        // Wrap provider/server info into a user-friendly message
        // If the error message contains raw JSON or provider text, we include it in the console but keep UI friendly
        const userMessage = `AI service temporarily unavailable. Try again in a few seconds. (${escapeHtml(String(err.message))})`;
        throw new Error(userMessage);
      }
      // else wait and retry
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  } // for attempts

  // if somehow falls through
  throw new Error("Failed to get a response from the AI service.");
}

    /**
     * Extract the first balanced JSON object from text.
     * Correctly ignores braces inside string literals and handles escapes.
     * Returns the substring '{...}' or null if none found.
     */
    function extractFirstJsonObject(text) {
      const firstBrace = text.indexOf('{');
      if (firstBrace === -1) return null;

      let inString = false;     // false or the quote char that opened the string
      let escape = false;
      let depth = 0;
      for (let i = firstBrace; i < text.length; i++) {
        const ch = text[i];

        if (escape) {
          escape = false;
          continue;
        }

        if (ch === '\\') {
          escape = true;
          continue;
        }

        if (ch === '"' || ch === "'") {
          if (!inString) {
            inString = ch;
          } else if (inString === ch) {
            inString = false;
          }
          continue;
        }

        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              return text.slice(firstBrace, i + 1);
            }
          }
        }
      }
      return null;
    }

    // Escape HTML to avoid XSS when inserting assistant responses
    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // debugging helper available from console:
    // window.debugClickStart = () => document.getElementById('startBtn')?.click();
    window.debugClickStart = () => {
      const b = document.getElementById('startBtn');
      if (b) { b.click(); return true; }
      return false;
    };

    // end DOMContentLoaded
  }); // document.addEventListener
})(); // IIFE end
