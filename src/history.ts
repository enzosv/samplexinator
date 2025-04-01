import {
  Attempt,
  CategoryData,
  fetchQuestions,
  findQuestion,
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

  let anatomyScores: number[] = [];
  let physicsScores: number[] = [];
  let procedureScores: number[] = [];

  let totalScores: CategoryData = { anatomy: 0, physics: 0, procedures: 0 };
  let totalCounts: CategoryData = { anatomy: 0, physics: 0, procedures: 0 };

  for (let i = 0; i < history.length; i++) {
    const attempt = history[i];
    if (!attempt.answers) {
      console.warn("invalid attempt. no answers", JSON.stringify(attempt));
      return;
    }
    const numQuestions = Object.keys(attempt.answers).length;
    let score = 0;
    let categoryCounts = { anatomy: 0, physics: 0, procedures: 0 };
    let categoryScores = { anatomy: 0, physics: 0, procedures: 0 };
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
        categoryScores[category]++;
        totalScores[category]++;
      }
      categoryCounts[category]++;
      totalCounts[category]++;
    }

    // TODO: base on percentage
    // so graph is consistent even if number of questions change
    anatomyScores.push(categoryScores.anatomy * 100 / (categoryCounts.anatomy * 3));
    physicsScores.push(categoryScores.physics * 100 / (categoryCounts.physics * 3));
    procedureScores.push(categoryScores.procedures * 100 / (categoryCounts.procedures * 3));
    const row = generateRow(
      i,
      attempt.timestamp,
      score,
      numQuestions,
      categoryCounts,
      categoryScores
    );
    historyTable.appendChild(row);
  }

  populateAverage(history.length, totalScores, totalCounts);
  renderChart(anatomyScores, physicsScores, procedureScores);
}

function generateRow(
  index: number,
  timestamp: string,
  score: number,
  numQuestions: number,
  categoryCounts: CategoryData, // Assuming CategoryData interface is available
  categoryScores: CategoryData
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

  for (const category in categoryCounts) {
    const correct = categoryScores[category] ?? 0;
    const total = categoryCounts[category] ?? 0;
    const categoryPercentage = total > 0 ? (correct / total) * 100 : 100;
    row.innerHTML += `<td class="${scoreClass(
      categoryPercentage
    )}">${correct}/${total}</td>`;
  }
  row.innerHTML += `<td><a href="attempt.html?index=${index}" class="btn btn-primary btn-sm">View</a></td>`;
  return row;
}

function populateAverage(count, totalScores, totalCounts) {
  const container = document.getElementById("average-scores");
  if (!container) {
    console.error("missing average row");
    return;
  }
  const averageScore =
    ((totalScores.anatomy + totalScores.physics + totalScores.procedures) *
      100) /
    (totalCounts.anatomy + totalCounts.physics + totalCounts.procedures);

  const anatomyScore = (totalScores.anatomy * 100) / totalCounts.anatomy;
  const physicsScore = (totalScores.physics * 100) / totalCounts.physics;
  const proceduresScore =
    (totalScores.procedures * 100) / totalCounts.procedures;

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
  anatomyScores: number[],
  physicsScores: number[],
  procedureScores: number[],
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
          data: anatomyScores,
          backgroundColor: "#3498db",
        },
        {
          label: "Physics",
          data: physicsScores,
          backgroundColor: "#2ecc71",
        },
        {
          label: "Procedures",
          data: procedureScores,
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
          max: 100
        },
      },
      plugins: {
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
    },
  });
}
