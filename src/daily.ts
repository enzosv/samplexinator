import { loadQuestions } from "./samplex.js";
import {
    Answer,
    letters,
    Question,
    // Note: We are NOT importing storageKey from samplex
} from "./shared.js";

// Use a different key for localStorage to separate review attempts
const reviewStorageKey = "samplexReviewHistory";

// --- State Variables ---
let currentQuestionSet: Question[] = []; // Questions for the current round (initial 10 or review set)
let currentQuestionIndex: number = 0; // Index within the currentQuestionSet
let currentAttempt: { timestamp: string; answers: Answer[] } = {
    timestamp: new Date().toISOString(),
    answers: [], // Store ALL answers, including corrections
};
let incorrectQuestionsInRound: Question[] = []; // Questions answered incorrectly in the current round
let questionsAnsweredCorrectly: Set<number> = new Set(); // Keep track of Qs answered correctly at least once

// --- DOM Elements ---
let quizContainer: HTMLElement | null;
let nextButton: HTMLButtonElement | null;
let progressIndicator: HTMLElement | null;

let mistakes = 0;

// --- Functions ---

/**
 * Renders the current question.
 */
function renderCurrentQuestion() {
    if (!quizContainer || currentQuestionIndex >= currentQuestionSet.length) {
        console.error("Cannot render question: container missing or index out of bounds.");
        return;
    }

    const q = currentQuestionSet[currentQuestionIndex];
    quizContainer.innerHTML = ""; // Clear previous question

    const div = document.createElement("div");
    div.className = "question border p-3 mb-3 rounded";
    div.innerHTML = `<p><strong>${q.question}</strong></p>`;


    q.options.forEach((option, i) => {
        const optionWrapper = document.createElement("div");
        optionWrapper.className = "form-check";

        const input = document.createElement("input");
        input.className = "form-check-input d-none"; // Hide radio button visually
        input.type = "radio";
        input.id = `option-${q.id}-${i}`;
        input.name = `question-${q.id}`; // Group radios
        input.value = i.toString();
        input.disabled = false; // Ensure options are enabled initially

        const label = document.createElement("label");
        label.className =
            "form-check-label btn btn-outline-primary w-100 text-start py-2";
        label.htmlFor = input.id;
        label.innerHTML = `<strong>${letters[i]}</strong>: ${option}`;

        input.addEventListener("change", () => {
            handleAnswerSelection(q, i, label);
        });

        optionWrapper.appendChild(input);
        optionWrapper.appendChild(label);
        div.appendChild(optionWrapper);
    });

    quizContainer.appendChild(div);
    updateNextButtonState(false); // Disable 'Next' until an answer is selected
}

/**
 * Handles the logic when a user selects an answer.
 */
function handleAnswerSelection(question: Question, choiceIndex: number, selectedLabel: HTMLLabelElement) {
    const isCorrect = choiceIndex === question.correct_answer;

    // Record the answer (even if it's a correction)
    currentAttempt.answers.push({
        question_id: question.id,
        user_answer: choiceIndex,
    });

    // Disable all options for this question after selection
    const allLabels = quizContainer?.querySelectorAll(`label[for^="option-${question.id}-"]`);
    if (!allLabels) {
        console.error("labels missing")
        return;
    }
    for (let i = 0; i < allLabels.length; i++) {
        const label = allLabels[i];
        const input = document.getElementById(label.htmlFor) as HTMLInputElement | null;
        if (input) input.disabled = true;
        label.classList.remove('btn-outline-primary', 'btn-primary', 'active'); // Clear existing styles
        label.classList.add('btn-secondary', 'disabled'); // Visually 
        if (i == question.correct_answer) {
            label.classList.add("btn-success");
        }
    }

    // Provide visual feedback
    selectedLabel.classList.remove('btn-secondary', 'disabled'); // Re-enable selected style change
    if (isCorrect) {
        questionsAnsweredCorrectly.add(question.id); // Mark as correctly answered at least once
        // If this question was previously incorrect in this round, remove it
        incorrectQuestionsInRound = incorrectQuestionsInRound.filter(q => q.id !== question.id);
    } else {
        mistakes++;
        selectedLabel.classList.add("btn-danger");
        // Mark as incorrect for this round if not already marked correct in a *previous* round
        if (!questionsAnsweredCorrectly.has(question.id)) {
            // Avoid adding duplicates if answered incorrectly multiple times in review rounds
            if (!incorrectQuestionsInRound.some(q => q.id === question.id)) {
                incorrectQuestionsInRound.push(question);
            }
        }
    }

    updateProgressIndicator();
    updateNextButtonState(true);
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
    const isLastQuestionInSet = currentQuestionIndex >= currentQuestionSet.length - 1;
    if (!isLastQuestionInSet) {
        nextButton.textContent = "Next";
        return;
    }
    const remainingIncorrect = currentQuestionSet.filter(q => !questionsAnsweredCorrectly.has(q.id));
    if (incorrectQuestionsInRound.length === 0 && remainingIncorrect.length === 0) {
        nextButton.textContent = "Finish";
    } else {
        nextButton.textContent = "Review";
    }
}


