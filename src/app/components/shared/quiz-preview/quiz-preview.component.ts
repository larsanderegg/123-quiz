import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Question, Answer } from '../../../models';

/**
 * Quiz Preview Component
 *
 * Reusable component that displays a question/answer preview
 * mimicking the quiz player display but in preview mode.
 *
 * This is used in the management forms to show how content
 * will appear during the actual quiz presentation.
 */
@Component({
  selector: 'app-quiz-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-preview.component.html',
  styleUrls: ['./quiz-preview.component.scss']
})
export class QuizPreviewComponent implements OnChanges {
  @Input() question: Question | null = null;
  @Input() answers: Answer[] = [];
  @Input() currentStep: number = 0;
  @Input() backgroundImage: string | null = null;
  @Input() previewMode: boolean = true;

  // Computed properties for display
  showCorrectHighlight: boolean = false;
  showExplanation: boolean = false;
  blinkingAnswerIndex: number = -1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      this.updateDisplayState();
    }
  }

  private updateDisplayState(): void {
    // Step 5: Blinking animation
    this.blinkingAnswerIndex = this.currentStep === 5 ? 0 : -1;

    // Step 6: Show correct highlight
    this.showCorrectHighlight = this.currentStep === 6;

    // Step 7: Show explanation
    this.showExplanation = this.currentStep === 7;
  }

  isAnswerBlinking(index: number): boolean {
    return this.currentStep === 5 && this.blinkingAnswerIndex === index;
  }

  getStepLabel(): string {
    if (!this.question) return 'No Question';

    switch (this.currentStep) {
      case 0: return 'Category & Introduction';
      case 1: return 'Question';
      case 2: return 'Answer 1 Revealed';
      case 3: return 'Answer 2 Revealed';
      case 4: return 'Answer 3 Revealed';
      case 5: return 'Blinking Animation';
      case 6: return 'Correct Answer Highlight';
      case 7: return 'Explanation';
      default: return `Step ${this.currentStep}`;
    }
  }

  // Generate empty slots for missing answers (max 3 answers)
  getEmptySlots(): number[] {
    const emptyCount = Math.max(0, 3 - this.answers.length);
    return Array(emptyCount).fill(0);
  }
}
