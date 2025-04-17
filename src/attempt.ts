import { Attempt, storageKey, AttemptResult } from "./shared.js";

import {
  Question,
  fetchQuestions,
  findQuestions,
  generateQuestionElement,
} from "./question.js";

function formatForChat(topics: Record<string, string>, title: string): string {
  const entries = Object.entries(topics).map(([key, value]) => {
    const label = `${key.charAt(0).toUpperCase() + key.slice(1)}:`;
    return [label, value] as [string, string];
  });

  const maxLength = Math.max(...entries.map(([label]) => label.length));

  const lines = entries.map(
    ([label, value]) => `${label.padEnd(maxLength + 2)}${value}`
  );

  return "```" + title + "\n" + lines.join("\n") + "\n```";
}

function renderScore(questions: Question[]) {
  const attempt = AttemptResult.fromAnsweredQuestions(questions);
  const scorePercentage = attempt.getTotalScorePercentage();
  // addSticker(scorePercentage);
  const scoreContainer = document.getElementById("score-breakdown");
  const score = `${attempt.getTotalScore()} / ${questions.length}`;
  const scoreBreakdownText = `<h5 class="${
    scorePercentage < 75 ? "incorrect" : "correct"
  }">${score} <small>(${Number(
    scorePercentage.toFixed(2)
  ).toString()}%)</small></h5>`;
  // for (const [topicName, score] of Object.entries(result.topics)) {
  //   const percentage = score.getPercentage();
  //   scoreBreakdownText += `<p class="${
  //     percentage < 75 ? "incorrect" : "correct"
  //   }">${topicName.charAt(0).toUpperCase() + topicName.slice(1)}: ${
  //     score.correct
  //   } / ${score.total} <small>(${percentage.toFixed(2)}%)</small></p>`;
  // }
  // scoreContainer!.innerHTML = scoreBreakdownText;
  const topics = emojify(questions);
  let result: string = scoreBreakdownText;

  for (const [key, value] of Object.entries(topics)) {
    const topic = key.charAt(0).toUpperCase() + key.slice(1);
    result += `
    <div class="d-flex">
      <span class="topic-label">${topic}:</span>
      <span class="emoji-row">${value}</span>
    </div>`;
  }
  scoreContainer!.innerHTML = result;
  const button = document.getElementById("share-btn") as HTMLButtonElement;
  if (!button) {
    console.error("Share button not found");
    return;
  }

  button.addEventListener("click", () => {
    // let shareTitle = "";
    // const streakElement = document.getElementById("streak");
    // if (streakElement) {
    // const storedStreak = streakElement.dataset.streak;
    // shareTitle = `${storedStreak} day streak 🔥`;
    // }
    const shareText = formatForChat(topics, score);
    navigator.clipboard.writeText(shareText).then(() => {
      button.textContent = "Copied";
      button.classList.add("btn-success");
      button.classList.remove("btn-primary");
      button.disabled = true;
      setTimeout(() => {
        button.textContent = "Copy";
        button.disabled = false;
        button.classList.remove("btn-success");
        button.classList.add("btn-primary");
      }, 1500);
    });
  });
}

function findAttempt(history: Attempt[]): Attempt | null {
  const urlParams = new URLSearchParams(globalThis.location.search);
  const attemptIndex = urlParams.get("index");

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

function renderQuestions(container: HTMLElement, questions: Question[]) {
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const div = generateQuestionElement(question, i);
    container.appendChild(div);
  }
}

async function renderAttempt() {
  const container = document.getElementById("attempt-container")!;
  if (!container) {
    console.error("container not found");
    return;
  }
  const history = JSON.parse(
    localStorage.getItem(storageKey) || "[]"
  ) as Attempt[];

  const attempt = findAttempt(history);
  if (!attempt) {
    container.innerHTML = "<p class='text-danger'>Invalid attempt.</p>";
    return;
  }
  const attemptInfo = document.getElementById("attempt-info");
  if (attemptInfo) {
    const attempt_number = Number(attempt.index ?? 0) + 1;
    attemptInfo!.innerHTML = `Attempt ${attempt_number}`;
  }
  const all_questions = await fetchQuestions();

  const questions = findQuestions(all_questions, attempt.answers);
  renderQuestions(container, questions);
  renderScore(questions);
}

function emojify(questions: Question): Record<string, string> {
  const topics = {} as Record<string, string>;
  for (const question of questions) {
    if (question.category === undefined) {
      console.warn(
        "invalid question. missing category",
        JSON.stringify(question)
      );
      continue;
    }
    if (!(question.category in topics)) {
      topics[question.category] = "";
    }
    if (question.user_answer === undefined) {
      topics[question.category] += "🥠";
      continue;
    }
    if (question.user_answer == question.correct_answer) {
      topics[question.category] += "🍪";
      continue;
    }
    topics[question.category] += "💩";
  }
  return topics;
}

document.addEventListener("DOMContentLoaded", function () {
  renderAttempt();
});
