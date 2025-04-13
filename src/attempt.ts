import {
  Answer,
  Attempt,
  fetchQuestions,
  findQuestion,
  Question,
  storageKey,
  generateQuestionElement,
  AttemptResult,
  Score,
} from "./shared.js";

const PBR_DATE = new Date("2025-06-22");

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

function findQuestions(all_questions: Question[], answers: Answer[]) {
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
    const prompt = document.createElement("input") as HTMLInputElement;
    prompt.placeholder = "Explain";
    prompt.classList.add("m-4", "mb-2", "col-11");
    prompt.value = getExplanation(question.id);
    prompt.addEventListener("input", (_) =>
      saveExplanation(question.id, prompt.value)
    );

    div.appendChild(prompt);
    container.appendChild(div);
  }
}

function getExplanation(question_id: number): string {
  const data = localStorage.getItem("explanationsKey");
  const explanations = data ? JSON.parse(data) : [];
  for (let i = 0; i < explanations.length; i++) {
    const existing = explanations[i];
    if (existing.question_id == question_id) {
      return existing.explanation;
    }
  }
  return "";
}

function saveExplanation(question_id: number, explanation: string) {
  // TODO: save to server

  const data = localStorage.getItem("explanationsKey");
  const explanations = data ? JSON.parse(data) : [];
  let found = false;
  for (let i = 0; i < explanations.length; i++) {
    const existing = explanations[i];
    if (existing.question_id == question_id) {
      explanations[i].explanation = explanation;
      found = true;
      break;
    }
  }
  if (!found) {
    explanations.push({
      question_id: question_id,
      explanation: explanation,
    });
  }

  localStorage.setItem("explanationsKey", JSON.stringify(explanations));
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
  const all_questions = await fetchQuestions();

  const questions = findQuestions(all_questions, attempt.answers);
  renderQuestions(container, questions);
  renderScore(questions);
  renderStreak(history, all_questions);
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

function renderStreak(history: Attempt[], all_questions: Question[]) {
  const heatmapData = formatDataForHeatmap(history, all_questions);
  const streak = calculateStreak(heatmapData.data);
  if (streak > 0) {
    const streakElement = document.getElementById("streak");
    if (streakElement) {
      streakElement.innerHTML = `${streak} day streak 🔥`;
      streakElement.dataset.streak = String(streak);
    }
  }
  const countdownElement = document.getElementById("countdown");
  if (countdownElement) {
    const countdown = Math.round(
      Math.abs((PBR_DATE.getTime() - new Date().getTime()) / 86400000)
    );
    countdownElement.innerText = `${countdown} days to go`;
  }

  const cal = new CalHeatmap();
  cal.paint(
    {
      animationDuration: 0,
      itemSelector: "#cal-heatmap",
      domain: { type: "month" },
      subDomain: { type: "day", radius: 2 },
      range: 3,
      data: {
        source: heatmapData.data,
        x: "date",
        y: "value",
        max: PBR_DATE,
      },
      date: {
        start: heatmapData.earliest,
        highlight: [
          PBR_DATE,
          new Date(), // Highlight today
        ],
        timezone: "Asia/Manila",
      },
      scale: {
        color: {
          range: ["red", "green"],
          interpolate: "hsl",
          type: "linear",
          domain: [0, 100],
        },
      },
    },
    [
      [
        Tooltip,
        {
          text: function (date, value) {
            if (!date || !value) {
              return;
            }
            const dateString = new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            return `${dateString} ${Number(value.toFixed(2)).toString()}%`;
          },
        },
      ],
    ]
  );
}

document.addEventListener("DOMContentLoaded", function () {
  renderAttempt();
});

interface HeatmapEntry {
  date: string;
  value: number;
}

function calculateStreak(entries: HeatmapEntry[]) {
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

function formatDataForHeatmap(history: Attempt[], all_questions: Question[]) {
  const dateMap = {} as Record<string, Score>;
  let earliest = "9999-12-31";

  for (const entry of history) {
    const date = entry.timestamp.split("T")[0]; // 'YYYY-MM-DD'
    const questions = findQuestions(all_questions, entry.answers);
    let correct = 0;
    for (const question of questions) {
      if (question.user_answer === question.correct_answer) {
        correct++;
      }
    }
    if (!(date in dateMap)) {
      dateMap[date] = new Score();
    }
    dateMap[date].correct += correct;
    dateMap[date].total += questions.length;
    if (date < earliest) {
      earliest = date;
    }
  }

  const formatted = Object.entries(dateMap).map(([date, value]) => ({
    date: date,
    value: value.getPercentage(),
  }));
  return {
    data: formatted,
    earliest: new Date(earliest),
  };
}
