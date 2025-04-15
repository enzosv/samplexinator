import {
  Attempt,
  Question,
  findQuestions,
  Score,
  storageKey,
  fetchQuestions,
} from "./shared.js";

interface HeatmapEntry {
  date: string;
  value: number;
}

const PBR_DATE = new Date("2025-06-22");

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

function calculateStreak(entries: HeatmapEntry[]): number {
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

let placeholder: HTMLElement | null = null;

export async function loadHeatmap(placeholderId: string) {
  placeholder = document.getElementById(placeholderId);
  // if (!placeholder) {
  //   console.error(`Heatmap placeholder with id "${placeholderId}" not found.`);
  //   return;
  // }
  // const response = await fetch("heatmap.html");
  // if (!response.ok) {
  //   console.error(`HTTP error! status: ${response.status}`);
  //   return;
  // }
  // const html = await response.text();
  // placeholder.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", async function () {
  const history = JSON.parse(
    localStorage.getItem(storageKey) || "[]"
  ) as Attempt[];
  const all_questions = await fetchQuestions();
  renderStreak(history, all_questions);
  placeholder!.innerHTML = document.getElementById("container")!.innerHTML;
});
