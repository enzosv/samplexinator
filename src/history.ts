import {
  Attempt,
  CategoryData,
  Score,
  storageKey,
  AttemptResult,
} from "./shared.js";

import { Question, fetchQuestions, findQuestion } from "./question.js";

document.addEventListener("DOMContentLoaded", function () {
  renderHistory();
});

async function renderHistory() {
  const historyTable = document.getElementById("history-table")!;
  if (!historyTable) {
    console.error("historyTable not found");
    return;
  }
  const history = JSON.parse(
    localStorage.getItem(storageKey) || "[]"
  ) as Attempt[];

  if (history.length === 0) {
    historyTable.innerHTML =
      "<tr><td colspan='7' class='text-center'>No history available</td></tr>";
    return;
  }

  const all_questions = await fetchQuestions();

  const anatomyScores: Score[] = [];
  const physicsScores: Score[] = [];
  const procedureScores: Score[] = [];

  const totalScores: CategoryData = {
    anatomy: { correct: 0, total: 0 },
    physics: { correct: 0, total: 0 },
    procedures: { correct: 0, total: 0 },
  };

  for (let i = 0; i < history.length; i++) {
    const attempt = history[i];
    if (!attempt.answers) {
      console.warn("invalid attempt. no answers", JSON.stringify(attempt));
      return;
    }

    const questions: Question[] = [];
    for (const answer of attempt.answers) {
      const question = findQuestion(all_questions, answer.question_id);
      if (!question) {
        console.error("Question not found:", answer.question_id);
        return;
      }
      question.user_answer = answer.user_answer;
      questions.push(question);
      const category = question.category;
      if (!category) {
        console.error("invalid question. missing category");
        continue;
      }
      const correct = answer.user_answer == question.correct_answer;
      if (correct) {
        totalScores[category].correct++;
      }
      totalScores[category].total++;
    }
    const scores = AttemptResult.fromAnsweredQuestions(questions);
    if (scores.topics.anatomy) {
      anatomyScores.push(scores.topics.anatomy);
    }
    if (scores.topics.physics) {
      physicsScores.push(scores.topics.physics);
    }
    if (scores.topics.procedures) {
      procedureScores.push(scores.topics.procedures);
    }
    const row = generateRow(i, attempt.timestamp, scores);
    historyTable.appendChild(row);
  }

  populateAverage(history.length, totalScores);
  renderChart(anatomyScores, physicsScores, procedureScores);
}

function generateRow(index: number, timestamp: string, scores: AttemptResult) {
  const row = document.createElement("tr");
  const date = new Date(timestamp).toLocaleString();

  const scorePercentage = scores.getTotalScorePercentage();

  row.innerHTML = `
            <td>${index + 1}</td>
            <td>${date}</td>
            <td class="${scoreClass(
              scorePercentage
            )}">${scores.getTotalScore()} / ${scores.countQuestions()} <small>(${Number(
    scorePercentage.toFixed(2)
  ).toString()}%)</small></td>`;

  const order = ["anatomy", "physics", "procedures"];

  for (const topic of order) {
    const score = scores.topics[topic];
    if (!score) {
      console.warn(`${topic} could not be found`);
      continue;
    }
    const correct = score.correct;
    const total = score.total;
    const categoryPercentage = total > 0 ? (correct / total) * 100 : 100;
    row.innerHTML += `<td class="${scoreClass(
      categoryPercentage
    )}">${correct}/${total}</td>`;
  }
  row.innerHTML += `<td><a href="attempt.html?index=${index}" class="btn btn-primary btn-sm">View</a></td>`;
  return row;
}

