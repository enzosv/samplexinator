import {
  Attempt,
  CategoryData,
  fetchQuestions,
  findQuestion,
  Score,
  storageKey,
  AttemptResult,
} from "./shared.js";

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

  for (let i = 0; i < history.length; i++) {
    const attempt = history[i];
    if (!attempt.answers) {
      console.warn("invalid attempt. no answers", JSON.stringify(attempt));
      return;
    }

    const questions = [];
    for (const answer of attempt.answers) {
      const question = findQuestion(all_questions, answer.question_id);
      if (!question) {
        console.error("Question not found:", answer.question_id);
        return;
      }
      question.user_answer = answer.user_answer;
      questions.push(question);
    }
    const result = AttemptResult.fromAnsweredQuestions(questions);

    const row = generateRow(i, attempt.timestamp, result);
    historyTable.appendChild(row);
  }

  // populateAverage(history.length, totalScores);
  // renderChart(anatomyScores, physicsScores, procedureScores);
}

function generateRow(index: number, timestamp: string, result: AttemptResult) {
  const row = document.createElement("tr");
  const date = new Date(timestamp).toLocaleString();
  const scorePercentage = result.getTotalScorePercentage();

  row.innerHTML = `
            <td>${index + 1}</td>
            <td>${date}</td>
            <td class="${scoreClass(
              scorePercentage
            )}">${result.getTotalScore()} / ${result.countQuestions()} <small>(${scorePercentage.toFixed(
    2
  )}%)</small></td>`;

  const columns = ["anatomy", "physics", "procedures"];
  for (const column of columns) {
    const score = result.topics[column];
    if (!score) {
      row.innerHTML += "<td>0/0</td>";
      continue;
    }
    row.innerHTML += `<td class="${scoreClass(score.getPercentage())}">${
      score.correct
    }/${score.total}</td>`;
  }
  row.innerHTML += `<td><a href="attempt.html?index=${index}" class="btn btn-primary btn-sm">View</a></td>`;
  return row;
}

function populateAverage(count, scores) {
  const container = document.getElementById("average-scores");
  if (!container) {
    console.error("missing average row");
    return;
  }
  const averageScore =
    ((scores.anatomy.correct +
      scores.physics.correct +
      scores.procedures.correct) *
      100) /
    (scores.anatomy.total + scores.physics.total + scores.procedures.total);

  const anatomyScore = (scores.anatomy.correct * 100) / scores.anatomy.total;
  const physicsScore = (scores.physics.correct * 100) / scores.physics.total;
  const proceduresScore =
    (scores.procedures.correct * 100) / scores.procedures.total;

  container.innerHTML = `
<th>${count} Attempt(s)</th>
<th></th>
<th class="${scoreClass(averageScore)}">${averageScore.toFixed(2)}%</th>
<th class="${scoreClass(anatomyScore)}">${anatomyScore.toFixed(2)}%</th>
<th class="${scoreClass(physicsScore)}">${physicsScore.toFixed(2)}%</th>
<th class="${scoreClass(proceduresScore)}">${proceduresScore.toFixed(2)}%</th>
<th></th>
`;
}

function scoreClass(percentage) {
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
        x: { stacked: true },
        y: {
          stacked: true,
          title: { display: true, text: "Score" },
          max: 100,
          ticks: {
            callback: function (value) {
              return value + "%"; // Add '%' sign to y-axis labels
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
