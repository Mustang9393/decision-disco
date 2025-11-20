const questions = {
  relationship: [
    "How long have you been feeling this way about the situation?",
    "On a scale 1–10, how much does this person respect you?",
    "Do you feel peace or anxiety when you think about staying in this situation?",
    "If your best friend was in this exact position, what would you tell them?"
  ],
  career: [
    "How many hours per week do you currently think about leaving this job?",
    "On a scale 1–10, how much do you respect your current manager?",
    "Are you learning and growing, or just collecting a paycheck?",
    "Will staying another 12 months make your resume stronger or just older?"
  ],
  financial: [
    "Can you afford this purchase without touching your emergency fund?",
    "Will this thing/car/gadget still excite you in 6 months?",
    "Are you buying this to impress people you don't even like?",
    "What's the real monthly cost (EMI, maintenance, insurance, etc)?"
  ],
  life: [
    "If failure was impossible, would you still want this?",
    "Are you running TOWARD something great or AWAY from something shitty?",
    "Will you regret NOT doing this on your 80th birthday?",
    "Who in your life will be negatively affected — and have you talked to them?"
  ],
  daily: [
    "How tired are you right now on a scale 1–10?",
    "Will future-you thank you for this decision tonight?",
    "Is this aligned with the person you're trying to become?",
    "What's the worst that can happen if you just say no?"
  ]
};

let answers = [];
let category = "";
let userQuestion = "";

document.getElementById("startBtn").addEventListener("click", () => {
  category = document.getElementById("category").value;
  userQuestion = document.getElementById("question").value.trim();

  if (!category || !userQuestion) {
    alert("Pick a category and write your question first!");
    return;
  }

  document.getElementById("startScreen").style.display = "none";
  document.getElementById("quiz").style.display = "block";
  answers = [];
  showQuestion(0);
});

function showQuestion(index) {
  if (index >= 4) {
    showResult();
    return;
  }

  document.getElementById("quiz").innerHTML = `
    <h3>Question ${index + 1}/4</h3>
    <p style="font-size:1.4em; margin:30px 0;">${questions[category][index]}</p>
    <input type="text" id="ans" placeholder="Be honest... (type anything)" autocomplete="off" />
    <br/>
    <button onclick="next(${index})">Next →</button>
  `;
  document.getElementById("ans").focus();
}

function next(index) {
  const ans = document.getElementById("ans").value.trim();
  if (!ans) return alert("Answer the question — no skipping!");
  answers.push(ans);
  showQuestion(index + 1);
}

function showResult() {
  document.getElementById("quiz").style.display = "none";
  document.getElementById("resultScreen").style.display = "block";

  const advice = generateRealAdvice();
  document.getElementById("finalAdvice").innerHTML = advice.text;
  document.getElementById("prosCons").innerHTML = advice.prosCons;
}

function generateRealAdvice() {
  const a1 = answers[0].toLowerCase();
  const a2 = parseInt(answers[1]) || 5;
  const a3 = answers[2].toLowerCase();
  const a4 = answers[3].toLowerCase();

  // Relationship logic
  if (category === "relationship") {
    if (a2 <= 6 || a3.includes("anxiety") || a4.includes("leave") || a4.includes("run")) {
      return {
        text: "Leave. Right now. You already know the answer — you're just hoping I'll say something different. I'm not going to. You deserve someone who makes you feel safe, not anxious. The pain of leaving is temporary. The pain of staying is forever.",
        prosCons: `<div class="pros-cons"><div class="column pro"><h3>✓ Pros of leaving</h3><ul><li>Peace returns to your nervous system</li><li>Self-respect skyrockets</li><li>Space for someone who actually deserves you</li></ul></div><div class="column con"><h3>✗ Pros of staying</h3><ul><li>Comfortable misery</li><li>That's it</li></ul></div></div>`
      };
    } else {
      return {
        text: "Stay and fight for it — but only if they are fighting too. Love is not supposed to be this hard all the time. If you're the only one trying, you're not in a relationship; you're in a hostage situation with extra steps.",
        prosCons: `<div class="pros-cons"><div class="column pro"><h3>✓ Pros of staying</h3><ul><li>Real love is worth effort</li><li>You'll never wonder what if</li></ul></div><div class="column con"><h3>✗ Risks</h3><ul><li>One-sided effort breeds resentment</li><li>You're teaching them they can treat you average</li></ul></div></div>`
      };
    }
  }

  // Career logic
  if (category === "career") {
    if (a2 <= 5 || a1.includes("all") || a1.includes("every") || a3.includes("paycheck")) {
      return {
        text: "Start looking today. Quietly. A job you have to escape in your mind every day after day is stealing your life in installments. You are not a tree — if you don't like where you are, move.",
        prosCons: `<div class="pros-cons"><div class="column pro"><h3>✓ New job</h3><ul><li>Higher salary in 90% of cases</li><li>Mental health returns</li><li>Growth restarts</li></ul></div><div class="column con"><h3>✗ Staying</h3><ul><li>Golden handcuffs are still handcuffs</li></ul></div></div>`
      };
    }
  }

  // Financial logic
  if (category === "financial") {
    if (answers[0].includes("no") || a2 <= 6 || answers[2].includes("yes")) {
      return {
        text: "Don't buy it. You're trying to solve an emotional problem with a financial transaction. It won't work. The high lasts 2 weeks max. Your future self is begging you to wait.",
        prosCons: `<div class="pros-cons"><div class="column pro"><h3>✓ Not buying</h3><ul><li>Emergency fund stays intact</li><li>No new debt</li><li>Future you can breathe</li></ul></div><div class="column con"><h3>✗ Buying</h3><ul><li>Temporary dopamine</li><li>Long-term financial stress</li></ul></div></div>`
      };
    }
  }

  // Big default smart response
  const score = a2;
  if (score >= 8 && a3.includes("peace") || a3.includes("excited")) {
    return {
      text: "YES. Do the thing. Your gut, your heart, and the universe are all screaming the same answer. Stop waiting for permission.",
      prosCons: `<div class="pros-cons"><div class="column pro"><h3>✓ Just do it</h3><ul><li>Regret of inaction weighs tons</li><li>Regret of action weighs grams</li><li>You're clearly ready</li></ul></div></div>`
    };
  } else {
    return {
      text: "No. Or at least not yet. Your answers show hesitation, fear, or low energy — all valid red flags. Protect your peace first. The right decision feels like relief, not anxiety.",
      prosCons: `<div class="pros-cons"><div class="column con"><h3>✗ Not yet</h3><ul><li>You're not excited, you're escaping</li><li>Low-energy decisions create low-energy results</li></ul></div></div>`
    };
  }
}

document.getElementById("newBtn").addEventListener("click", () => {
  location.reload();
});