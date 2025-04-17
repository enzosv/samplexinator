import {
  assertEquals,
  assertNotEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { Question } from "./question.ts";

Deno.test(
  "Question.shuffleOptions should shuffle options and update correct_answer",
  () => {
    const originalOptions = ["Option A", "Option B", "Correct C", "Option D"];
    const originalCorrectIndex = 2;
    const question = new Question(
      1,
      "Test Question",
      [...originalOptions], // Use a copy
      originalCorrectIndex
    );

    const correctAnswerText = question.options[question.correct_answer];
    const originalOptionsOrder = [...question.options]; // Copy order before shuffle

    question.shuffleOptions();

    // 1. Check if the correct answer text is still present
    assertEquals(
      question.options[question.correct_answer],
      correctAnswerText,
      "The correct_answer index should point to the original correct answer text after shuffling."
    );

    // 2. Check if the array length is the same
    assertEquals(
      question.options.length,
      originalOptions.length,
      "The number of options should remain the same after shuffling."
    );

    // 3. Check if all original options are still present
    for (const option of originalOptions) {
      assertExists(
        question.options.find((o) => o === option),
        `Option "${option}" should still be present after shuffling.`
      );
    }

    // 4. Check if the order has likely changed (probabilistic)
    // Note: There's a small chance the shuffle results in the same order.
    // This assertion might occasionally fail, but is useful for general verification.
    assertNotEquals(
      JSON.stringify(question.options),
      JSON.stringify(originalOptionsOrder),
      "The order of options should likely change after shuffling (this is probabilistic)."
    );

    // 5. Check if the correct_answer index is valid
    assertEquals(
      typeof question.correct_answer,
      "number",
      "correct_answer should be a number."
    );
    assertEquals(
      question.correct_answer >= 0 &&
        question.correct_answer < question.options.length,
      true,
      "correct_answer index should be within the bounds of the options array."
    );
  }
);
