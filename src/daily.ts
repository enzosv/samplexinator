import { loadQuestions } from "./samplex.js";
import {
  Answer,
  letters as importedLetters,
  Question,
  storageKey,
} from "./shared.js";

function quizData() {
  console.log("quizData() function executed to return component object."); // Log: Component object creation
  return {
    // --- State ---
    currentQuestionSet: [] as Question[],
    currentQuestionIndex: 0,
    initialAnswers: [] as Answer[] | null, // Track initial answers only
    questionsAnsweredCorrectly: new Set<number>(),
    mistakes: 0,
    totalQuestions: 0, // Original total
    selectedAnswerIndex: null as number | null, // Track selection for the *current* question
    isLoading: true,
    loadingMessage: "Loading questions...",
    error: "" as string | null,
    letters: importedLetters, // Expose letters to the template

    // --- Computed Properties / Getters ---
    get currentQuestion(): Question | null {
      // Added check for empty array to prevent index out of bounds during loading/initial state
      console.log(this.currentQuestionSet);
      const question =
        this.currentQuestionSet &&
        this.currentQuestionSet.length > this.currentQuestionIndex
          ? this.currentQuestionSet[this.currentQuestionIndex]
          : null;
      console.log(Alpine.raw(question.id));
      return question;
    },

    get isLastQuestionInSet(): boolean {
      // Ensure currentQuestionSet is not empty before accessing length
      return (
        this.currentQuestionSet.length > 0 &&
        this.currentQuestionIndex >= this.currentQuestionSet.length - 1
      );
    },

    get needsReview(): boolean {
      // Ensure currentQuestionSet is not empty before checking
      return (
        this.currentQuestionSet.length > 0 &&
        this.currentQuestionSet.some(
          (q) => !this.questionsAnsweredCorrectly.has(q.id)
        )
      );
    },

    get nextButtonText(): string {
      // Handle initial loading state more robustly
      if (
        this.isLoading ||
        !this.currentQuestionSet ||
        this.currentQuestionSet.length === 0
      ) {
        return "Loading..."; // Or some appropriate text
      }
      if (!this.isLastQuestionInSet) {
        return "Next";
      }
      return this.needsReview ? "Review" : "View Results";
    },

    get progressText(): string {
      // Added check for empty array
      if (
        this.isLoading ||
        this.error ||
        !this.currentQuestionSet ||
        this.currentQuestionSet.length === 0
      )
        return "";
      // Ensure totalQuestions is not zero before displaying fraction
      const total = this.totalQuestions > 0 ? `/${this.totalQuestions}` : "";
      return ` ${this.currentQuestionIndex + 1} of ${
        this.currentQuestionSet.length
      } | ${this.questionsAnsweredCorrectly.size}${total} Correct`;
    },

    // --- Methods ---
    async init() {
      console.log("quizData.init() called"); // Log: init method start
      this.isLoading = true;
      this.loadingMessage = "Loading questions...";
      this.error = null;
      this.initialAnswers = []; // Reset for a new session, ensure it's an array initially
      try {
        // Ensure loadQuestions is awaited and handled
        const questions = await loadQuestions();
        if (!questions || questions.length < 1) {
          // Added check for null/undefined questions
          throw new Error(
            "No questions loaded or failed to load. Cannot start quiz."
          );
        }
        console.log("loaded questions", questions);
        this.currentQuestionSet = questions;
        this.totalQuestions = questions.length;
        this.currentQuestionIndex = 0;
        this.questionsAnsweredCorrectly.clear();
        this.mistakes = 0;
        this.selectedAnswerIndex = null;
        this.isLoading = false;
        console.log("quizData.init() finished loading questions successfully."); // Log: init success
      } catch (err) {
        console.error("Failed to load questions in init():", err); // Log: init error
        this.error =
          err instanceof Error
            ? err.message
            : "An unknown error occurred while loading questions.";
        this.isLoading = false;
      }
    },

    selectAnswer(choiceIndex: number) {
      if (this.selectedAnswerIndex !== null || !this.currentQuestion) return; // Already answered

      this.selectedAnswerIndex = choiceIndex;
      const isCorrect = choiceIndex === this.currentQuestion.correct_answer;

      // Record initial answer if applicable
      // Ensure initialAnswers is not null before pushing
      if (this.initialAnswers && this.currentQuestion) {
        this.initialAnswers.push({
          question_id: this.currentQuestion.id,
          user_answer: choiceIndex,
        });
      }

      // Update state based on correctness
      if (isCorrect) {
        if (this.currentQuestion) {
          // Ensure currentQuestion exists
          this.questionsAnsweredCorrectly.add(this.currentQuestion.id);
        }
      } else {
        this.mistakes++;
      }
    },

    getOptionClass(index: number): string {
      let baseClass = "form-check-label btn w-100 text-start py-2";
      const question = this.currentQuestion; // Cache for safety

      if (this.selectedAnswerIndex === null || !question) {
        // No answer selected yet or no question
        return `${baseClass} btn-outline-primary`;
      } else {
        // Answer has been selected
        const isCorrectAnswer = index === question.correct_answer;
        const isSelectedAnswer = index === this.selectedAnswerIndex;

        if (isCorrectAnswer) {
          return `${baseClass} btn-success disabled`; // Always show correct green
        } else if (isSelectedAnswer) {
          return `${baseClass} btn-danger disabled`; // Show selected incorrect red
        } else {
          return `${baseClass} btn-secondary disabled`; // Other options grayed out
        }
      }
    },

    nextStep() {
      if (this.selectedAnswerIndex === null) return; // Shouldn't happen if button is enabled correctly

      if (!this.isLastQuestionInSet) {
        // Move to next question in current set
        this.currentQuestionIndex++;
        this.selectedAnswerIndex = null; // Reset selection for the new question
      } else {
        // End of the current set (initial or review)
        this.handleEndOfSet();
      }
    },

    handleEndOfSet() {
      // Save initial answers if this was the first round
      if (this.initialAnswers) {
        this.saveInitialAnswers();
        this.initialAnswers = null; // Stop tracking initial answers
      }

      // Determine questions for the next round (review)
      // Ensure currentQuestionSet exists before filtering
      const questionsToReview =
        this.currentQuestionSet?.filter(
          (q) => !this.questionsAnsweredCorrectly.has(q.id)
        ) || []; // Default to empty array if set is undefined

      if (questionsToReview.length < 1) {
        // All questions answered correctly, navigate to results
        this.viewResults();
      } else {
        // Start a review round
        this.currentQuestionSet = questionsToReview.sort(
          () => 0.5 - Math.random()
        ); // Shuffle
        this.currentQuestionIndex = 0;
        this.selectedAnswerIndex = null; // Reset selection
      }
    },

    saveInitialAnswers() {
      // Ensure initialAnswers has data before saving
      if (!this.initialAnswers || this.initialAnswers.length === 0) return;
      try {
        const data = localStorage.getItem(storageKey);
        const history = data ? JSON.parse(data) : [];
        history.push({
          answers: this.initialAnswers,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem(storageKey, JSON.stringify(history));
      } catch (e) {
        console.error("Failed to save answers to localStorage:", e);
        // Optionally notify the user
      }
    },

    viewResults() {
      try {
        const data = localStorage.getItem(storageKey);
        const history = data ? JSON.parse(data) : [];
        // Navigate to the attempt page for the last saved attempt
        // Check if history is not empty before accessing length - 1
        if (history.length > 0) {
          globalThis.location.href = `attempt.html?index=${history.length - 1}`;
        } else {
          console.error("Attempting to view results, but no history found.");
          this.error = "Could not find results to display.";
        }
      } catch (e) {
        console.error("Failed to read history from localStorage:", e);
        this.error = "Could not retrieve results.";
        // Stay on the page but show an error
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  // This will use the Alpine object made available globally by the CDN script
  console.log("Alpine initialized, registering 'quiz' data..."); // Debug log
  Alpine.data("quiz", quizData);
  console.log("'quiz' data registered."); // Debug log
});
