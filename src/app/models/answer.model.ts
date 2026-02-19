export interface Answer {
    id: string;
    text: string;
    isCorrect: boolean;
    imageUrl?: string;  // Firebase Storage URL
    /**
     * @deprecated Use imageUrl instead. This field is kept for backward compatibility only.
     */
    image?: any;
    /**
     * @deprecated Use imageUrl instead. This field is kept for backward compatibility only.
     */
    imageMimeType?: string;
    order?: number;
    questionId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type AnswerInput = Omit<Answer, 'id' | 'createdAt' | 'updatedAt'>;
