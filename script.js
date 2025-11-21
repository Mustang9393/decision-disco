// script.js — Decision Disco v3 (Dynamic AI Questions)

(function () {
  // State
  let category = "";
  let userQuestion = "";
  let generatedQuestions = []; // AI will fill this
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

      // 1. Show Loading State immediately
      const startScreen = document.getElementById("startScreen");
      startScreen.classList.add("hidden");
      
      const quizEl = document.getElementById("quiz");
      quizEl.classList.remove("hidden");
      quizEl.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <div class="loader"></div>
          <h3 style="margin-top:20px; color:var(--primary);">Analyzing your dilemma...</h3>
          <p style="opacity:0.7;">Generating custom questions just for you.</p>
        </div>
      `;

      // 2. Ask AI to generate relevant questions
      try {
        generatedQuestions = await generateCustomQuestions(category, userQuestion);
        answers = []; // Reset answers
        showQuestion(0); // Start the quiz with NEW questions
      } catch (error) {
        console.error("Question Gen Error:", error);
        alert("The AI is having a nap. Falling back to basic questions.");
        // Fallback to generic if API fails
        generatedQuestions = getFallbackQuestions(category);
        showQuestion(0);
      }
    }

    function showQuestion(i) {
      if (i >= generatedQuestions.length) return showResult();
      
      const quizEl = document.getElementById("quiz");
      
      quizEl.innerHTML = `
        <div class="fade-in-up">
          <div style="margin-bottom:15px; color:var(--primary); font-weight:700; font-size:0.9em; letter-spacing:1px; text-transform:uppercase;">
            Question ${i+1} / ${generatedQuestions.length}
          </div>
          <h2 style="margin:0 0 25px 0; font-size:1.5em; line-height:1.4;">
            ${escapeHtml(generatedQuestions[i])}
          </h2>
          
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
      
      setTimeout(() => document.getElementById("ans")?.focus(), 100);
      
      const handleNext = () => {
        const val = document.getElementById("ans").value.trim();
        if(!val) {
           document.getElementById("ans").style.borderColor = "#FF4757";
           return;
        }
        answers.push(val);
        showQuestion(i + 1);
      };

      document.getElementById("nextBtn").addEventListener("click", handleNext);
      document.getElementById("ans").addEventListener("keypress", (e) => {
        if(e.key === 'Enter') handleNext();
      });
    }

    async function showResult() {
      document.getElementById("quiz").classList.add("hidden");
      const resScreen = document.getElementById("resultScreen");
      resScreen.classList.remove("hidden");
      
      const adviceBox = document.getElementById("finalAdvice");
      adviceBox.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <div class="loader"></div>
          <p style="opacity:0.7; font-size:1.1em; animation: pulse 1.5s infinite;">Synthesizing the truth...</p>
        </div>
      `;

      try {
        const result = await getFinalVerdict();
        adviceBox.innerHTML = result.text;
        document.getElementById("prosCons").innerHTML = result.prosCons;
      } catch (e) {
        adviceBox.innerHTML = `
          <div class="score" style="color:#FF4757; font-size:2em;">Error</div>
          <p>The AI got confused. (${e.message})</p>
          <button onclick="location.reload()" class="btn-secondary" style="margin-top:10px">Try Again</button>
        `;
      }
    }

    // --- AI API CALLS ---

    // 1. Generate Questions
    async function generateCustomQuestions(cat, question) {
      const prompt = `
        Context: User dilemma is "${question}" (Category: ${cat}).
        Task: Generate 3 short, punchy, diagnostic questions to help them decide. 
        Style: Direct, insightful, maybe a little sassy.
        Format: Return ONLY a JSON Array of strings. Example: ["Q1", "Q2", "Q3"]
      `;
      
      const data = await callAI(prompt);
      // Clean and Parse
      const json = parseRobustJSON(data);
      if (Array.isArray(json)) return json.slice(0, 3); // Ensure max 3
      throw new Error("Invalid Question Format");
    }

    // 2. Get Final Verdict
    async function getFinalVerdict() {
      const prompt = `
        Role: A wise, empathetic, no-nonsense life coach.
        Dilemma: "${userQuestion}"
        
        I asked them these questions:
        ${generatedQuestions.map((q,i) => `${i+1}. ${q}: "${answers[i]}"`).join('\n')}

        Task:
        1. Give a definitive score/verdict.
        2. Explain WHY based on their answers.
        3. List Pros/Cons.

        Format: JSON ONLY.
        {
          "score": "Short Verdict (e.g. Do It!)",
          "advice": "3 sentences of warm, insightful advice.",
          "pros": ["Pro 1", "Pro 2"],
          "cons": ["Con 1", "Con 2"]
        }
      `;
      
      const rawText = await callAI(prompt);
      const js = parseRobustJSON(rawText);

      return {
        text: `
          <div class="score">${escapeHtml(js.score)}</div>
          <div style="margin-bottom:20px; font-size:1.15em; line-height:1.6; border-left:3px solid var(--primary); padding-left:15px;">
            ${escapeHtml(js.advice)}
          </div>
        `,
        prosCons: `
          <div class="pros-cons">
            <div class="column pro">
              <h3>✨ The Good</h3>
              <ul>${js.pros.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>
            <div class="column con">
              <h3>⚠️ The Risks</h3>
              <ul>${js.cons.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul>
            </div>
          </div>
        `
      };
    }

    // --- UTILS ---

    async function callAI(userPrompt) {
      const res = await fetch("/api/openrouter", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: userPrompt }] })
      });
      
      const raw = await res.text();
      // Handle HTTP errors
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      
      try {
        const data = JSON.parse(raw);
        if(data.error) throw new Error(data.error.message || "API Provider Error");
        return data.choices?.[0]?.message?.content || "";
      } catch (e) {
        throw new Error("Invalid Server Response");
      }
    }

    // THE FIX: Robust JSON Parser that ignores extra text
    function parseRobustJSON(text) {
      try {
        // 1. Try direct parse
        return JSON.parse(text);
      } catch (e) {
        // 2. Try to find { } or [ ]
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (match) {
          try { return JSON.parse(match[0]); }
          catch (err) { console.error("Regex Parse Failed", err); }
        }
        throw new Error("Could not extract JSON from AI response");
      }
    }

    function getFallbackQuestions(cat) {
      // Emergency backup if AI fails
      return [
        "How does this make you feel (1-10)?",
        "What is the worst case scenario?",
        "What would you tell your best friend to do?"
      ];
    }

    function escapeHtml(s) {
      if (typeof s !== 'string') return s;
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
  });
})();