// script.js — Decision Disco v4.2 (Gemini 2.5 Optimized + Pulse UI Final)

(function () {
  let category = "";
  let userQuestion = "";
  let generatedQuestions = [];
  let answers = [];

  document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("startBtn");
    const newBtn = document.getElementById("newBtn");
    
    if(startBtn) startBtn.addEventListener("click", onStartClick);
    if(newBtn) newBtn.addEventListener("click", () => location.reload());

    async function onStartClick() {
      category = document.getElementById("category")?.value;
      userQuestion = document.getElementById("question")?.value.trim();
      
      if (!category || !userQuestion) {
        alert("✨ Please select a vibe and type your dilemma!");
        return;
      }

      const startScreen = document.getElementById("startScreen");
      const quizEl = document.getElementById("quiz");
      
      startScreen.classList.add("hidden");
      quizEl.classList.remove("hidden");
      
      // PULSE UI: Loader for Question Generation
      quizEl.innerHTML = `
        <div class="loading-pulse" style="text-align:center; padding:40px;">
          <div class="loader"></div>
          <h3 style="margin-top:20px; color:var(--primary); font-weight:800;">Analyzing your dilemma...</h3>
          <p style="opacity:0.7; font-weight:500;">Disco is spinning the decks...</p>
        </div>
      `;

      try {
        generatedQuestions = await generateCustomQuestions(category, userQuestion);
        answers = [];
        showQuestion(0);
      } catch (error) {
        console.error("Gen Error:", error);
        generatedQuestions = getFallbackQuestions(category);
        showQuestion(0);
      }
    }

    function showQuestion(i) {
      if (i >= generatedQuestions.length) return showResult();
      const quizEl = document.getElementById("quiz");
      
      // Use fade-in-up for smooth question transitions
      quizEl.innerHTML = `
        <div class="fade-in-up">
          <div style="color:var(--primary); font-weight:700; font-size:0.85em; margin-bottom:12px; letter-spacing:1.5px; text-transform:uppercase;">
            Step ${i+1} of ${generatedQuestions.length}
          </div>
          <h2 style="margin-bottom:30px; line-height:1.4; font-size:1.6em;">${escapeHtml(generatedQuestions[i])}</h2>
          
          <div class="text-wrapper" style="margin-bottom:30px;">
             <span class="material-icons-round icon" style="color:var(--primary);">edit_note</span>
            <input type="text" id="ans" placeholder="Type your truth..." autocomplete="off">
          </div>
          
          <button class="btn-primary" id="nextBtn">
            <span>Next Step</span>
            <span class="material-icons-round">arrow_forward</span>
          </button>
        </div>
      `;
      
      const input = document.getElementById("ans");
      input?.focus();

      const handleNext = () => {
        const val = input.value.trim();
        if(!val) {
          input.style.borderColor = "var(--primary)";
          input.placeholder = "Don't leave me hanging!";
          return;
        }
        answers.push(val);
        showQuestion(i + 1);
      };

      document.getElementById("nextBtn").addEventListener("click", handleNext);
      input.addEventListener("keypress", (e) => { if(e.key === 'Enter') handleNext(); });
    }

    async function showResult() {
      document.getElementById("quiz").classList.add("hidden");
      const resScreen = document.getElementById("resultScreen");
      const adviceBox = document.getElementById("finalAdvice");
      resScreen.classList.remove("hidden");
      
      // PULSE UI: Loader for Final Verdict
      adviceBox.innerHTML = `
        <div class="loading-pulse" style="text-align:center; padding:40px;">
          <div class="loader"></div>
          <p style="margin-top:20px; opacity:0.9; font-size:1.1em; font-weight:600;">Synthesizing the truth...</p>
        </div>
      `;

      try {
        const result = await getFinalVerdict();
        adviceBox.innerHTML = result.text;
        document.getElementById("prosCons").innerHTML = result.prosCons;
      } catch (e) {
        adviceBox.innerHTML = `
          <div style="text-align:center; padding:20px;">
            <div class="score" style="color:#FF4757; font-size:2em;">Error</div>
            <p style="margin-bottom:20px;">The AI tripped on the dancefloor.</p>
            <button onclick="location.reload()" class="btn-secondary">Try Again</button>
          </div>
        `;
      }
    }

    // --- AI API CALLS ---

    async function generateCustomQuestions(cat, question) {
      const prompt = `Return ONLY a plain JSON array of 3 strings. Context: "${question}" (Vibe: ${cat}). Diagnostic questions only. No conversational filler. Example: ["Question 1", "Question 2", "Question 3"]`;
      const data = await callAI(prompt);
      const parsed = parseRobustJSON(data);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : getFallbackQuestions(cat);
    }

    async function getFinalVerdict() {
      const prompt = `Return ONLY JSON. Dilemma: "${userQuestion}". User Answers: ${generatedQuestions.map((q,i) => `${q}: ${answers[i]}`).join('|')}. Return format: {"score": "2 words", "advice": "3 sentences", "pros": ["p1","p2"], "cons": ["c1","c2"]}`;
      const rawText = await callAI(prompt);
      const js = parseRobustJSON(rawText);

      return {
        text: `
          <div class="score fade-in">${escapeHtml(js.score)}</div>
          <div class="fade-in-up" style="margin-bottom:30px; font-size:1.15em; line-height:1.7; border-left:4px solid var(--primary); padding-left:20px; color:rgba(255,255,255,0.95);">
            ${escapeHtml(js.advice)}
          </div>
        `,
        prosCons: `
          <div class="pros-cons fade-in-up" style="animation-delay: 0.2s;">
            <div class="column pro">
              <h3>✨ The Good</h3>
              <ul>${js.pros.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>
            <div class="column con">
              <h3>⚠️ The Risks</h3>
              <ul>${js.cons.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul>
            </div>
          </div>`
      };
    }

    async function callAI(userPrompt) {
      const res = await fetch("/api/openrouter", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: userPrompt }] })
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    }

    function parseRobustJSON(text) {
      try { return JSON.parse(text); } 
      catch { 
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        throw new Error("JSON Parse Fail");
      }
    }

    function escapeHtml(s) { 
      if (!s) return "";
      return s.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
    }
    
    function getFallbackQuestions(cat) { 
      return ["How does this change your daily life?", "What is the biggest risk of saying yes?", "Where do you see yourself in 6 months if you do this?"]; 
    }
  });
})();