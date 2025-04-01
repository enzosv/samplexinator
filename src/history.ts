import {
  Attempt,
  CategoryData,
  fetchQuestions,
  findQuestion,
  Score,
  storageKey,
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

  let anatomyScores: Score[] = [];
  let physicsScores: Score[] = [];
  let procedureScores: Score[] = [];

  let totalScores: CategoryData = {
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
    const numQuestions = Object.keys(attempt.answers).length;
    let score = 0;
    let scores = {
      anatomy: { correct: 0, total: 0 },
      physics: { correct: 0, total: 0 },
      procedures: { correct: 0, total: 0 }
    };
    for (const answer of attempt.answers) {
      const question = findQuestion(all_questions, answer.question_id);
      if (!question) {
        console.error("Question not found:", answer.question_id);
        return;
      }
      const category = question.category;
      if (!category) {
        console.error("invalid question. missing category");
        continue;
      }
      const correct = answer.user_answer == question.correct_answer;
      if (correct) {
        score++;
        scores[category].correct++;
        totalScores[category].correct++;
      }
      scores[category].total++;
      totalScores[category].total++;
    }

    anatomyScores.push(scores.anatomy);
    physicsScores.push(scores.physics);
    procedureScores.push(scores.procedures);

    const row = generateRow(
      i,
      attempt.timestamp,
      score,
      numQuestions,
      scores,
    );
    historyTable.appendChild(row);
  }

  populateAverage(history.length, totalScores);
  renderChart(anatomyScores, physicsScores, procedureScores);
}

function generateRow(
  index: number,
  timestamp: string,
  score: number,
  numQuestions: number,
  scores: CategoryData, // Assuming CategoryData interface is available
) {
  const row = document.createElement("tr");
  const date = new Date(timestamp).toLocaleString();
  const scorePercentage = (score / numQuestions) * 100;

  row.innerHTML = `
            <td>${index + 1}</td>
            <td>${date}</td>
            <td class="${scoreClass(
    scorePercentage
  )}">${score} / ${numQuestions} <small>(${scorePercentage.toFixed(
    2
  )}%)</small></td>`;

  for (const category in scores) {
    const correct = scores[category].correct ?? 0;
    const total = scores[category].total ?? 0;
    const categoryPercentage = total > 0 ? (correct / total) * 100 : 100;
    row.innerHTML += `<td class="${scoreClass(
      categoryPercentage
    )}">${correct}/${total}</td>`;
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
    ((scores.anatomy.correct + scores.physics.correct + scores.procedures.correct) *
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
  procedureScores: Score[],
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
          data: anatomyScores.map((score) => score.correct * 100 / (score.total * 3)), //*3 because 3 categories
          backgroundColor: "#3498db",
        },
        {
          label: "Physics",
          data: physicsScores.map((score) => score.correct * 100 / (score.total * 3)),
          backgroundColor: "#2ecc71",
        },
        {
          label: "Procedures",
          data: procedureScores.map((score) => score.correct * 100 / (score.total * 3)),
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
              return value + '%'; // Add '%' sign to y-axis labels
            }
          }
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
                case 'anatomy':
                  rawScore = anatomyScores[dataIndex].correct
                  rawCount = anatomyScores[dataIndex].total
                  break;
                case 'physics':
                  rawScore = physicsScores[dataIndex].correct
                  rawCount = physicsScores[dataIndex].total
                  break;
                case 'procedures': // Match the dataset label
                  rawScore = procedureScores[dataIndex].correct
                  rawCount = procedureScores[dataIndex].total
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
