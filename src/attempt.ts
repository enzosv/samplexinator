import {
  Question,
  Answer,
  Attempt,
  letters,
  storageKey,
  findQuestion,
  fetchQuestions,
} from "./shared.js"


function renderScore(questions: Question[]) {
  const categoryCounts: { [key: string]: number } = {};
  const categoryScores: { [key: string]: number } = {};

  let score = 0;

  for (const question of questions) {
    const category = question.category;
    if (!category) {
      console.error("invalid question. missing category");
      continue;
    }
    if (!categoryCounts[category]) {
      categoryCounts[category] = 0;
      categoryScores[category] = 0;
    }
    const correct = question.correct_answer == question.user_answer;
    if (correct) {
      categoryScores[category]++;
      score++;
    }
    categoryCounts[category]++;
  }

  const numQuestions = questions.length;
  const scorePercentage = (score / numQuestions) * 100;
  const scoreContainer = document.getElementById("score-breakdown");
  let scoreBreakdownText = `<h4 class="${scorePercentage < 75 ? "incorrect" : "correct"
    }">Score: ${score} / ${numQuestions} (${scorePercentage.toFixed(2)}%)</h4>`;

  for (const category in categoryCounts) {
    const correct = categoryScores[category];
    const total = categoryCounts[category];
    const categoryPercentage = total > 0 ? (correct / total) * 100 : 0;
    scoreBreakdownText += `<p class="${categoryPercentage < 75 ? "incorrect" : "correct"
      }">${category}: ${correct} / ${total} (${categoryPercentage.toFixed(
        2
      )}%)</p>`;
  }
  scoreContainer!.innerHTML = scoreBreakdownText;
}

function findAttempt(): Attempt | null {
  const urlParams = new URLSearchParams(globalThis.location.search);
  const attemptIndex = urlParams.get("index");
  const history = JSON.parse(localStorage.getItem(storageKey) || "[]") as Attempt[];

  if (attemptIndex === null || parseInt(attemptIndex) >= history.length) {
    console.error("404: not found");
    return null;
  }

  const attempt = history[attemptIndex];
  if (!attempt.answers) {
    console.error("invalid attempt", JSON.stringify(attempt));
    return null;
  }
  attempt.index = attemptIndex;
  return attempt;
}

async function findQuestions(answers: Answer[]) {
  const all_questions = await fetchQuestions();
  const questions: Question[] = [];

  for (const answer of answers) {
    const question = findQuestion(all_questions, answer.question_id);
    if (!question) {
      console.error(`question ${answer.question_id} could not be found`);
      continue;
    }
    question.user_answer = answer.user_answer;
    questions.push(question);
  }
  return questions;
}

function renderQuestions(container: HTMLElement, questions: Question[]) {
  for (const question of questions) {
    const correct = question.correct_answer == question.user_answer;
    // render
    const div = document.createElement("div");
    div.className = "question border p-3 mb-3 rounded";
    div.innerHTML = `<p class="fw-bold ${correct ? "" : "incorrect"}">${question.question
      }</p>`;
    for (let i = 0; i < question.options.length; i++) {

      const isUserAnswer = question.user_answer === i;
      const isCorrect = question.correct_answer === i;
      div.innerHTML += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="question-${question.id
        }" value="${i}" disabled ${isUserAnswer ? "checked" : ""
        }>
                            <label class="form-check-label ${isCorrect ? "fw-bold" : ""
        }">
                                ${letters[i]}: ${question.question}
                            </label>
                        </div>
                    `;
    }

    container.appendChild(div);
  }
}

async function renderAttempt() {
  const container = document.getElementById("attempt-container")!;
  if (!container) {
    console.error("container not found");
    return;
  }
  const attempt = findAttempt();
  if (!attempt) {
    container.innerHTML =
      "<p class='text-danger'>Invalid attempt.</p>";
    return;
  }
  const attemptInfo = document.getElementById("attempt-info");
  if (attemptInfo) {
    const attempt_number: number = attempt.index ?? 0;
    attemptInfo!.innerHTML = `Attempt ${attempt_number}`;
  }

  console.log(JSON.stringify(attempt));

  const questions = await findQuestions(attempt.answers);
  renderQuestions(container, questions);
  renderScore(questions);
}

document.addEventListener("DOMContentLoaded", async function () {
  renderAttempt();
});


