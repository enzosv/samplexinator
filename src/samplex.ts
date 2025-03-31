const answers: Answer[] = [];
const letters = ["A", "B", "C", "D"];
const storageKey = "quizHistory";




async function fetchQuestions(): Promise<Category> {
  const response = await fetch("./questions.json");
  return response.json();
}

interface Category {
  [category: string]: Question[];
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
}

async function loadQuestions() {
  const data = await fetchQuestions();
  let loadedQuestions: Question[] = [];

  for (const category in data) {
    const shuffled = data[category]
      .sort(() => 0.5 - Math.random()) // shuffle
      .slice(0, 1)
      // .slice(0, category == "physics" ? 4 : 3) // number of questions per category
      .map((q) => ({ ...q, category: category })); // add category to data
    loadedQuestions = [...loadedQuestions, ...shuffled];
  }

  return loadedQuestions.sort(() => 0.5 - Math.random());
}

function renderSamplexQuestions(questions: Question[]) {
  const container = document.getElementById("quiz-container");
  if (!container) {
    console.error("container could not be found");
    return;
  }
  container.innerHTML = "";

  questions.forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "question border p-3 mb-3 rounded";
    div.innerHTML = `<p><strong>${index + 1}) ${q.question}</strong></p>`;

    for (let i = 0; i < q.options.length; i++) {
      const optionWrapper = document.createElement("div");
      optionWrapper.className = "form-check";

      const input = document.createElement("input");
      input.className = "form-check-input d-none"; // Keep hidden if using label styling
      input.type = "radio";
      input.id = `option-${q.id}-${i}`;
      input.name = `question-${q.id}`; // Group radios by question
      input.value = i.toString(); // Set value to the option index

      input.addEventListener("change", () => {
        saveAnswer(q.id, i);
      });

      const label = document.createElement("label");
      label.className =
        "form-check-label btn btn-outline-primary w-100 text-start py-2";
      label.htmlFor = input.id; // Associate label with input
      // Use innerHTML for the strong tag, ensure q.options[i] is safe or sanitize if needed
      label.innerHTML = `<strong>${letters[i]}</strong>: ${q.options[i]}`;

      // Append input and label to the wrapper div
      optionWrapper.appendChild(input);
      optionWrapper.appendChild(label);

      // Append the option wrapper to the main question div
      div.appendChild(optionWrapper);
    }

    container.appendChild(div);
  });
}

function saveAnswer(question_id: number, choice: number) {
  answers.push({ question_id: question_id, user_answer: choice });

  // Get all labels for the current question using a query that selects labels whose 'for' attribute starts with 'option-{question_id}-'
  const labels = document.querySelectorAll(`label[for^="option-${question_id}-"]`);

  labels.forEach((label) => {
    const l = label as HTMLLabelElement;
    // Get the corresponding input element using the label's 'for' attribute
    const input = document.getElementById(l.htmlFor) as HTMLInputElement;

    // If this label corresponds to the selected radio button's value, activate it
    if (input.value === choice.toString()) {
      l.classList.remove("btn-outline-primary");
      l.classList.add("btn-primary", "active");
      return;
    }
    // Reset all labels for this question: remove active/primary styles, ensure outline style is present

    l.classList.remove("btn-primary", "active");
    l.classList.add("btn-outline-primary");
  });
}

function submitAnswers() {
  const data = localStorage.getItem(storageKey);
  const history = data ? JSON.parse(data) : [];
  const attempt = {
    timestamp: new Date().toISOString(),
    answers: answers,
  };

  history.push(attempt);
  localStorage.setItem(storageKey, JSON.stringify(history));

  globalThis.location.href = `attempt.html?index=${history.length - 1}`;
}

document.addEventListener("DOMContentLoaded", async function () {
  const questions = await loadQuestions();
  renderSamplexQuestions(questions);

  document.getElementById("submit-button")?.addEventListener("click", submitAnswers);
});
