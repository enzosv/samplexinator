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

export interface CategoryData {
    anatomy: number;
    physics: number;
    procedures: number;
    [key: string]: number; // Allow dynamic access using category strings
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
 * @param allQuestions - The object containing categorized questions (like the result of fetchQuestions).
 * @param questionId - The numeric ID of the question to find.
 * @returns A Question object with the category property added, or null if not found.
 */
export function findQuestion(
    allQuestions: QuestionCategoriesJson,
    questionId: number
): Question | null {
    for (const category in allQuestions) {
        // Ensure we are iterating over the object's own properties
        if (Object.prototype.hasOwnProperty.call(allQuestions, category)) {
            const questionsInCategory = allQuestions[category];
            // Use strict equality check (===)
            const found = questionsInCategory.find((q) => q.id === questionId);
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
    const response = await fetch("./questions.json");
    if (!response.ok) {
        // Basic error handling for the fetch request
        throw new Error(
            `Failed to fetch questions.json: ${response.status} ${response.statusText}`
        );
    }
    // Assume the JSON structure matches QuestionCategoriesJson
    return response.json() as Promise<QuestionCategoriesJson>;
}