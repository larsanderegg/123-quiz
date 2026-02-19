import { Injectable } from '@angular/core';
import { QuizTheme, DEFAULT_THEME } from '../models/theme.model';

/**
 * Theme Service
 *
 * Manages theme state and applies themes to the quiz player
 * by setting CSS custom properties on the document root.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme: QuizTheme | null = null;

  /**
   * Apply a theme to the quiz player
   * Sets CSS custom properties on the document root
   */
  applyTheme(theme: QuizTheme | null): void {
    this.currentTheme = theme;

    // Merge with defaults
    const mergedTheme = this.mergeTheme(theme || {});

    // Apply CSS variables to document root
    const root = document.documentElement;

    // Colors
    if (mergedTheme.primaryColor) {
      root.style.setProperty('--quiz-primary-color', mergedTheme.primaryColor);
    }
    if (mergedTheme.secondaryColor) {
      root.style.setProperty('--quiz-secondary-color', mergedTheme.secondaryColor);
    }
    if (mergedTheme.backgroundColor) {
      root.style.setProperty('--quiz-background-color', mergedTheme.backgroundColor);
    }
    if (mergedTheme.categoryHeaderColor) {
      root.style.setProperty('--quiz-category-color', mergedTheme.categoryHeaderColor);
    }
    if (mergedTheme.questionColor) {
      root.style.setProperty('--quiz-question-color', mergedTheme.questionColor);
    }
    if (mergedTheme.answerColor) {
      root.style.setProperty('--quiz-answer-color', mergedTheme.answerColor);
    }
    if (mergedTheme.correctHighlightColor) {
      root.style.setProperty('--quiz-correct-color', mergedTheme.correctHighlightColor);
    }
    if (mergedTheme.incorrectDimColor) {
      root.style.setProperty('--quiz-incorrect-color', mergedTheme.incorrectDimColor);
    }

    // Typography
    if (mergedTheme.fontFamily) {
      root.style.setProperty('--quiz-font-family', mergedTheme.fontFamily);
    }
    if (mergedTheme.categoryFontSize) {
      root.style.setProperty('--quiz-category-font-size', mergedTheme.categoryFontSize);
    }
    if (mergedTheme.questionFontSize) {
      root.style.setProperty('--quiz-question-font-size', mergedTheme.questionFontSize);
    }
    if (mergedTheme.answerFontSize) {
      root.style.setProperty('--quiz-answer-font-size', mergedTheme.answerFontSize);
    }

    // Layout
    if (mergedTheme.backgroundOpacity !== undefined) {
      root.style.setProperty('--quiz-background-opacity', String(mergedTheme.backgroundOpacity));
    }
    if (mergedTheme.answerCardOpacity !== undefined) {
      root.style.setProperty('--quiz-answer-opacity', String(mergedTheme.answerCardOpacity));
    }

    // Spacing
    if (mergedTheme.padding) {
      root.style.setProperty('--quiz-padding', mergedTheme.padding);
    }
    if (mergedTheme.answerSpacing) {
      root.style.setProperty('--quiz-answer-spacing', mergedTheme.answerSpacing);
    }
  }

  /**
   * Reset theme to defaults
   */
  resetTheme(): void {
    this.applyTheme(null);
  }

  /**
   * Get the default theme
   */
  getDefaultTheme(): QuizTheme {
    return { ...DEFAULT_THEME };
  }

  /**
   * Merge custom theme with defaults
   */
  mergeTheme(customTheme: Partial<QuizTheme>): QuizTheme {
    return {
      ...DEFAULT_THEME,
      ...customTheme
    };
  }

  /**
   * Validate theme values (client-side validation)
   */
  validateTheme(theme: Partial<QuizTheme>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate colors (hex format)
    const colorFields: (keyof QuizTheme)[] = [
      'primaryColor',
      'secondaryColor',
      'backgroundColor',
      'categoryHeaderColor',
      'questionColor',
      'answerColor',
      'correctHighlightColor',
      'incorrectDimColor'
    ];

    colorFields.forEach(field => {
      const value = theme[field];
      if (value && typeof value === 'string') {
        // Check if it's a valid hex color
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          errors.push(`${field} must be a valid hex color (e.g., #FF5733)`);
        }
      }
    });

    // Validate opacity (0-1)
    if (theme.backgroundOpacity !== undefined) {
      if (theme.backgroundOpacity < 0 || theme.backgroundOpacity > 1) {
        errors.push('backgroundOpacity must be between 0 and 1');
      }
    }
    if (theme.answerCardOpacity !== undefined) {
      if (theme.answerCardOpacity < 0 || theme.answerCardOpacity > 1) {
        errors.push('answerCardOpacity must be between 0 and 1');
      }
    }

    // Validate font sizes (should end with px, rem, em, etc.)
    const fontSizeFields: (keyof QuizTheme)[] = [
      'categoryFontSize',
      'questionFontSize',
      'answerFontSize'
    ];

    fontSizeFields.forEach(field => {
      const value = theme[field];
      if (value && typeof value === 'string') {
        if (!/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) {
          errors.push(`${field} must have a valid unit (px, rem, em, %)`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get current applied theme
   */
  getCurrentTheme(): QuizTheme | null {
    return this.currentTheme;
  }
}
