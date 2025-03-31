document.addEventListener("DOMContentLoaded", function () {
  renderHistory();
});

const storageKey = "quizHistory";


function findQuestion(all_questions, question_id) {
  for (const category of Object.keys(all_questions)) {
    const found = all_questions[category].find(
      (q) => q.id == parseInt(question_id)
    );
    if (found) {
      return { ...found, category };
    }
  }
  return null;
}

async function renderHistory() {
  const historyTable = document.getElementById("history-table")!;
  if (!historyTable) {
    console.error("historyTable not found");
    return;
  }
  const history = JSON.parse(localStorage.getItem(storageKey) || "[]") as Attempt[];

  if (history.length === 0) {
    historyTable.innerHTML =
      "<tr><td colspan='7' class='text-center'>No history available</td></tr>";
    return;
  }

  const response = await fetch(`./questions.json`);
  const all_questions = await response.json();

  let anatomyScores: number[] = [];
  let physicsScores: number[] = [];
  let procedureScores: number[] = [];

  let totalScores = { anatomy: 0, physics: 0, procedures: 0 };
  let totalCounts = { anatomy: 0, physics: 0, procedures: 0 };
  let maxY = 0;

  for (let i = 0; i < history.length; i++) {
    const attempt = history[i];
    if (!attempt.answers) {
      console.warn("invalid attempt. no answers", JSON.stringify(attempt));
      return;
    }
    console.log(attempt);
    const numQuestions = Object.keys(attempt.answers).length;
    if (numQuestions > maxY) {
      maxY = numQuestions;
    }
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

    anatomyScores.push(categoryScores.anatomy);
    physicsScores.push(categoryScores.physics);
    procedureScores.push(categoryScores.procedures);
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
  renderChart(anatomyScores, physicsScores, procedureScores, maxY);
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

function populateAverage(count, totalScores, totalCounts) {
  const averageScore =
    ((totalScores.anatomy + totalScores.physics + totalScores.procedures) *
      100) /
    (totalCounts.anatomy + totalCounts.physics + totalCounts.procedures);

  const anatomyScore = (totalScores.anatomy * 100) / totalCounts.anatomy;
  const physicsScore = (totalScores.physics * 100) / totalCounts.physics;
  const proceduresScore =
    (totalScores.procedures * 100) / totalCounts.procedures;

  document.getElementById("average-scores").innerHTML = `
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
  anatomyScores,
  physicsScores,
  procedureScores,
  maxY: number
) {
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
        y: { stacked: true, max: maxY },
      },
    },
  });
}
