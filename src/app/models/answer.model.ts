export interface Answer {
    id: string;
    text: string;
    isCorrect: boolean;
    imageUrl?: string;  // Firebase Storage URL
    order?: number;
    questionId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type AnswerInput = Omit<Answer, 'id' | 'createdAt' | 'updatedAt'>;
