interface Question {
    id: number;
    question: string;
    options: string[];
    correct_answer: number;
    user_answer?: number;
    category?: string;
}



interface Answer {
    question_id: number;
    user_answer: number;
}

interface Attempt {
    timestamp: string;
    answers: Answer[];
    index?: number;
}

const letters = ["A", "B", "C", "D"];
const storageKey = "quizHistory";

