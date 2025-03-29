const letters = ["A", "B", "C", "D"];

async function renderAttempt() {
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

  let score = 0;
  const container = document.getElementById("attempt-container");
  container.innerHTML = "";

  // Fetch questions data
  const response = await fetch(`./questions.json`);
  const data = await response.json();
  let allQuestions = [];
  data.forEach((category) => {
    allQuestions = [...allQuestions, ...category];
  });

  attempt.answers &&
    Object.entries(attempt.answers).forEach(([questionId, userAnswer]) => {
      const q = allQuestions.find((q) => q.id == questionId);
      if (!q) {
        console.error("Question not found:", questionId);
        return;
      }

      const div = document.createElement("div");
      div.className = "question border p-3 mb-3 rounded";
      div.innerHTML = `<p><strong>${q.question}</strong></p>`;

      for (const [key, value] of Object.entries(q.options)) {
        const isUserAnswer = userAnswer === key;
        const isCorrect = q.correct_answer === key;
        div.innerHTML += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="question-${
                              q.id
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
                                ${letters[key]}: ${value}
                            </label>
                        </div>
                    `;
      }

      const correct = userAnswer == q.correct_answer;
      if (correct) {
        score++;
      }

      div.innerHTML += `<p class="fw-bold ${
        correct ? "text-success" : "text-danger"
      }">Your Answer: ${letters[userAnswer] || "No answer"} | Correct Answer: ${
        letters[q.correct_answer]
      }</p>`;
      container.appendChild(div);
    });

  const scorePercentage = (score / allQuestions.length) * 100;
  const scoreContainer = document.getElementById("score-breakdown");
  scoreContainer.innerHTML = `<h4>Score: ${score} / ${
    allQuestions.length
  } (${scorePercentage.toFixed(2)}%)</h4>`;
}
renderAttempt();
