const letters = ["A", "B", "C", "D"];
let answers = {};
const storageKey = "quizHistory";

async function fetchConfig() {
  const response = await fetch("./config.json");
  return response.json();
}

async function fetchQuestions() {
  const response = await fetch("./questions.json");
  return response.json();
}

async function loadQuestions() {
  const [data, config] = await Promise.all([fetchQuestions(), fetchConfig()]);
  let loadedQuestions = [];

  for (const category in data) {
    const shuffled = data[category]
      .sort(() => 0.5 - Math.random()) // shuffle
      .slice(0, config.count_per_category) // number of questions per category
      .map((q) => ({ ...q, category: category })); // add category to data
    loadedQuestions = [...loadedQuestions, ...shuffled];
  }

  return loadedQuestions.sort(() => 0.5 - Math.random());
}

function renderQuestions(questions) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  questions.forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "question border p-3 mb-3 rounded";
    div.innerHTML = `<p><strong>${index + 1}) ${q.question}</strong></p>`;

    for (const [key, value] of Object.entries(q.options)) {
      div.innerHTML += `
                  <div class="form-check">
          <input class="form-check-input d-none" type="radio" id="option-${q.id}-${key}" name="question-${q.id}" value="${key}" onchange="saveAnswer(${q.id}, '${key}');">
          <label class="form-check-label btn btn-outline-primary w-100 text-start py-2" for="option-${q.id}-${key}">
              <strong>${letters[key]}</strong>: ${value}
          </label>
      </div>`;
    }

    container.appendChild(div);
  });
  document.getElementById("submit-btn").style.display = "block";
}

function saveAnswer(questionId, choice) {
  answers[questionId] = choice;

  const options = document.getElementsByName(`question-${questionId}`);
  options.forEach((option) => {
    const label = document.querySelector(
      `label[for="option-${questionId}-${option.value}"]`
    );
    if (label) {
      label.classList.remove("btn-primary", "active"); // Remove highlight from all
      label.classList.add("btn-outline-primary"); // Reapply outline
    }
  });

  // Highlight the selected option
  const selectedLabel = document.querySelector(
    `label[for="option-${questionId}-${choice}"]`
  );
  if (selectedLabel) {
    selectedLabel.classList.remove("btn-outline-primary");
    selectedLabel.classList.add("btn-primary", "active");
  }
}

function submitAnswers() {
  let history = JSON.parse(localStorage.getItem(storageKey)) || [];

  const attempt = {
    timestamp: new Date().toISOString(),
    answers: answers,
  };

  history.push(attempt);
  localStorage.setItem(storageKey, JSON.stringify(history));
  window.location.href = `attempt.html?index=${history.length - 1}`;
}

document.addEventListener("DOMContentLoaded", async function () {
  const questions = await loadQuestions();
  renderQuestions(questions);
});
