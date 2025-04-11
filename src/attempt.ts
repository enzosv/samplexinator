import {
  Answer,
  Attempt,
  fetchQuestions,
  findQuestion,
  Question,
  storageKey,
  AttemptResult,
  generateQuestionElement,
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
  } <small>(${scorePercentage.toFixed(2)}%)</small></h4>`;
  for (const [topicName, score] of Object.entries(result.topics)) {
    const percentage = score.getPercentage();
    scoreBreakdownText += `<p class="${
      percentage < 75 ? "incorrect" : "correct"
    }">${topicName.charAt(0).toUpperCase() + topicName.slice(1)}: ${
      score.correct
    } / ${score.total} <small>(${percentage.toFixed(2)}%)</small></p>`;
  }
  scoreContainer!.innerHTML = scoreBreakdownText;
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
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const div = generateQuestionElement(question, i);
    container.appendChild(div);
  }
}

function stickerName(scorePercentage: number) {
  if (scorePercentage == 100) {
    return "james.png";
  }
  if (scorePercentage >= 75) {
    return "kylo.png";
  }
  if (scorePercentage >= 50) {
    return "kikay.png";
  }
  return "bucky.png";
}

function addSticker(scorePercentage: number) {
  const stickerElement = document.getElementById("sticker");
  if (!stickerElement) {
    return;
  }
  stickerElement.innerHTML = `<img src='./assets/${stickerName(
    scorePercentage
  )}' height=128>`;
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

  const questions = await findQuestions(attempt.answers);
  renderQuestions(container, questions);
  renderScore(questions);
  renderStreak(history);
}

function renderStreak(history: Attempt[]) {
  const heatmapData = formatDataForHeatmap(history);
  const streak = calculateStreak(heatmapData.data);
  if (streak > 0) {
    const streakElement = document.getElementById("streak");
    if (streakElement) {
      streakElement.innerText = `🔥 You're on a ${streak} day streak! 🔥`;
    }
  }

  const cal = new CalHeatmap();
  cal.paint({
    animationDuration: 0,
    itemSelector: "#cal-heatmap",
    domain: { type: "month" },
    subDomain: { type: "day", radius: 2 },
    data: { source: heatmapData.data, x: "date", y: "value" },
    date: { start: heatmapData.earliest },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  renderAttempt();
});

function calculateStreak(entries) {
  // entries: [{ date: 'YYYY-MM-DD', value: number }, ...]
  const datesWithData = new Set(entries.map((entry) => entry.date));

  let streak = 0;
  const today = new Date();

  while (true) {
    const yyyyMmDd = today.toISOString().split("T")[0];
    if (datesWithData.has(yyyyMmDd)) {
      streak++;
      today.setDate(today.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function formatDataForHeatmap(history: Attempt[]) {
  const dateMap = {};
  let earliest = "9999-12-31";

  for (const entry of history) {
    const date = entry.timestamp.split("T")[0]; // 'YYYY-MM-DD'
    dateMap[date] = (dateMap[date] || 0) + 1; // TODO: make the value the percent correct
    if (date < earliest) {
      earliest = date;
    }
  }

  const formatted = Object.entries(dateMap).map(([date, value]) => ({
    date,
    value,
  }));
  return {
    data: formatted,
    earliest: new Date(earliest),
  };
}
