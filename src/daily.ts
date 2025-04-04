import { loadQuestions } from "./samplex.js";
import {
  Answer,
  generateQuestionElement,
  Question,
  storageKey,
} from "./shared.js";

// --- State Variables ---
let currentQuestionSet: Question[] = []; // Questions for the current round (initial 10 or review set)
let currentQuestionIndex: number = 0; // Index within the currentQuestionSet
let initialAnswers: Answer[] | null = [];
const questionsAnsweredCorrectly: Set<number> = new Set(); // Keep track of Qs answered correctly at least once

// --- DOM Elements ---
let quizContainer: HTMLElement | null;
let progressBar: HTMLProgressElement | null;
let nextButton: HTMLButtonElement | null;
let progressIndicator: HTMLElement | null;

let mistakes = 0;
let totalQuestions = 0;

// --- Functions ---

/**
 * Renders the current question.
 */
function renderCurrentQuestion() {
  if (!quizContainer || currentQuestionIndex >= currentQuestionSet.length) {
    console.error(
      "Cannot render question: container missing or index out of bounds."
    );
    return;
  }

  const question = currentQuestionSet[currentQuestionIndex];
  quizContainer.innerHTML = ""; // Clear previous question

  const div = generateQuestionElement(
    question,
    currentQuestionIndex,
    (option: number) => {
      handleAnswer(question, option);
    }
  );

  quizContainer.appendChild(div);
  updateNextButtonState(false); // Disable 'Next' until an answer is selected
}

/**
 * Updates the text/state of the next button.
 */
function updateNextButtonState(enabled: boolean, text?: string) {
  if (!nextButton) return;
  nextButton.disabled = !enabled;
  if (text) {
    nextButton.textContent = text;
    return;
  }
  // Determine default text based on context
  const isLastQuestionInSet =
    currentQuestionIndex >= currentQuestionSet.length - 1;
  if (!isLastQuestionInSet) {
    nextButton.textContent = "Next";
    return;
  }
  // Check if any questions in the current set still need a correct answer
  const needsReview = currentQuestionSet.some(
    (q) => !questionsAnsweredCorrectly.has(q.id)
  );
  if (needsReview) {
    nextButton.textContent = "Review";
    return;
  }
  // done. go to view attempt next
  nextButton.textContent = "View";
}

function handleAnswer(question: Question, option: number) {
  question.user_answer = option;
  renderCurrentQuestion();
  const isCorrect = option === question.correct_answer;

  if (initialAnswers) {
    initialAnswers.push({
      question_id: question.id,
      user_answer: option,
    });
  }
  if (isCorrect) {
    questionsAnsweredCorrectly.add(question.id); // Mark as correctly answered at least once
  } else {
    mistakes++;
  }
  if (progressBar) {
    progressBar.value = (currentQuestionIndex + 1) / currentQuestionSet.length;
  }

  updateProgressIndicator();
  updateNextButtonState(true);
}

/**
 * Updates the progress indicator text.
 */
function updateProgressIndicator() {
  if (progressIndicator) {
    progressIndicator.innerHTML = `${questionsAnsweredCorrectly.size}/${totalQuestions} Correct`;
  }
  if (mistakes > 0) {
    const counter = document.getElementById("mistake-counter");
    if (counter) {
      counter.innerHTML = `${mistakes} Mistake${mistakes == 1 ? "" : "s"}`;
    }
  }
}

/**
 * Moves to the next question or initiates a review round/finishes.
 */
function nextStep() {
  currentQuestionSet[currentQuestionIndex].user_answer = undefined; // reset answer
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuestionSet.length) {
    // --- Render next question in the current set ---
    renderCurrentQuestion();
    updateNextButtonState(false); // Disable until answer
    return;
  }
  // --- End of the current question set ---

  if (initialAnswers) {
    //save first attempt to history
    const data = localStorage.getItem(storageKey);
    const history = data ? JSON.parse(data) : [];
    history.push({
      answers: initialAnswers,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(storageKey, JSON.stringify(history));
    initialAnswers = null; // stop tracking initital answers
  }

  const questionsToReview = currentQuestionSet.filter(
    (q) => !questionsAnsweredCorrectly.has(q.id)
  );
  if (questionsToReview.length < 1) {
    const data = localStorage.getItem(storageKey);
    const history = data ? JSON.parse(data) : [];
    // view attempt
    globalThis.location.href = `attempt.html?index=${history.length - 1}`;
    return;
  }

  // --- Start a Review Round ---
  currentQuestionSet = questionsToReview.sort(() => 0.5 - Math.random()); // Shuffle review questions
  currentQuestionIndex = 0;
  if (progressBar) {
    progressBar.value = 0;
  }
  renderCurrentQuestion();
  updateNextButtonState(false, "Next"); // Start review round
  updateProgressIndicator(); // Update progress for the new round
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  quizContainer = document.getElementById("quiz-container");
  nextButton = document.getElementById(
    "next-button"
  ) as HTMLButtonElement | null;
  progressIndicator = document.getElementById("progress-indicator");
  progressBar = document.getElementById("progress") as HTMLProgressElement;

  if (!quizContainer || !nextButton || !progressIndicator) {
    console.error("Required DOM elements not found!");
    return;
  }

  nextButton.addEventListener("click", nextStep);

  progressIndicator.textContent = "Loading questions...";
  currentQuestionSet = await loadQuestions();
  totalQuestions = currentQuestionSet.length;

  if (currentQuestionSet.length < 1) {
    quizContainer.innerHTML = `<div class="alert alert-warning">No questions loaded. Cannot start review mode.</div>`;
    progressIndicator.textContent = "Error";
    return;
  }
  updateProgressIndicator();
  currentQuestionIndex = 0;
  renderCurrentQuestion();
});