/**
 * Updates the progress indicator text.
 */
function updateProgressIndicator() {
    if (!progressIndicator) return;
    const totalInSet = currentQuestionSet.length;
    const currentNum = currentQuestionIndex + 1;

    progressIndicator.textContent = ` ${currentNum} of ${totalInSet}`;

    // Add overall progress if desired
    const totalCorrect = questionsAnsweredCorrectly.size;
    const totalAttempted = new Set(currentAttempt.answers.map(a => a.question_id)).size;
    progressIndicator.textContent += ` | ${totalCorrect}/${totalInSet} Correct`;
}


/**
 * Moves to the next question or initiates a review round/finishes.
 */
function nextStep() {
    currentQuestionIndex++;

    if (currentQuestionIndex < currentQuestionSet.length) {
        // --- Render next question in the current set ---
        renderCurrentQuestion();
        updateNextButtonState(false); // Disable until answer
        return;
    }
    // --- End of the current question set ---
    const questionsToReview = currentQuestionSet.filter(q => !questionsAnsweredCorrectly.has(q.id));
    if (questionsToReview.length < 1) {
        finishAttempt();
        return;
    }

    // --- Start a Review Round ---
    currentQuestionSet = questionsToReview.sort(() => 0.5 - Math.random()); // Shuffle review questions
    currentQuestionIndex = 0;
    incorrectQuestionsInRound = []; // Reset for the new round
    renderCurrentQuestion();
    updateNextButtonState(false, "Next"); // Start review round
    updateProgressIndicator();
}

/**
 * Saves the attempt to localStorage and redirects (or shows completion message).
 */
function finishAttempt() {
    // console.log("Attempt finished. Saving results.");
    // Add final timestamp if needed, though it's set at the start
    // currentAttempt.timestamp = new Date().toISOString();

    // const historyData = localStorage.getItem(reviewStorageKey);
    // const history = historyData ? JSON.parse(historyData) : [];
    // history.push(currentAttempt);
    // localStorage.setItem(reviewStorageKey, JSON.stringify(history));

    // Clear the UI and show completion message
    quizContainer!.innerHTML = `<div class="alert alert-success">Complete! ${mistakes} Mistake${mistakes == 1 ? "" : "s"}</div>`;
    progressIndicator!.textContent = "Finished!";
    if (!nextButton) {
        return;
    }
    nextButton.textContent = "History";
    nextButton.disabled = false;
    nextButton.onclick = () => { window.location.href = 'history.html'; }; // Redirect to history
    // Consider removing the event listener if navigating away
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    quizContainer = document.getElementById("quiz-container");
    nextButton = document.getElementById("next-button") as HTMLButtonElement | null;
    progressIndicator = document.getElementById("progress-indicator");


    if (!quizContainer || !nextButton || !progressIndicator) {
        console.error("Required DOM elements not found!");
        return;
    }

    nextButton.addEventListener("click", nextStep);

    progressIndicator.textContent = "Loading questions...";
    currentQuestionSet = await loadQuestions();

    if (currentQuestionSet.length < 1) {
        quizContainer.innerHTML = `<div class="alert alert-warning">No questions loaded. Cannot start review mode.</div>`;
        progressIndicator.textContent = "Error";
        return;
    }
    updateProgressIndicator();
    currentQuestionIndex = 0;
    renderCurrentQuestion();
});