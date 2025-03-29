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
      // row.innerHTML += `<td>${correct}/${total} <small>(${
      //   categoryPercentage.toFixed(2) ?? 0
      // }%)</small></td>`;
      row.innerHTML += `<td class="${
        categoryPercentage < 75 ? "text-danger" : ""
      }">${correct}/${total}</td>`;
    }
    row.innerHTML += `<td><a href="attempt.html?index=${index}" class="btn btn-primary btn-sm">View</a></td>`;
    historyTable.appendChild(row);
  });
}
