import { renderSamplexQuestions, submitAnswers } from "./samplex.js";
import {
  Attempt,
  fetchQuestions,
  findQuestion,
  Question,
  storageKey,
} from "./shared.js";

async function findQuestionAttempts() {
  const all_questions = await fetchQuestions();
  const questions: Question[] = [];

  const history = JSON.parse(
    localStorage.getItem(storageKey) || "[]"
  ) as Attempt[];

  for (const attempt of history) {
    for (const answer of attempt.answers) {
      const existing = questions.find((q) => q.id == answer.question_id);
      if (existing) {
        existing.attempts++;
        if (existing.correct_answer != answer.user_answer) {
          existing.mistakes++;
        }
        continue;
      }
      // new question. find from json
      const question = findQuestion(all_questions, answer.question_id);
      if (!question) {
        continue;
      }
      if (question.correct_answer != answer.user_answer) {
        question.mistakes = 1;
      }
      question.attempts = 1;
      questions.push(question);
    }
  }
  return questions;
}

async function renderSamplex() {
  const questions = await findQuestionAttempts();
  let filtered_questions: Question[] = [];
  for (let i = 0; i < 10; i++) {
    filtered_questions = questions.filter((q) => q.mistakes + i >= q.attempts);
    if (filtered_questions.length > 1) {
      break;
    }
  }
  if (filtered_questions.length < 1) {
    alert(
      "Congratulations! No mistakes to review. Try answering some new questions"
    );
    globalThis.location.href = "index.html";
    return;
  }
  filtered_questions = filtered_questions.sort(() => 0.5 - Math.random());
  if (filtered_questions.length > 10) {
    filtered_questions = filtered_questions.slice(0, 10);
  }

  renderSamplexQuestions(filtered_questions);
}

document.addEventListener("DOMContentLoaded", function () {
  renderSamplex();

  document
    .getElementById("submit-button")
    ?.addEventListener("click", submitAnswers);
});
