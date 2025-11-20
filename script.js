document.getElementById("start").addEventListener("click", () => {
    const question = document.getElementById("question").value.trim();
    if (!question) {
        alert("Type something first, silly! 😜");
        return;
    }

    // Show questions
    document.getElementById("questions").style.display = "block";
    document.getElementById("q1").textContent = "How important is this decision to you? (1-10)";
    document.getElementById("a1").focus();
});

document.getElementById("next1").addEventListener("click", () => {
    const importance = document.getElementById("a1").value;
    if (!importance) return alert("Answer the question first!");

    document.getElementById("q2").style.display = "block";
    document.getElementById("a2").style.display = "block";
    document.getElementById("next2").style.display = "block";
    
    document.getElementById("q2").textContent = "What’s your gut feeling right now? (yes/maybe/no)";
});

document.getElementById("next2").addEventListener("click", () => {
    const gut = document.getElementById("a2").value.toLowerCase();

    let advice = "";
    if (gut.includes("yes") || gut.includes("hell yeah")) {
        advice = "✨ The disco ball says: DO IT! Life’s too short ✨";
    } else if (gut.includes("maybe")) {
        advice = "🪩 Flip a coin… or just sleep on it. You’ll know tomorrow 🪩";
    } else {
        advice = "🚨 Nah, trust your gut. Protect your peace 🚨";
    }

    document.getElementById("result").style.display = "block";
    document.getElementById("result").innerHTML = `<strong>${advice}</strong><br><br>🎉 Confetti would explode here if I could add it in 2 seconds 🎉`;
});