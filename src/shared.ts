import { Question } from "./question.ts";

export const storageKey = "quizHistory";

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
  anatomy: Score;
  physics: Score;
  procedures: Score;
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

  countQuestions(): number {
    let totalQuestions = 0;

    for (const score of Object.values(this.topics)) {
      totalQuestions += score.total;
    }
    return totalQuestions;
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
