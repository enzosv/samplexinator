import {
  Answer,
  Attempt,
  fetchQuestions,
  findQuestion,
  letters,
  Question,
  storageKey,
  AttemptResult,
} from "./shared.js";

function renderScore(questions: Question[]) {
  const result = AttemptResult.fromAnsweredQuestions(questions);
  const scorePercentage = result.getTotalScorePercentage();
  addSticker(scorePercentage);
  const scoreContainer = document.getElementById("score-breakdown");
  let scoreBreakdownText = `<h4 class="${
    scorePercentage < 75 ? "incorrect" : "correct"
  }">Score: ${result.getTotalScore()} / ${
    questions.length
  } (${scorePercentage.toFixed(2)}%)</h4>`;
  for (const [topicName, score] of Object.entries(result.topics)) {
    const percentage = score.getPercentage();
    scoreBreakdownText += `<p class="${
      percentage < 75 ? "incorrect" : "correct"
    }">${topicName}: ${score.correct} / ${score.total} (${percentage.toFixed(
      2
    )}%)</p>`;
  }
  scoreContainer!.innerHTML = scoreBreakdownText;
}

function findAttempt(): Attempt | null {
  const urlParams = new URLSearchParams(globalThis.location.search);
  const attemptIndex = urlParams.get("index");
  const history = JSON.parse(
    localStorage.getItem(storageKey) || "[]"
  ) as Attempt[];

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
    div.innerHTML = `<p class="fw-bold ${correct ? "" : "incorrect"}">${
      question.question
    }</p>`;
    for (let i = 0; i < question.options.length; i++) {
      const isUserAnswer = question.user_answer === i;
      const isCorrect = question.correct_answer === i;
      div.innerHTML += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="question-${
                              question.id
                            }" value="${i}" disabled ${
        isUserAnswer ? "checked" : ""
      }>
                            <label class="form-check-label ${
                              isCorrect ? "fw-bold" : ""
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
    container.innerHTML = "<p class='text-danger'>Invalid attempt.</p>";
    return;
  }
  const attemptInfo = document.getElementById("attempt-info");
  if (attemptInfo) {
    const attempt_number = Number(attempt.index ?? 0) + 1;
    attemptInfo!.innerHTML = `Attempt ${attempt_number}`;
  }

  const questions = await findQuestions(attempt.answers);
  renderQuestions(container, questions);
  renderScore(questions);
}

document.addEventListener("DOMContentLoaded", function () {
  renderAttempt();
});
