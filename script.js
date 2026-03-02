// script.js — Decision Disco v4.1 (Gemini 2.5 Optimized + Pulse UI)

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
      
      // FIXED: Added 'loading-pulse' class here
      quizEl.innerHTML = `
        <div style="text-align:center; padding:40px;" class="loading-pulse">
          <div class="loader"></div>
          <h3 style="margin-top:20px; color:var(--primary);">Analyzing your dilemma...</h3>
          <p style="opacity:0.7;">Disco is spinning the decks...</p>
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
      quizEl.innerHTML = `
        <div class="fade-in-up">
          <div style="color:var(--primary); font-weight:700; font-size:0.9em; margin-bottom:10px; letter-spacing:1px;">
            STEP ${i+1} / ${generatedQuestions.length}
          </div>
          <h2 style="margin-bottom:25px; line-height:1.4;">${escapeHtml(generatedQuestions[i])}</h2>
          <div class="text-wrapper" style="margin-bottom:25px;">
             <span class="material-icons-round icon">edit_note</span>
            <input type="text" id="ans" placeholder="Your honest answer..." autocomplete="off">
          </div>
          <button class="btn-primary" id="nextBtn">
            <span>Next Step</span>
             <span class="material-icons-round">arrow_forward</span>
          </button>
        </div>
      `;
      
      document.getElementById("ans")?.focus();
      const handleNext = () => {
        const val = document.getElementById("ans").value.trim();
        if(!val) {
          document.getElementById("ans").style.borderColor = "var(--primary)";
          return;
        }
        answers.push(val);
        showQuestion(i + 1);
      };

      document.getElementById("nextBtn").addEventListener("click", handleNext);
      document.getElementById("ans").addEventListener("keypress", (e) => { if(e.key === 'Enter') handleNext(); });
    }

    async function showResult() {
      document.getElementById("quiz").classList.add("hidden");
      const resScreen = document.getElementById("resultScreen");
      const adviceBox = document.getElementById("finalAdvice");
      resScreen.classList.remove("hidden");
      
      // FIXED: Added 'loading-pulse' class here
      adviceBox.innerHTML = `
        <div style="text-align:center; padding:40px;" class="loading-pulse">
          <div class="loader"></div>
          <p style="margin-top:15px; opacity:0.8;">Synthesizing the truth...</p>
        </div>
      `;

      try {
        const result = await getFinalVerdict();
        adviceBox.innerHTML = result.text;
        document.getElementById("prosCons").innerHTML = result.prosCons;
      } catch (e) {
        adviceBox.innerHTML = `
          <div class="score" style="color:#FF4757;">Error</div>
          <p>The AI tripped on the dancefloor.</p>
          <button onclick="location.reload()" class="btn-secondary">Try Again</button>
        `;
      }
    }

    // --- AI API CALLS (Optimized for Gemini 2.5 Flash-Lite) ---

    async function generateCustomQuestions(cat, question) {
      const prompt = `Return ONLY a plain JSON array of 3 strings. Context: "${question}" (Vibe: ${cat}). Diagnostic questions only. No intro/outro.`;
      const data = await callAI(prompt);
      return parseRobustJSON(data).slice(0, 3);
    }

    async function getFinalVerdict() {
      const prompt = `Return ONLY JSON. Dilemma: "${userQuestion}". User Answers: ${generatedQuestions.map((q,i) => `${q}: ${answers[i]}`).join('|')}. Format: {"score": "2 words", "advice": "3 sentences", "pros": ["string","string"], "cons": ["string","string"]}`;
      const rawText = await callAI(prompt);
      const js = parseRobustJSON(rawText);

      return {
        text: `
          <div class="score">${escapeHtml(js.score)}</div>
          <div style="margin-bottom:25px; font-size:1.1em; line-height:1.6; border-left:3px solid var(--primary); padding-left:15px; color:rgba(255,255,255,0.9);">
            ${escapeHtml(js.advice)}
          </div>
        `,
        prosCons: `
          <div class="pros-cons">
            <div class="column pro"><h3>✨ The Good</h3><ul>${js.pros.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul></div>
            <div class="column con"><h3>⚠️ The Risks</h3><ul>${js.cons.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul></div>
          </div>`
      };
    }

    async function callAI(userPrompt) {
      try {
        const res = await fetch("/api/openrouter", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: userPrompt }] })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err) {
        throw err;
      }
    }

    function parseRobustJSON(text) {
      try { return JSON.parse(text); } 
      catch { 
        // Fallback for when AI includes markdown blocks
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        throw new Error("JSON Parse Fail");
      }
    }

    function escapeHtml(s) { 
      if (!s) return "";
      return s.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
    }
    
    function getFallbackQuestions() { return ["How do you feel?", "What's the main risk?", "What happens if you wait?"]; }
  });
})();