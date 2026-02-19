export interface Question {
    id: string;
    text: string;
    explanation?: string;
    category: string;
    introduction: string;
    order: number;
    imageUrl?: string;  // Firebase Storage URL
    /**
     * @deprecated Use imageUrl instead. This field is kept for backward compatibility only.
     */
    image?: any;
    /**
     * @deprecated Use imageUrl instead. This field is kept for backward compatibility only.
     */
    imageMimeType?: string;
    roundId?: string;
    /**
     * @deprecated TypeORM reference field. Not used in Firebase implementation.
     */
    round?: any;
    answers: any[]; // Answers array (empty array if none)
    createdAt?: Date;
    updatedAt?: Date;
}

export type QuestionInput = Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'answers'>;
