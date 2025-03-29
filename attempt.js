function renderAttempt() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptIndex = urlParams.get("index");
  const storageKey = "quizHistory";
  const history = JSON.parse(localStorage.getItem(storageKey)) || [];

  if (attemptIndex === null || attemptIndex >= history.length) {
    document.getElementById("attempt-container").innerHTML =
      "<p class='text-danger'>Invalid attempt.</p>";
    return;
  }

  const attempt = history[attemptIndex];
  const attemptInfo = document.getElementById("attempt-info");
  attemptInfo.innerHTML = `Attempt ${parseInt(attemptIndex) + 1} - 
    (${new Date(attempt.timestamp).toLocaleString()})`;

  const scoreBreakdown = {
    total: { correct: 0, total: 0 },
    anatomy: { correct: 0, total: 0 },
    physics: { correct: 0, total: 0 },
    procedure: { correct: 0, total: 0 },
  };

  const container = document.getElementById("attempt-container");
  attempt.questions.forEach((q) => {
    const div = document.createElement("div");
    div.className = "question border p-3 mb-3 rounded";
    div.innerHTML = `<p><strong>${q.question_text}</strong></p>`;

    for (const [key, value] of Object.entries(q.options)) {
      const isUserAnswer = attempt.answers[q.question_number] === key;
      const isCorrect = q.correct_answer === key;
      div.innerHTML += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="question-${
                              q.question_number
                            }" value="${key}" disabled ${
        isUserAnswer ? "checked" : ""
      }>
                            <label class="form-check-label ${
                              isCorrect
                                ? "correct"
                                : isUserAnswer
                                ? "incorrect"
                                : ""
                            }">
                                ${key}: ${value}
                            </label>
                        </div>
                    `;
    }

    div.innerHTML += `<p class="fw-bold ${
      attempt.answers[q.question_number] === q.correct_answer
        ? "text-success"
        : "text-danger"
    }">Your Answer: ${
      attempt.answers[q.question_number] || "No answer"
    } | Correct Answer: ${q.correct_answer}</p>`;
    container.appendChild(div);

    // Update score breakdown
    const category = q.source || "unknown";
    if (scoreBreakdown[category]) {
      scoreBreakdown[category].total++;
      if (attempt.answers[q.question_number] === q.correct_answer) {
        scoreBreakdown[category].correct++;
      }
    }
    scoreBreakdown.total.total++;
    if (attempt.answers[q.question_number] === q.correct_answer) {
      scoreBreakdown.total.correct++;
    }
  });

  // Render score breakdown
  const breakdownContainer = document.getElementById("score-breakdown");
  breakdownContainer.innerHTML = `<h4>Score Breakdown</h4>`;
  for (const [category, data] of Object.entries(scoreBreakdown)) {
    const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    const colorClass = percentage >= 75 ? "text-success" : "text-danger";
    breakdownContainer.innerHTML += `<p>${
      category.charAt(0).toUpperCase() + category.slice(1)
    }: 
      ${data.correct} / ${data.total} 
      <span class="${colorClass}">(${percentage.toFixed(2)}%)</span></p>`;
  }
}
renderAttempt();
