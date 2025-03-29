document.addEventListener("DOMContentLoaded", function () {
  const historyTable = document.getElementById("history-table");
  const scoreChartCtx = document.getElementById("scoreChart").getContext("2d");
  let history = JSON.parse(localStorage.getItem("quizHistory")) || [];

  if (history.length === 0) {
    historyTable.innerHTML =
      "<tr><td colspan='6' class='text-center'>No history available</td></tr>";
    return;
  }

  let attempts = [];
  let totalScores = [];
  let anatomyScores = [];
  let physicsScores = [];
  let procedureScores = [];

  history.forEach((attempt, index) => {
    let totalScore = attempt.score || 0;
    let anatomyScore = attempt.scoreBreakdown.anatomy || 0;
    let physicsScore = attempt.scoreBreakdown.physics || 0;
    let procedureScore = attempt.scoreBreakdown.procedure || 0;
    let totalQuestions =
      (attempt.totalBreakdown.anatomy || 0) +
      (attempt.totalBreakdown.physics || 0) +
      (attempt.totalBreakdown.procedure || 0);
    let date = new Date(attempt.timestamp).toLocaleString();

    attempts.push(index + 1);
    totalScores.push(totalScore);
    anatomyScores.push(anatomyScore);
    physicsScores.push(physicsScore);
    procedureScores.push(procedureScore);

    let scoreClass = totalScore < 75 ? "low-score" : "high-score";

    historyTable.innerHTML += `
        <tr>
          <td>${index + 1}</td>
          <td class="${scoreClass}">${totalScore.toFixed(2)}%</td>
          <td>${anatomyScore} / ${attempt.totalBreakdown.anatomy || 0}</td>
          <td>${physicsScore} / ${attempt.totalBreakdown.physics || 0}</td>
          <td>${procedureScore} / ${attempt.totalBreakdown.procedure || 0}</td>
          <td>${date}</td>
          <td><a href="attempt.html?index=${index}" class="btn btn-primary btn-sm">View</a></td>
        </tr>
      `;
  });

  new Chart(scoreChartCtx, {
    type: "bar",
    data: {
      labels: attempts,
      datasets: [
        {
          label: "Anatomy",
          data: anatomyScores,
          backgroundColor: "#007bff",
        },
        {
          label: "Physics",
          data: physicsScores,
          backgroundColor: "#28a745",
        },
        {
          label: "Procedure",
          data: procedureScores,
          backgroundColor: "#ffc107",
        },
        {
          label: "Total Score",
          data: totalScores,
          backgroundColor: totalScores.map((score) =>
            score < 75 ? "#dc3545" : "#17a2b8"
          ),
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
});
