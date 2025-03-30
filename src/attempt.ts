const letters = ["A", "B", "C", "D"];

interface Question {
  id: number;
  question: string;
  options: { [key: string]: string };
  correct_answer: string;
  category?: string;
}

function findQuestion(allQuestions: any, questionId: string): Question | null {
  for (const category of Object.keys(allQuestions)) {
    const found = (allQuestions[category] as Question[]).find(
      (q) => q.id == parseInt(questionId)
    );
    if (!found) {
      continue;
    }
    const q = found;
    q.category = category;
    return q;
  }
  return null;
}

async function renderAttempt() {
  const urlParams = new URLSearchParams(globalThis.location.search);
  const attemptIndex = urlParams.get("index");
  const storageKey = "quizHistory";
  const history = JSON.parse(localStorage.getItem(storageKey) || "[]") as any[];

  if (attemptIndex === null || parseInt(attemptIndex) >= history.length) {
    document.getElementById("attempt-container")!.innerHTML =
      "<p class='text-danger'>Invalid attempt.</p>";
    return;
  }

  const attempt = history[attemptIndex];
  if (!attempt.answers) {
    document.getElementById("attempt-container")!.innerHTML =
      "<p class='text-danger'>Invalid attempt.</p>";
    return;
  }

  const attemptInfo = document.getElementById("attempt-info");
  attemptInfo!.innerHTML = `Attempt ${parseInt(attemptIndex) + 1} - 
    (${new Date(attempt.timestamp).toLocaleString()})`;

  let score = 0;
  const response = await fetch(`./questions.json`);
  const allQuestions = await response.json();

  const container = document.getElementById("attempt-container")!;
  const questions: Question[] = [];
  const categoryCounts: { [key: string]: number } = {};
  const categoryScores: { [key: string]: number } = {};

  Object.entries(attempt.answers).forEach(([questionId, userAnswer]) => {
    const q = findQuestion(allQuestions, questionId);
    if (!q) {
      console.error("Question not found:", questionId);
      return;
    }
    const correct = userAnswer == q.correct_answer;
    if (!categoryCounts[q.category!]) {
      categoryCounts[q.category!] = 0;
      categoryScores[q.category!] = 0;
    }
    if (correct) {
      score++;
      categoryScores[q.category!]++;
    }
    categoryCounts[q.category!]++;
    questions.push(q);

    const div = document.createElement("div");
    div.className = "question border p-3 mb-3 rounded";
    div.innerHTML = `<p class="fw-bold ${correct ? "" : "incorrect"}">${
      q.question
    }</p>`;
    for (const [key, value] of Object.entries(q.options)) {
      const isUserAnswer = userAnswer === key;
      const isCorrect = String(q.correct_answer) === key;
      div.innerHTML += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="question-${
                              q.id
                            }" value="${key}" disabled ${
        isUserAnswer ? "checked" : ""
      }>
                            <label class="form-check-label ${
                              isCorrect ? "fw-bold" : ""
                            }">
                                ${letters[key]}: ${value}
                            </label>
                        </div>
                    `;
    }

    container.appendChild(div);
  });

  const numQuestions = questions.length;
  const scorePercentage = (score / numQuestions) * 100;
  const scoreContainer = document.getElementById("score-breakdown");
  let scoreBreakdownText = `<h4 class="${
    scorePercentage < 75 ? "incorrect" : "correct"
  }">Score: ${score} / ${numQuestions} (${scorePercentage.toFixed(2)}%)</h4>`;

  for (const category in categoryCounts) {
    const correct = categoryScores[category];
    const total = categoryCounts[category];
    const categoryPercentage = total > 0 ? (correct / total) * 100 : 0;
    scoreBreakdownText += `<p class="${
      categoryPercentage < 75 ? "incorrect" : "correct"
    }">${category}: ${correct} / ${total} (${categoryPercentage.toFixed(
      2
    )}%)</p>`;
  }
  scoreContainer!.innerHTML = scoreBreakdownText;
}
renderAttempt();
