// script.js — Decision Disco (Multi-Model Fallback Edition)

(function () {
  console.log("Decision Disco loaded");

  // --- FREE MODEL LIST (The Waterfall) ---
  const FREE_MODELS = [
    "deepseek/deepseek-r1:free",          // 1. Best reasoning (often busy)
    "google/gemini-2.0-flash-exp:free",   // 2. Reliable & Fast backup
    "meta-llama/llama-3.2-11b-vision-instruct:free" // 3. Solid backup
  ];

  document.addEventListener("DOMContentLoaded", () => {
    
    // --- QUESTIONS DATA ---
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

    // --- STATE ---
    let answers = [], category = "", userQuestion = "";

    // --- ELEMENTS ---
    const startBtn = document.getElementById("startBtn");
    const newBtn = document.getElementById("newBtn");
    const startScreen = document.getElementById("startScreen");
    const quizEl = document.getElementById("quiz");
    const resultScreen = document.getElementById("resultScreen");
    const finalAdvice = document.getElementById("finalAdvice");
    const prosConsEl = document.getElementById("prosCons");

    // --- EVENT LISTENERS ---
    startBtn?.addEventListener("click", onStartClick);
    newBtn?.addEventListener("click", () => location.reload());

    // --- LOGIC ---

    function onStartClick() {
      category = document.getElementById("category")?.value;
      userQuestion = document.getElementById("question")?.value.trim();
      
      if (!category || !userQuestion) {
        alert("Please select a category and type your question!");
        return;
      }
      
      startScreen.style.display = "none";
      quizEl.style.display = "block";
      answers = [];
      showQuestion(0);
    }

    function showQuestion(i) {
      if (i >= 4) return showResult();
      
      quizEl.innerHTML = `
        <h3>Question ${i+1}/4</h3>
        <p class="question-text">${escapeHtml(questions[category][i])}</p>
        <input type="text" id="ans" class="neon-input" placeholder="Be honest..."><br>
        <button class="neon-btn" id="nextBtn">Next →</button>
      `;
      
      setTimeout(() => document.getElementById("ans")?.focus(), 100);
      document.getElementById("nextBtn")?.addEventListener("click", () => next(i));
      
      // Allow Enter key to submit
      document.getElementById("ans")?.addEventListener("keypress", (e) => {
        if(e.key === 'Enter') next(i);
      });
    }

    function next(i) {
      const el = document.getElementById("ans");
      const ans = el.value.trim();
      if (!ans) return alert("Please type something!");
      answers.push(ans);
      showQuestion(i + 1);
    }

    async function showResult() {
      quizEl.style.display = "none";
      resultScreen.style.display = "block";
      finalAdvice.innerHTML = `<div class="loader"></div><p style="text-align:center">Consulting the oracle...</p>`;
      prosConsEl.innerHTML = "";

      try {
        const result = await getOpenRouterAdvice();
        finalAdvice.innerHTML = result.text;
        prosConsEl.innerHTML = result.prosCons;
      } catch (e) {
        console.error("Final Error:", e);
        finalAdvice.innerHTML = `<div class="score">Error</div><div class="advice-text">The AI spirits are overwhelmed right now. Please wait 30 seconds and try again.<br><br><small>Error: ${escapeHtml(e.message)}</small></div>`;
      }
    }

    // --- AI LOGIC (ROBUST) ---

    function buildPrompt() {
      return `Role: Brutally honest but kind life coach.
User Dilemma: "${userQuestion}" (Category: ${category})
User Answers:
1. ${answers[0]}
2. ${answers[1]}
3. ${answers[2]}
4. ${answers[3]}

Task: Analyze and output valid JSON only. No markdown formatting. No conversational filler.
Required JSON Structure:
{
  "score": "Strong Yes — 9/10",
  "advice": "2-3 insightful sentences.",
  "pros": ["point 1", "point 2"],
  "cons": ["risk 1", "risk 2"]
}`;
    }

    async function getOpenRouterAdvice() {
      const prompt = buildPrompt();
      
      // Loop through our list of free models
      for (const model of FREE_MODELS) {
        console.log(`Trying model: ${model}...`);
        
        try {
          const res = await fetch("/api/openrouter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 600
            })
          });

          // If rate limited (429) or server error (5xx), throw to trigger next model
          if (res.status === 429 || res.status >= 500) {
            throw new Error(`Model ${model} busy (Status ${res.status})`);
          }

          const data = await res.json();
          
          // Check for provider-specific errors in the body
          if (data.error) {
            throw new Error(`Provider Error: ${data.error.message}`);
          }

          const rawContent = data.choices?.[0]?.message?.content;
          if (!rawContent) throw new Error("Empty response from AI");

          // Cleanup JSON (Some models add ```json ... ``` wrappers)
          const jsonStr = extractFirstJsonObject(rawContent);
          if (!jsonStr) throw new Error("Could not find valid JSON in response");

          const js = JSON.parse(jsonStr);

          // If we got here, SUCCESS! Return formatted HTML.
          return {
            text: `<div class="score">${escapeHtml(js.score)}</div><div class="advice-text">${escapeHtml(js.advice)}</div>`,
            prosCons: `<div class="pros-cons"><div class="column pro"><h3>Pros</h3><ul>${js.pros.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul></div><div class="column con"><h3>Cons/Risks</h3><ul>${js.cons.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul></div></div>`
          };

        } catch (err) {
          console.warn(`Attempt failed on ${model}:`, err);
          // Loop continues to next model...
        }
      }

      // If loop finishes without returning, all models failed.
      throw new Error("All free AI models are currently busy. Try again in 1 minute.");
    }

    // --- HELPERS ---

    function extractFirstJsonObject(text) {
      // Find the first '{' and the last '}'
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first === -1 || last === -1) return null;
      return text.substring(first, last + 1);
    }

    function escapeHtml(s) {
      if (typeof s !== 'string') return s;
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

  });
})();