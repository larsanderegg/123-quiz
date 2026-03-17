import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
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
export class QuizPreviewComponent implements OnChanges, OnDestroy {
  @Input() question: Question | null = null;
  @Input() answers: Answer[] = [];
  @Input() currentStep: number = 0;
  @Input() backgroundImage: string | null = null;
  @Input() previewMode: boolean = true;

  // Computed properties for display
  showCorrectHighlight: boolean = false;
  showExplanation: boolean = false;
  blinkingAnswerIndex: number = -1;

  private blinkingSubscription: Subscription | null = null;
  private blinkingDirection: 'forward' | 'backward' = 'forward';
  private currentlyBlinkingIndex: number = -1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      this.updateDisplayState();
    }
  }

  private updateDisplayState(): void {
    if (this.currentStep === 5) {
      this.startBlinking();
    } else {
      this.stopBlinking();
    }

    // Step 6: Show correct highlight
    this.showCorrectHighlight = this.currentStep === 6;

    // Step 7: Show explanation
    this.showExplanation = this.currentStep === 7;
  }

  private startBlinking(): void {
    if (this.blinkingSubscription) return;
    const numberOfAnswers = Math.min(this.answers.length, 3);
    if (numberOfAnswers <= 0) return;
    this.blinkingAnswerIndex = -1;
    this.currentlyBlinkingIndex = -1;
    this.blinkingDirection = 'forward';
    this.blinkingSubscription = interval(400).subscribe(() => {
      let nextIndex: number;
      if (numberOfAnswers === 1) {
        nextIndex = 0;
      } else if (this.blinkingDirection === 'forward') {
        nextIndex = this.currentlyBlinkingIndex + 1;
        if (nextIndex >= numberOfAnswers) {
          nextIndex = numberOfAnswers - 2;
          this.blinkingDirection = 'backward';
          if (nextIndex < 0) nextIndex = 0;
        }
      } else {
        nextIndex = this.currentlyBlinkingIndex - 1;
        if (nextIndex < 0) {
          nextIndex = numberOfAnswers > 1 ? 1 : 0;
          this.blinkingDirection = 'forward';
        }
      }
      this.blinkingAnswerIndex = nextIndex;
      this.currentlyBlinkingIndex = nextIndex;
    });
  }

  private stopBlinking(): void {
    this.blinkingSubscription?.unsubscribe();
    this.blinkingSubscription = null;
    this.blinkingAnswerIndex = -1;
    this.currentlyBlinkingIndex = -1;
    this.blinkingDirection = 'forward';
  }

  ngOnDestroy(): void {
    this.stopBlinking();
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
