/**
 * Quiz Theme Model
 *
 * Defines customizable theme properties for quiz rounds.
 * All properties are optional - missing values fall back to defaults.
 */
export interface QuizTheme {
  // Colors
  primaryColor?: string;          // Main text color (hex format: #RRGGBB)
  secondaryColor?: string;        // Secondary elements
  backgroundColor?: string;       // Override background color
  categoryHeaderColor?: string;   // Category text color
  questionColor?: string;         // Question text color
  answerColor?: string;           // Answer text color
  correctHighlightColor?: string; // Correct answer highlight
  incorrectDimColor?: string;     // Incorrect answer dim

  // Typography
  fontFamily?: string;            // Main font (web-safe fonts)
  categoryFontSize?: string;      // Category header size (e.g., "48px", "3rem")
  questionFontSize?: string;      // Question text size
  answerFontSize?: string;        // Answer text size

  // Layout
  backgroundOpacity?: number;     // 0-1, dims background image overlay
  answerCardOpacity?: number;     // 0-1, answer card transparency

  // Spacing
  padding?: string;               // Overall padding (e.g., "20px")
  answerSpacing?: string;         // Space between answers (e.g., "20px")
}

/**
 * Theme input type for creating/updating themes
 */
export type ThemeInput = Partial<QuizTheme>;

/**
 * Default theme values
 */
export const DEFAULT_THEME: QuizTheme = {
  primaryColor: '#333333',
  secondaryColor: '#666666',
  categoryHeaderColor: '#ffffff',
  questionColor: '#ffffff',
  answerColor: '#333333',
  correctHighlightColor: '#4caf50',
  incorrectDimColor: '#cccccc',
  fontFamily: "'Berlin Sans FB', sans-serif",
  categoryFontSize: '48px',
  questionFontSize: '48px',
  answerFontSize: '1.5rem',
  backgroundOpacity: 0.0,
  answerCardOpacity: 0.92,
  padding: '20px',
  answerSpacing: '20px'
};
