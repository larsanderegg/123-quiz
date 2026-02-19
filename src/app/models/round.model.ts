import { QuizTheme } from './theme.model';

export interface Round {
  id: string;
  name: string;
  order: number;
  audioUrl?: string;
  /**
   * @deprecated Use audioUrl instead. This field is kept for backward compatibility only.
   */
  audioPath?: string;
  backgroundImageUrl?: string;
  /**
   * @deprecated Use backgroundImageUrl instead. This field is kept for backward compatibility only.
   */
  backgroundImagePath?: string;
  theme?: QuizTheme;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RoundInput = Omit<Round, 'id' | 'createdAt' | 'updatedAt'>;
