// Export constants
export const letters = ["A", "B", "C", "D"];
export const storageKey = "quizHistory";

// Export interfaces so they can be used in other files for type checking
export interface Question {
  id: number;
  question: string;
  options: string[];
  correct_answer: number; // Assumes this is the correct index now
  user_answer?: number; // Optional: Used when displaying results
  category?: string; // Optional: Added after loading/finding
  attempts?: number; // Optional: Added after finding question attempts
  mistakes?: number; //Optional: Added after finding question attempts
}

export interface Answer {
  question_id: number;
  user_answer: number; // The index selected by the user
}

export interface Attempt {
  timestamp: string;
  answers: Answer[];
  index?: number; // Optional: Added when retrieving specific attempt
}

export class Score {
  correct: number;
  total: number;

  constructor() {
    this.correct = 0;
    this.total = 0;
  }

  getPercentage(): number {
    return this.total > 0 ? (this.correct / this.total) * 100 : 0;
  }
}

export class AttemptResult {
  topics: Record<string, Score>;

  constructor() {
    this.topics = {};
  }

  addTopic(name: string) {
    if (!(name in this.topics)) {
      this.topics[name] = new Score();
    }
  }

  getTotalScore(): number {
    let totalCorrect = 0;

    for (const score of Object.values(this.topics)) {
      totalCorrect += score.correct;
    }
    return totalCorrect;
  }

  getTotalScorePercentage(): number {
    let totalCorrect = 0;
    let totalQuestions = 0;

    for (const score of Object.values(this.topics)) {
      totalCorrect += score.correct;
      totalQuestions += score.total;
    }

    return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  }

  static fromAnsweredQuestions(questions: Question[]): AttemptResult {
    const result = new AttemptResult();

    for (const question of questions) {
      const topic = question.category;
      if (!topic) {
        console.warn(
          "invalid question. missing category",
          JSON.stringify(question)
        );
        continue;
      }
      result.addTopic(topic);
      result.topics[topic].total++;
      if (question.correct_answer == question.user_answer) {
        result.topics[topic].correct++;
      }
    }
    return result;
  }
}

export interface CategoryData {
  anatomy: Score;
  physics: Score;
  procedures: Score;
}

// Interface representing the structure directly fetched from questions.json
// It might differ slightly from the processed 'Question' (e.g., correct_answer format)
// Renaming from the generic 'Category' used elsewhere to avoid confusion
export interface QuestionCategoriesJson {
  [category: string]: Question[]; // Assuming questions in JSON match the Question interface structure now
}

/**
 * Finds a question by its ID within the categorized questions object fetched from JSON.
 * Returns a *new* question object with the category name added.
 * @param all_questions - The object containing categorized questions (like the result of fetchQuestions).
 * @param question_id - The numeric ID of the question to find.
 * @returns A Question object with the category property added, or null if not found.
 */
export function findQuestion(
  all_questions: QuestionCategoriesJson,
  question_id: number
): Question | null {
  for (const category in all_questions) {
    // Ensure we are iterating over the object's own properties
    if (Object.prototype.hasOwnProperty.call(all_questions, category)) {
      const questionsInCategory = all_questions[category];
      // Use strict equality check (===)
      const found = questionsInCategory.find((q) => q.id === question_id);
      if (found) {
        // Return a *new* object, merging the found question with its category.
        // This avoids modifying the original fetched data.
        return { ...found, category: category };
      }
    }
  }
  return null; // Return null if not found in any category
}

/**
 * Fetches the categorized questions from the questions.json file.
 * @returns A Promise resolving to the QuestionCategoriesJson object.
 */
export async function fetchQuestions(): Promise<QuestionCategoriesJson> {
  const response = await fetch("../assets/questions.json");
  if (!response.ok) {
    // Basic error handling for the fetch request
    throw new Error(
      `Failed to fetch questions.json: ${response.status} ${response.statusText}`
    );
  }
  // Assume the JSON structure matches QuestionCategoriesJson
  return response.json() as Promise<QuestionCategoriesJson>;
}
