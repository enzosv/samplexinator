document.addEventListener("DOMContentLoaded", function () {
  renderHistory();
});

function findQuestion(allQuestions, questionId) {
  for (const category of Object.keys(allQuestions)) {
    const found = allQuestions[category].find(
      (q) => q.id == parseInt(questionId)
    );
    if (found) {
      return { ...found, category };
    }
  }
  return null;
}

async function renderHistory() {
  const historyTable = document.getElementById("history-table");
  let history = JSON.parse(localStorage.getItem("quizHistory")) || [];

  if (history.length === 0) {
    historyTable.innerHTML =
      "<tr><td colspan='6' class='text-center'>No history available</td></tr>";
    return;
  }

  const response = await fetch(`./questions.json`);
  const allQuestions = await response.json();

  let anatomyScores = [];
  let physicsScores = [];
  let procedureScores = [];

  let totalScores = { anatomy: 0, physics: 0, procedures: 0 };
  let totalCounts = { anatomy: 0, physics: 0, procedures: 0 };

  history.forEach((attempt, index) => {
    if (!attempt.answers) {
      return;
    }
    const numQuestions = Object.keys(attempt.answers).length;
    let score = 0;
    let categoryCounts = { anatomy: 0, physics: 0, procedures: 0 };
    let categoryScores = { anatomy: 0, physics: 0, procedures: 0 };

    Object.entries(attempt.answers).forEach(([questionId, userAnswer]) => {
      const q = findQuestion(allQuestions, questionId);
      if (!q) {
        console.error("Question not found:", questionId);
        return;
      }
      q.correct = userAnswer == q.correct_answer;
      if (q.correct) {
        score++;
        categoryScores[q.category]++;
        totalScores[q.category]++;
      }
      categoryCounts[q.category]++;
      totalCounts[q.category]++;
    });

    anatomyScores.push(categoryScores.anatomy);
    physicsScores.push(categoryScores.physics);
    procedureScores.push(categoryScores.procedures);
    const row = generateRow(
      index,
      attempt.timestamp,
      score,
      numQuestions,
      categoryCounts,
      categoryScores
    );
    historyTable.appendChild(row);
  });
  populateAverage(totalScores, totalCounts);
  renderChart(anatomyScores, physicsScores, procedureScores);
}

function generateRow(
  index,
  timestamp,
  score,
  numQuestions,
  categoryCounts,
  categoryScores
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

function populateAverage(totalScores, totalCounts) {
  const averageScore =
    ((totalScores.anatomy + totalScores.physics + totalScores.procedures) *
      100) /
    (totalCounts.anatomy + totalCounts.physics + totalCounts.procedures);

  const anatomyScore = (totalScores.anatomy * 100) / totalCounts.anatomy;
  const physicsScore = (totalScores.physics * 100) / totalCounts.physics;
  const proceduresScore =
    (totalScores.procedures * 100) / totalCounts.procedures;

  document.getElementById("average-scores").innerHTML = `
<th>${history.length} Attempts</th>
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

function renderChart(anatomyScores, physicsScores, procedureScores) {
  const labels = anatomyScores.map((_, i) => `Attempt ${i + 1}`);

  const ctx = document.getElementById("history-chart").getContext("2d");
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
          label: "Procedure",
          data: procedureScores,
          backgroundColor: "#f1c40f",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { stacked: true },
      },
    },
  });
}
