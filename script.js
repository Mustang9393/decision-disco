// script.js — Decision Disco (Gemini Edition)

(function () {
  console.log("Decision Disco loaded");

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
        const result = await getGeminiAdvice();
        finalAdvice.innerHTML = result.text;
        prosConsEl.innerHTML = result.prosCons;
      } catch (e) {
        console.error("Final Error:", e);
        finalAdvice.innerHTML = `<div class="score">Error</div><div class="advice-text">Connection error. Please try again.<br><small>${escapeHtml(e.message)}</small></div>`;
      }
    }

    function buildPrompt() {
      return `Role: Brutally honest but kind life coach.
User Dilemma: "${userQuestion}" (Category: ${category})
User Answers:
1. ${answers[0]}
2. ${answers[1]}
3. ${answers[2]}
4. ${answers[3]}

Task: Output valid JSON only. Do not use Markdown formatting (no \`\`\`json).
Required JSON Structure:
{
  "score": "Strong Yes — 9/10",
  "advice": "2-3 insightful sentences.",
  "pros": ["point 1", "point 2"],
  "cons": ["risk 1", "risk 2"]
}`;
    }

   async function getGeminiAdvice() {
      const prompt = buildPrompt();
      
      const res = await fetch("/api/openrouter", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        })
      });

      // 1. Get raw text first (so we can see HTML errors)
      const rawText = await res.text();

      // 2. Try to parse it as JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        // If it fails, it's likely an HTML error page from Vercel
        console.error("Non-JSON response:", rawText);
        throw new Error(`Server Error (Not JSON): ${rawText.substring(0, 100)}...`); 
      }
      
      // 3. Handle API errors
      if (data.error) {
        if (typeof data.error === 'string') throw new Error(data.details || data.error);
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error("Empty response from AI");

      const jsonStr = extractFirstJsonObject(rawContent);
      if (!jsonStr) throw new Error("Could not find valid JSON in response");

      const js = JSON.parse(jsonStr);

      return {
        text: `<div class="score">${escapeHtml(js.score)}</div><div class="advice-text">${escapeHtml(js.advice)}</div>`,
        prosCons: `<div class="pros-cons"><div class="column pro"><h3>Pros</h3><ul>${js.pros.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul></div><div class="column con"><h3>Cons/Risks</h3><ul>${js.cons.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul></div></div>`
      };
    }

    function extractFirstJsonObject(text) {
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