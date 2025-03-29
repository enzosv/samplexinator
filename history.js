document.addEventListener("DOMContentLoaded", function () {
  const historyTable = document.getElementById("history-table");
  let history = JSON.parse(localStorage.getItem("quizHistory")) || [];

  if (history.length === 0) {
    historyTable.innerHTML =
      "<tr><td colspan='2' class='text-center'>No history available</td></tr>";
    return;
  }

  history.forEach((attempt, index) => {
    let date = new Date(attempt.timestamp).toLocaleString();

    historyTable.innerHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${date}</td>
          <td><a href="attempt.html?index=${index}" class="btn btn-primary btn-sm">View</a></td>
        </tr>
      `;
  });
});
