document.addEventListener("DOMContentLoaded", function () {
  renderHistory();
});

function findQuestion(allQuestions, questionId) {
  for (const category of Object.keys(allQuestions)) {
    const found = allQuestions[category].find(
      (q) => q.id == parseInt(questionId)
    );
    if (!found) {
      continue;
    }
    const q = found;
    q.category = category;
    return q;
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

  let chartLabels = [];
  let totalScores = [];
  let anatomyScores = [];
  let physicsScores = [];
  let procedureScores = [];

  history.forEach((attempt, index) => {
    if (!attempt.answers) {
      return;
    }
    const numQuestions = Object.keys(attempt.answers).length;
    let score = 0;

    let questions = [];
    let categoryCounts = { anatomy: 0, physics: 0, procedures: 0 };
    let categoryScores = { anatomy: 0, physics: 0, procedures: 0 };

    Object.entries(attempt.answers).forEach(([questionId, userAnswer]) => {
      const q = findQuestion(allQuestions, questionId);
      if (!q) {
        console.error("Question not found:", questionId);
        return;
      }
      q.correct = userAnswer == q.correct_answer;
      questions.push(q);
      if (q.correct) {
        score++;
        categoryScores[q.category]++;
      }
      categoryCounts[q.category]++;
    });

    const scorePercentage = (score / numQuestions) * 100;
    const scoreClass = scorePercentage < 75 ? "text-danger" : "";
    let date = new Date(attempt.timestamp).toLocaleString();

    // Populate data for chart
    chartLabels.push(`Attempt ${index + 1}`);
    totalScores.push(scorePercentage);
    anatomyScores.push(
      categoryCounts.anatomy > 0
        ? (categoryScores.anatomy * categoryCounts.anatomy * score * 100) /
            numQuestions ** 2
        : 0
    );
    physicsScores.push(
      categoryCounts.physics > 0
        ? (categoryScores.physics * categoryCounts.physics * score * 100) /
            numQuestions ** 2
        : 0
    );
    procedureScores.push(
      categoryCounts.procedures > 0
        ? (categoryScores.procedures *
            categoryCounts.procedures *
            score *
            100) /
            numQuestions ** 2
        : 0
    );

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${index + 1}</td>
            <td>${date}</td>
            <td class="${scoreClass}">${score} / ${numQuestions} <small>(${scorePercentage.toFixed(
      2
    )}%)</small></td>`;

    for (const category in categoryCounts) {
      const correct = categoryScores[category] ?? 0;
      const total = categoryCounts[category] ?? 0;
      const categoryPercentage = total > 0 ? (correct / total) * 100 : 100;
      row.innerHTML += `<td class="${
        categoryPercentage < 75 ? "text-danger" : ""
      }">${correct}/${total}</td>`;
    }
    row.innerHTML += `<td><a href="attempt.html?index=${index}" class="btn btn-primary btn-sm">View</a></td>`;
    historyTable.appendChild(row);
  });

  // Render the chart
  renderChart(
    chartLabels,
    totalScores,
    anatomyScores,
    physicsScores,
    procedureScores
  );
}

function renderChart(labels, total, anatomy, physics, procedures) {
  const chartContainer = document.getElementById("history-chart");
  console.log(chartContainer);
  const ctx = chartContainer.getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Score (%)",
          data: total,
          backgroundColor: "blue",
        },
        {
          label: "Anatomy (%)",
          data: anatomy,
          backgroundColor: "green",
        },
        {
          label: "Physics (%)",
          data: physics,
          backgroundColor: "orange",
        },
        {
          label: "Procedures (%)",
          data: procedures,
          backgroundColor: "purple",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: "Percentage Score",
          },
        },
      },
    },
  });
}