function populateAverage(count: number, scores: CategoryData) {
  const container = document.getElementById("average-scores");
  if (!container) {
    console.error("missing average row");
    return;
  }
  const correct =
    scores.anatomy.correct + scores.physics.correct + scores.procedures.correct;
  const total =
    scores.anatomy.total + scores.physics.total + scores.procedures.total;
  const averageScore = (correct * 100) / total;

  const anatomyScore = (scores.anatomy.correct * 100) / scores.anatomy.total;
  const physicsScore = (scores.physics.correct * 100) / scores.physics.total;
  const proceduresScore =
    (scores.procedures.correct * 100) / scores.procedures.total;

  container.innerHTML = `
<th>${count} Attempt${count != 0 ? "s" : ""}</th>
<th></th>
<th class="${scoreClass(averageScore)}">${correct}/${total} <small>${Number(
    averageScore.toFixed(2)
  ).toString()}%</small></th>
<th class="${scoreClass(anatomyScore)}">${Number(
    anatomyScore.toFixed(2)
  ).toString()}%</th>
<th class="${scoreClass(physicsScore)}">${Number(
    physicsScore.toFixed(2)
  ).toString()}%</th>
<th class="${scoreClass(proceduresScore)}">${Number(
    proceduresScore.toFixed(2)
  ).toString()}%</th>
`;
  const resetButton = document.createElement("button");
  resetButton.classList.add("btn", "btn-danger", "btn-sm");
  resetButton.innerText = "Reset";
  resetButton.onclick = () => {
    if (
      confirm(
        "This will clear all attempts. This can't be undone. Are you sure?"
      )
    ) {
      localStorage.clear();
      globalThis.location.href = "history.html";
    }
  };
  const resetColumn = document.createElement("th");
  resetColumn.appendChild(resetButton);
  container.appendChild(resetColumn);
}

function scoreClass(percentage: number) {
  return percentage < 75 ? "text-danger" : "";
}

function renderChart(
  anatomyScores: Score[],
  physicsScores: Score[],
  procedureScores: Score[]
) {
  const container = document.getElementById(
    "history-chart"
  ) as HTMLCanvasElement;
  if (!container) {
    console.error("Missing chart canvas element with id 'history-chart'");
    return;
  }
  const ctx = container.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2D context for chart canvas.");
    return;
  }

  const labels = anatomyScores.map((_, i) => `Attempt ${i + 1}`);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Anatomy",
          data: anatomyScores.map(
            (score) => (score.correct * 100) / (score.total * 3)
          ), //*3 because 3 categories
          backgroundColor: "#3498db",
        },
        {
          label: "Physics",
          data: physicsScores.map(
            (score) => (score.correct * 100) / (score.total * 3)
          ),
          backgroundColor: "#2ecc71",
        },
        {
          label: "Procedures",
          data: procedureScores.map(
            (score) => (score.correct * 100) / (score.total * 3)
          ),
          backgroundColor: "#f1c40f",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
          ticks: {
            callback: function (value: number) {
              return value + 1;
            },
          },
        },
        y: {
          stacked: true,
          title: { display: true, text: "Score" },
          max: 100,
          ticks: {
            callback: function (value: number) {
              return value + "%";
            },
          },
        },
      },
      plugins: {
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: function (context) {
              const dataIndex = context.dataIndex; // This is the attempt index

              let label = context.dataset.label || ""; // e.g., "Anatomy"
              let rawScore = 0;
              let rawCount = 0;

              // Determine which category this dataset corresponds to
              switch (label.toLowerCase()) {
                case "anatomy":
                  rawScore = anatomyScores[dataIndex].correct;
                  rawCount = anatomyScores[dataIndex].total;
                  break;
                case "physics":
                  rawScore = physicsScores[dataIndex].correct;
                  rawCount = physicsScores[dataIndex].total;
                  break;
                case "procedures": // Match the dataset label
                  rawScore = procedureScores[dataIndex].correct;
                  rawCount = procedureScores[dataIndex].total;
                  break;
              }
              if (label) {
                label += ": ";
              }
              // Format the tooltip string with raw score and count
              label += `${rawScore} / ${rawCount}`;
              return label;
            },
          },
        },
      },
    },
  });
}
