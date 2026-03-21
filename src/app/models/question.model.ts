export interface Question {
    id: string;
    text: string;
    explanation?: string;
    category: string;
    introduction: string;
    order: number;
    imageUrl?: string;  // Firebase Storage URL
    roundId?: string;
    isEnabled?: boolean;
    answers: any[]; // Answers array (empty array if none)
    createdAt?: Date;
    updatedAt?: Date;
}

export type QuestionInput = Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'answers'>;
